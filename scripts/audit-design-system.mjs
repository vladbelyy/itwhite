import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const pairs = [
  ["signal on paper", "#a93200", "#f2f1ec", 4.5],
  ["white on signal", "#ffffff", "#a93200", 4.5],
  ["muted on paper", "#66645f", "#f2f1ec", 4.5],
  ["signal on dark", "#ff7a3f", "#181a1d", 4.5],
  ["ok on dark", "#b7f45b", "#111214", 4.5]
];

for (const [label, foreground, background, threshold] of pairs) {
  const ratio = contrast(foreground, background);
  console.log(`${label}: ${ratio.toFixed(2)}:1`);
  if (ratio < threshold) failures.push(`${label} must be at least ${threshold}:1`);
}

const routes = ["process-automation", "crm-automation", "bitrix24-automation", "internal-tools", "ai-automation"];
for (const route of routes) {
  const file = path.join(root, "dist", "client", route, "index.html");
  if (!fs.existsSync(file)) {
    failures.push(`missing built page: ${route}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("control-loop")) failures.push(`${route}: control loop is missing`);
  if (/StatusBar\.[^"']+\.js|SystemLayer\.[^"']+\.js|client\.[^"']+\.js/.test(html)) {
    failures.push(`${route}: unnecessary React runtime is still loaded`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Design audit passed: ${pairs.length} contrast pairs, ${routes.length} core pages.`);
