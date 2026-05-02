import { Router } from "express";
import { getLeads } from "../services/leadsService.js";
import { getFechados } from "../services/fechadosService.js";

const router = Router();

router.get("/leads", async (req, res) => {
  const data = await getLeads();
  res.json(data);
});

router.get("/fechados", async (req, res) => {
  const data = await getFechados();
  res.json(data);
});

export default router;