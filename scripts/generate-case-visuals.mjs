import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "src/data/caseStudies.ts");
const outputDir = path.join(projectRoot, "public/images/cases");
const tempDir = path.join(projectRoot, ".astro/case-art");

function loadCaseStudies() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  return module.exports.caseStudies;
}

function hash(input) {
  let value = 2166136261;
  for (const char of input) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]);
}

function wrap(value, max = 27, limit = 4) {
  const words = value.split(/\s+/);
  const lines = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > max) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines.slice(0, limit);
}

function nodeShape(type, x, y, size, fill, stroke) {
  if (type === 0) return `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  if (type === 1) return `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  return `<path d="M ${x} ${y - size / 2} L ${x + size / 2} ${y} L ${x} ${y + size / 2} L ${x - size / 2} ${y} Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
}

function createSvg(study) {
  const seed = hash(study.slug);
  const ys = [310 + (seed % 110), 500 - (seed % 80), 360 + (seed % 170), 570 - (seed % 120)];
  const xs = [540, 820, 1100, 1380];
  const titleLines = wrap(study.title);
  const title = titleLines.map((line, index) => `<text x="64" y="${310 + index * 68}" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="#111214">${escapeXml(line)}</text>`).join("");
  const pathData = xs.map((x, index) => `${index ? "L" : "M"} ${x} ${ys[index]}`).join(" ");
  const labels = ["SIGNAL", "CONTEXT", "CONTROL", "OWNER"];
  const nodes = xs.map((x, index) => {
    const fill = index === 2 ? "#b7f45b" : index === 3 ? "#ff4d00" : "#f2f1ec";
    const shape = nodeShape((seed + index) % 3, x, ys[index], 72 + ((seed >> index) % 30), fill, "#f2f1ec");
    return `${shape}<circle cx="${x}" cy="${ys[index]}" r="9" fill="#111214"/><text x="${x}" y="${ys[index] + 92}" font-family="monospace" font-size="18" font-weight="700" fill="#a5a39d" text-anchor="middle">${labels[index]}</text>`;
  }).join("");
  const systems = study.integrations.slice(0, 3).map((item, index) => `<g transform="translate(${520 + index * 290} 820)"><rect width="260" height="64" fill="#111214"/><text x="18" y="40" font-family="monospace" font-size="17" font-weight="700" fill="#f2f1ec">${escapeXml(item.toUpperCase())}</text></g>`).join("");
  const ticks = Array.from({ length: 10 }, (_, index) => `<line x1="${500 + index * 92}" y1="120" x2="${500 + index * 92}" y2="${135 + ((seed >> (index % 8)) & 31)}" stroke="#111214" stroke-width="3"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seed % 97}" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="mono"/><feComponentTransfer in="mono"><feFuncA type="table" tableValues="0 0.055"/></feComponentTransfer></filter>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M 80 0 L 0 0 0 80" fill="none" stroke="#111214" stroke-opacity="0.09" stroke-width="1"/></pattern>
  </defs>
  <rect width="1600" height="1000" fill="#f2f1ec"/>
  <rect width="1600" height="1000" fill="url(#grid)"/>
  <rect width="430" height="1000" fill="#111214"/>
  <rect x="28" y="28" width="374" height="944" fill="#f2f1ec"/>
  <rect width="1600" height="1000" filter="url(#paper)" opacity="0.52"/>
  <text x="64" y="88" font-family="monospace" font-size="22" font-weight="700" fill="#c53b00">IT WHITE / CASE ${study.caseNumber}</text>
  <text x="64" y="134" font-family="monospace" font-size="16" font-weight="700" fill="#66645f">${escapeXml(study.sector.toUpperCase())}</text>
  <line x1="64" y1="188" x2="366" y2="188" stroke="#111214" stroke-width="3"/>
  ${title}
  <text x="64" y="900" font-family="monospace" font-size="22" font-weight="700" fill="#c53b00">${escapeXml(study.area.toUpperCase())}</text>
  <text x="500" y="86" font-family="monospace" font-size="22" font-weight="700" fill="#c53b00">CONTROL ARCHITECTURE / ${study.caseNumber}</text>
  ${ticks}
  <path d="${pathData}" fill="none" stroke="#f2f1ec" stroke-width="16" stroke-linecap="square"/>
  <path d="${pathData}" fill="none" stroke="#ff4d00" stroke-width="5" stroke-linecap="square"/>
  ${nodes}
  <circle cx="${xs[2]}" cy="${ys[2]}" r="82" fill="none" stroke="#b7f45b" stroke-width="5" stroke-dasharray="12 9"/>
  ${systems}
  <line x1="500" y1="930" x2="1536" y2="930" stroke="#f2f1ec" stroke-opacity="0.35" stroke-width="2"/>
  <text x="500" y="968" font-family="monospace" font-size="16" font-weight="700" fill="#a5a39d">EVENT → CONTEXT → CONTROL → HUMAN DECISION</text>
  </svg>`;
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const studies = loadCaseStudies();
for (const study of studies) {
  const svgPath = path.join(tempDir, `${study.slug}.svg`);
  const outputPath = path.join(outputDir, `${study.slug}.webp`);
  fs.writeFileSync(svgPath, createSvg(study));
  const result = spawnSync("magick", [svgPath, "-strip", "-quality", "84", outputPath], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Image generation failed for ${study.slug}`);
}

console.log(`Generated ${studies.length} case visuals in ${outputDir}`);
