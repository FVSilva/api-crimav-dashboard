import { getLeads } from "./leadsService.js";
import { CRIMAV } from "../config/crimav.js";

export async function getFechados() {
  const leads = await getLeads();

  return leads.filter((l) =>
    [CRIMAV.stages.ganho, 143].includes(Number(l.status_id))
  );
}