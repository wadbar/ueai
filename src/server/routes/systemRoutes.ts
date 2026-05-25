import express, { Router } from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";

const router = Router();

// [SYSTEM_HEALTH]
router.get("/status", (req, res) => {
  res.json({
    status: "operational",
    uptime: process.uptime(),
    timestamp: Date.now(),
    v9_layer: "Active",
    papercreeper_matriz: "V12.1"
  });
});

// [ENVIRONMENT_CHECK]
router.get("/env", (req, res) => {
  res.json({
    gemini_key_configured: !!process.env.GEMINI_API_KEY,
    node_version: process.version,
    platform: process.platform,
    arch: process.arch
  });
});

// [FILE_SYSTEM_EXPLORER]
router.get("/files", async (req, res) => {
  try {
    const rootDir = process.cwd();
    const items = await fs.readdir(rootDir, { withFileTypes: true });
    const filtered = items.filter(i => 
      !i.name.includes("node_modules") && 
      !i.name.includes(".git") && 
      !i.name.includes(".next") && 
      !i.name.includes("dist")
    );
    
    const files = filtered.map(i => ({
      name: i.name,
      isDirectory: i.isDirectory(),
    }));
    
    try {
      const srcItems = await fs.readdir(path.join(rootDir, 'src'), { withFileTypes: true });
      files.push(...srcItems.map(i => ({ name: 'src/' + i.name, isDirectory: i.isDirectory() })));
    } catch (e) {}

    res.json(files);
  } catch (e: any) {
    res.status(500).json({ error: "FILE_READ_ERROR", message: e.message });
  }
});

// [OS_RESOURCES]
router.get("/resources", (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPerc = totalMem ? ((totalMem - freeMem) / totalMem) * 100 : 0;
    
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach(core => {
      for (const type in core.times) {
        totalTick += core.times[type as keyof typeof core.times];
      }
      totalIdle += core.times.idle;
    });
    const idle = totalTick > 0 ? (totalIdle / totalTick) * 100 : 0;

    res.json({ 
      cpu: 100 - idle, 
      memory: memPerc,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: "OS_RESOURCE_ERROR", message: error.message });
  }
});

export default router;
