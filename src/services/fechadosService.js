import { getLeads, syncLeads } from "./leadsService.js";
import { saveCache, loadCache } from "../utils/cache.js";

const CACHE_FILE = "fechados.json";

export async function syncFechados(force = false) {
  const leads = await syncLeads(force);

  const fechados = leads.filter((lead) =>
    ["Venda Ganha", "Venda Perdida"].includes(lead.status)
  );

  saveCache(CACHE_FILE, fechados);

  return fechados;
}

export async function getFechados() {
  const cache = loadCache(CACHE_FILE);

  if (cache && cache.length) {
    return cache;
  }

  const leads = await getLeads();

  const fechados = leads.filter((lead) =>
    ["Venda Ganha", "Venda Perdida"].includes(lead.status)
  );

  saveCache(CACHE_FILE, fechados);

  return fechados;
}