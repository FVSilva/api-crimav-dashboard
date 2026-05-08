import dayjs from "dayjs";
import { safeGet } from "./kommoClient.js";
import { CRIMAV } from "../config/crimav.js";
import { normalizeCF } from "../utils/fields.js";
import { saveCache, loadCache } from "../utils/cache.js";

const CACHE_FILE = "leads.json";
const LIMIT = 250;

let isSyncing = false;

/**
 * Busca usuários do Kommo
 */
async function fetchUsersMap() {
  const data = await safeGet("/api/v4/users", {
    limit: 250,
  });

  const users = data?._embedded?.users || [];

  return new Map(
    users.map((user) => [user.id, user.name])
  );
}

/**
 * Busca motivos de perda
 */
async function fetchLossReasonsMap() {
  const data = await safeGet("/api/v4/leads/loss_reasons");

  const reasons = data?._embedded?.loss_reasons || [];

  return new Map(
    reasons.map((reason) => [reason.id, reason.name])
  );
}

/**
 * Busca todos os leads do pipeline
 */
async function fetchLeadsFromPipeline() {
  let page = 1;
  const all = [];

  while (true) {
    const data = await safeGet("/api/v4/leads", {
      limit: LIMIT,
      page,
      "filter[pipeline_id]": CRIMAV.pipelineId,
      with: "contacts",
    });

    const leads = data?._embedded?.leads || [];

    if (!leads.length) break;

    all.push(...leads);

    if (leads.length < LIMIT) break;

    page++;
  }

  return all;
}

/**
 * Trata e organiza lead
 */
function flattenLead(
  lead,
  usersMap,
  lossReasonsMap
) {
  const cf = normalizeCF(
    lead.custom_fields_values,
    "lead_"
  );

  return {
    id: lead.id,

    nome: lead.name || null,

    /**
     * Valor do lead
     */
    price: Number(lead.price || 0),
    valor: Number(lead.price || 0),

    pipeline_id: lead.pipeline_id || null,
    pipeline_name: "Funil de Vendas",

    status_id: lead.status_id || null,

    status:
      CRIMAV.statuses[lead.status_id] ||
      "Outro",

    /**
     * Responsável
     */
    responsible_user_id:
      lead.responsible_user_id || null,

    responsible_user_name:
      usersMap.get(
        lead.responsible_user_id
      ) || null,

    /**
     * Motivo perda
     */
    loss_reason_id:
      lead.loss_reason_id || null,

    loss_reason_name:
      lead.loss_reason_id
        ? lossReasonsMap.get(
            lead.loss_reason_id
          ) || null
        : null,

    /**
     * Datas
     */
    created_at: lead.created_at
      ? dayjs
          .unix(lead.created_at)
          .format("YYYY-MM-DD")
      : null,

    updated_at: lead.updated_at
      ? dayjs
          .unix(lead.updated_at)
          .format("YYYY-MM-DD")
      : null,

    closed_at: lead.closed_at
      ? dayjs
          .unix(lead.closed_at)
          .format("YYYY-MM-DD")
      : null,

    /**
     * Datas customizadas
     */
    data_simulacao:
      cf["lead_Data Simulação"] ||
      cf["lead_Data Simulacao"] ||
      cf["lead_data_simulacao"] ||
      null,

    data_implantacao:
      cf["lead_Data Implantação"] ||
      cf["lead_Data Implantacao"] ||
      cf["lead_data_implantacao"] ||
      null,

    /**
     * Custom fields
     */
    ...cf,
  };
}

/**
 * Sincroniza leads
 */
export async function syncLeads(
  force = false
) {
  if (isSyncing && !force) {
    return loadCache(CACHE_FILE) || [];
  }

  isSyncing = true;

  try {
    console.log(
      "🔄 Sincronizando leads..."
    );

    const usersMap =
      await fetchUsersMap();

    const lossReasonsMap =
      await fetchLossReasonsMap();

    const leads =
      await fetchLeadsFromPipeline();

    const rows = leads.map((lead) =>
      flattenLead(
        lead,
        usersMap,
        lossReasonsMap
      )
    );

    saveCache(CACHE_FILE, rows);

    console.log(
      `✅ ${rows.length} leads sincronizados`
    );

    return rows;
  } catch (err) {
    console.error(
      "❌ Erro ao sincronizar leads:",
      err.message
    );

    const cache =
      loadCache(CACHE_FILE);

    return cache || [];
  } finally {
    isSyncing = false;
  }
}

/**
 * Retorna cache
 */
export async function getLeads() {
  const cache =
    loadCache(CACHE_FILE);

  if (cache && cache.length) {
    return cache;
  }

  return syncLeads(true);
}