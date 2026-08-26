#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = path.join(root, "scripts/brochure/index.html");
const out = path.join(root, "public/mivisita-brochure-comercial.pdf");

if (!existsSync(html)) {
  console.error("No se encontró scripts/brochure/index.html");
  process.exit(1);
}

const chromeCandidates = [process.env.CHROME_PATH, "google-chrome", "chromium", "chromium-browser"].filter(
  Boolean,
);

const chrome = chromeCandidates.find((bin) => {
  const check = spawnSync("which", [bin], { encoding: "utf8" });
  return check.status === 0;
});

if (!chrome) {
  console.error("No se encontró Chrome/Chromium para generar el PDF.");
  process.exit(1);
}

const chromeArgs = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--hide-scrollbars",
  "--no-pdf-header-footer",
  `--print-to-pdf=${out}`,
  `file://${html}`,
];

const result = spawnSync("timeout", ["--signal=KILL", "25", chrome, ...chromeArgs], {
  stdio: "inherit",
});

if (!existsSync(out) || statSync(out).size < 10_000) {
  console.error("Falló la generación del PDF.");
  process.exit(result.status && result.status !== 124 ? result.status : 1);
}

console.log(`Brochure generado: ${out}`);
