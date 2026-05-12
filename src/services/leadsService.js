import dayjs from "dayjs";
import { safeGet } from "./kommoClient.js";
import { CRIMAV } from "../config/crimav.js";
import { normalizeCF } from "../utils/fields.js";
import { saveCache, loadCache } from "../utils/cache.js";

const CACHE_FILE = "leads.json";
const LIMIT = 250;

let isSyncing = false;

async function fetchUsersMap() {
  const data = await safeGet("/api/v4/users", {
    limit: 250,
  });

  const users = data?._embedded?.users || [];

  return new Map(users.map((user) => [user.id, user.name]));
}

async function fetchLossReasonsMap() {
  const data = await safeGet("/api/v4/leads/loss_reasons");

  const reasons = data?._embedded?.loss_reasons || [];

  return new Map(reasons.map((reason) => [reason.id, reason.name]));
}

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

function toNumberBR(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  return Number(
    String(value)
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

function flattenLead(lead, usersMap, lossReasonsMap) {
  const cf = normalizeCF(lead.custom_fields_values, "lead_");

  const valorVendaCustom =
    cf["lead_Valor de Venda(R$)"] ||
    cf["lead_Valor de Venda"] ||
    cf["lead_Valor Venda"] ||
    null;

  return {
    id: lead.id,
    nome: lead.name || null,

    // Valor nativo do Kommo
    price: Number(lead.price || 0),
    valor: Number(lead.price || 0),

    // Valor do campo customizado do print
    valor_venda_custom: valorVendaCustom,
    valor_venda_custom_num: toNumberBR(valorVendaCustom),

    pipeline_id: lead.pipeline_id || null,
    pipeline_name: "Funil de Vendas",

    status_id: lead.status_id || null,
    status: CRIMAV.statuses[lead.status_id] || "Outro",

    responsible_user_id: lead.responsible_user_id || null,
    responsible_user_name: usersMap.get(lead.responsible_user_id) || null,

    loss_reason_id: lead.loss_reason_id || null,
    loss_reason_name: lead.loss_reason_id
      ? lossReasonsMap.get(lead.loss_reason_id) || null
      : null,

    created_at: lead.created_at
      ? dayjs.unix(lead.created_at).format("YYYY-MM-DD")
      : null,

    updated_at: lead.updated_at
      ? dayjs.unix(lead.updated_at).format("YYYY-MM-DD")
      : null,

    closed_at: lead.closed_at
      ? dayjs.unix(lead.closed_at).format("YYYY-MM-DD")
      : null,

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

    // Campos novos para comissão/produto
    operadora:
      cf["lead_Operadora"] ||
      null,

    operadora_produto:
      cf["lead_Operadora/Produto"] ||
      cf["lead_Operadora Produto"] ||
      cf["lead_Produto"] ||
      cf["lead_Plano Atual"] ||
      null,

    tipo_produto:
      cf["lead_Tipo Produto"] ||
      null,

    fase_implantacao:
      cf["lead_Fase na Implantação"] ||
      cf["lead_Fase na Implantacao"] ||
      null,

    fase_financeiro:
      cf["lead_Fase Financeiro"] ||
      null,

    // Mantém todos os campos originais também
    ...cf,
  };
}

export async function syncLeads(force = false) {
  if (isSyncing && !force) {
    return loadCache(CACHE_FILE) || [];
  }

  isSyncing = true;

  try {
    console.log("Sincronizando leads...");

    const usersMap = await fetchUsersMap();
    const lossReasonsMap = await fetchLossReasonsMap();
    const leads = await fetchLeadsFromPipeline();

    const rows = leads.map((lead) =>
      flattenLead(lead, usersMap, lossReasonsMap)
    );

    saveCache(CACHE_FILE, rows);

    console.log(`${rows.length} leads sincronizados`);

    return rows;
  } catch (err) {
    console.error("Erro ao sincronizar leads:", err.message);

    const cache = loadCache(CACHE_FILE);
    return cache || [];
  } finally {
    isSyncing = false;
  }
}

export async function getLeads() {
  const cache = loadCache(CACHE_FILE);

  if (cache && cache.length) {
    return cache;
  }

  return syncLeads(true);
}