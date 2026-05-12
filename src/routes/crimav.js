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

router.get("/debug-fields", async (req, res) => {
  const leads = await syncLeads(true);

  const sample = leads.find((lead) =>
    lead.debug_custom_field_keys?.some((key) =>
      key.toLowerCase().includes("operadora") ||
      key.toLowerCase().includes("produto") ||
      key.toLowerCase().includes("venda")
    )
  );

  res.json({
    ok: true,
    sample_id: sample?.id || null,
    operadora: sample?.operadora || null,
    operadora_produto: sample?.operadora_produto || null,
    tipo_produto: sample?.tipo_produto || null,
    valor_venda_custom: sample?.valor_venda_custom || null,
    debug_custom_field_keys: sample?.debug_custom_field_keys || [],
  });
});

export default router;