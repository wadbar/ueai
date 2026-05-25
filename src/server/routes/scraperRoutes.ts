import { Router } from "express";
import { scraperWorker } from "../WebScraperWorker";

const router = Router();

// [WEB_SCRAPER_INTEGRATION]: Endpoint robusto de mineração assíncrona
router.post("/execute", async (req, res) => {
  const { targets } = req.body;
  
  if (!Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ error: "INVALID_TARGETS", message: "É necessário fornecer um array de alvos." });
  }

  try {
    const results = await scraperWorker.execute(targets);
    res.json({
      status: "success",
      timestamp: Date.now(),
      data: results
    });
  } catch (error: any) {
    res.status(500).json({ error: "SCRAPE_FAULT", message: "O motor de raspagem falhou durante a execução." });
  }
});

router.get("/status", (req, res) => {
  res.json({
    status: "online",
    activeWorkers: scraperWorker.getActiveWorkers(),
    timestamp: Date.now()
  });
});

export default router;
