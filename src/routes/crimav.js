import { Router } from "express";
import { getLeads, syncLeads } from "../services/leadsService.js";
import { getFechados, syncFechados } from "../services/fechadosService.js";

const router = Router();

router.get("/leads", async (req, res) => {
  const data = await getLeads();
  res.json(data);
});

router.get("/fechados", async (req, res) => {
  const data = await getFechados();
  res.json(data);
});

router.get("/sync", async (req, res) => {
  try {
    const leads = await syncLeads(true);
    const fechados = await syncFechados(true);

    res.json({
      ok: true,
      message: "Sync executado com sucesso",
      leads: leads.length,
      fechados: fechados.length,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

export default router;