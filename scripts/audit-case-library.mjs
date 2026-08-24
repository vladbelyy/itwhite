import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function loadCaseStudies() {
  const source = fs.readFileSync(path.join(root, "src/data/caseStudies.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  return module.exports.caseStudies;
}

function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const studies = loadCaseStudies();
const errors = [];
const slugs = new Set();
const titles = new Set();
const wordCounts = [];

if (studies.length !== 50) errors.push(`Expected 50 studies, found ${studies.length}`);

for (const study of studies) {
  if (slugs.has(study.slug)) errors.push(`Duplicate slug: ${study.slug}`);
  if (titles.has(study.title)) errors.push(`Duplicate title: ${study.title}`);
  slugs.add(study.slug);
  titles.add(study.title);

  const requiredText = ["problem", "automation", "human", "risk", "buyer", "buyingTrigger", "sectorInsight", "businessOutcome"];
  for (const field of requiredText) {
    if (!study[field] || study[field].length < 24) errors.push(`${study.slug}: weak ${field}`);
  }
  if (study.kpis.length < 3) errors.push(`${study.slug}: fewer than 3 KPIs`);
  if (study.integrations.length < 2) errors.push(`${study.slug}: fewer than 2 integrations`);
  if (study.sourceIds.length < 2) errors.push(`${study.slug}: fewer than 2 sources`);
  if (study.decisionCriteria.length !== 4) errors.push(`${study.slug}: decision criteria incomplete`);
  if (study.firstQuestions.length !== 4) errors.push(`${study.slug}: first questions incomplete`);
  if (study.scenarioAnalysis.length !== 5 || study.scenarioAnalysis.some((item) => item.length < 220)) errors.push(`${study.slug}: scenario analysis incomplete`);

  const visual = path.join(root, "public", study.visualPath.replace(/^\//, ""));
  if (!fs.existsSync(visual)) errors.push(`${study.slug}: visual missing`);

  const htmlPath = path.join(root, "dist/client/cases", study.slug, "index.html");
  if (!fs.existsSync(htmlPath)) {
    errors.push(`${study.slug}: built HTML missing`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const words = plainText(html).split(/\s+/).filter(Boolean).length;
  wordCounts.push(words);
  if (words < 800) errors.push(`${study.slug}: only ${words} rendered words`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`${study.slug}: H1 count is not 1`);
  for (const needle of ["Article", study.visualPath, "Владислав Белый", "Денис Кораблёв", "Экономика начинается", "Decision FAQ", "Следующие процессы"])
    if (!html.includes(needle)) errors.push(`${study.slug}: missing ${needle}`);
}

const sorted = [...wordCounts].sort((a, b) => a - b);
const sitemapPath = path.join(root, "dist/client/sitemap.xml");
if (!fs.existsSync(sitemapPath)) errors.push("sitemap.xml missing");
else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const sitemapCases = (sitemap.match(/<loc>https:\/\/itwhite\.ru\/cases\//g) || []).length - 1;
  if (sitemapCases !== 50) errors.push(`sitemap contains ${sitemapCases} case URLs`);
}
const summary = {
  pages: studies.length,
  sectors: new Set(studies.map((study) => study.sector)).size,
  visuals: studies.filter((study) => fs.existsSync(path.join(root, "public", study.visualPath.replace(/^\//, "")))).length,
  words: {
    min: sorted[0] || 0,
    median: sorted[Math.floor(sorted.length / 2)] || 0,
    max: sorted.at(-1) || 0
  },
  errors: errors.length
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
