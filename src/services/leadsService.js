import dayjs from "dayjs";
import { safeGet } from "./kommoClient.js";
import { CRIMAV } from "../config/crimav.js";
import { normalizeCF } from "../utils/fields.js";
import { saveCache, loadCache } from "../utils/cache.js";

const CACHE_FILE = "leads.json";
const LIMIT = 250;

let isSyncing = false;

async function fetchUsersMap() {
  const data = await safeGet("/api/v4/users", { limit: 250 });
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

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findCF(cf, possibleNames = []) {
  const entries = Object.entries(cf || {});

  for (const name of possibleNames) {
    const target = normalizeKey(name);

    const found = entries.find(([key]) => {
      const normalizedKey = normalizeKey(key);
      return normalizedKey.includes(target) || target.includes(normalizedKey);
    });

    if (found) return found[1];
  }

  return null;
}

function toNumberBR(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  return (
    Number(
      String(value)
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    ) || 0
  );
}

function flattenLead(lead, usersMap, lossReasonsMap) {
  const cf = normalizeCF(lead.custom_fields_values, "lead_");

  const operadora = findCF(cf, [
    "Operadora",
  ]);

  const operadoraProduto = findCF(cf, [
    "Operadora Produto",
    "Operadora/Produto",
    "Operadora / Produto",
    "Produto",
    "Produto Contratado",
    "Plano Atual",
  ]);

  const tipoProduto = findCF(cf, [
    "Tipo Produto",
    "Tipo de Produto",
    "Tipo",
  ]);

  const valorVendaCustom = findCF(cf, [
    "Valor de Venda",
    "Valor de Venda R$",
    "Valor de Venda(R$)",
    "Valor Venda",
  ]);

  const faseImplantacao = findCF(cf, [
    "Fase na Implantação",
    "Fase Implantação",
    "Fase na Implantacao",
    "Fasa na Implantação",
    "Fasa na Implantacao",
  ]);

  const faseFinanceiro = findCF(cf, [
    "Fase Financeiro",
    "Financeiro",
  ]);

  const tipoParceiria = findCF(cf, [
    "Tipo parceiria",
    "Tipo Parceiria",
    "Tipo parceria",
    "Tipo Parceria",
    "Tipo de parceria",
    "Tipo de Parceria",
  ]);

  const parceiroId = findCF(cf, [
    "field_1376296",
    "Parceiro(ID)(0 p/nenhum)",
    "Parceiro ID",
    "Parceiro",
  ]);

  return {
    id: lead.id,
    nome: lead.name || null,

    price: Number(lead.price || 0),
    valor: Number(lead.price || 0),

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
      findCF(cf, ["Data Simulação", "Data Simulacao", "data_simulacao"]) ||
      null,

    data_implantacao:
      findCF(cf, ["Data Implantação", "Data Implantacao", "data_implantacao"]) ||
      null,

    operadora,
    operadora_produto: operadoraProduto,
    tipo_produto: tipoProduto,
    valor_venda_custom: valorVendaCustom,
    valor_venda_custom_num: toNumberBR(valorVendaCustom),
    fase_implantacao: faseImplantacao,
    fase_financeiro: faseFinanceiro,

    // nome mantido exatamente como você pediu
    "Tipo parceiria": tipoParceiria,

    // campo limpo para usar no BI
    tipo_parceiria: tipoParceiria,

    // parceiro por ID do campo 1376296
    parceiro_id: parceiroId,

    debug_custom_field_keys: Object.keys(cf),

    ...cf,
  };
}

export async function syncLeads(force = false) {
  if (isSyncing && !force) {
    return loadCache(CACHE_FILE) || [];
  }

  isSyncing = true;

  try {
    const usersMap = await fetchUsersMap();
    const lossReasonsMap = await fetchLossReasonsMap();
    const leads = await fetchLeadsFromPipeline();

    const rows = leads.map((lead) =>
      flattenLead(lead, usersMap, lossReasonsMap)
    );

    saveCache(CACHE_FILE, rows);

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
  return syncLeads(true);
}