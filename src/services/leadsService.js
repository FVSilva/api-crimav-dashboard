import dayjs from "dayjs";
import { safeGet } from "./kommoClient.js";
import { normalizeCF } from "../utils/fields.js";
import { CRIMAV } from "../config/crimav.js";
import { saveCache } from "../utils/cache.js";

const LIMIT = 250;

export async function getLeads() {
  let page = 1;
  let all = [];

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

  const rows = all.map((lead) => {
    const cf = normalizeCF(lead.custom_fields_values, "lead_");

    return {
      id: lead.id,
      nome: lead.name,
      valor: lead.price || 0,

      status_id: lead.status_id,
      status: CRIMAV.statuses[lead.status_id] || "Outro",

      created_at: dayjs.unix(lead.created_at).format("YYYY-MM-DD"),
      closed_at: lead.closed_at
        ? dayjs.unix(lead.closed_at).format("YYYY-MM-DD")
        : null,

      // 🔥 CAMPOS IMPORTANTES
      data_simulacao: cf["lead_Data Simulação"],
      data_implantacao: cf["lead_Data Implantação"],
      data_ganho: cf["lead_Data Ganho"],

      ...cf,
    };
  });

  saveCache("leads.json", rows);

  return rows;
}