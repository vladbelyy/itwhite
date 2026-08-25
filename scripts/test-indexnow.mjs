import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  chunkUrls,
  mapChangedFiles,
  normalizeCanonicalUrl,
  parseArguments,
  parseSitemap,
  routeFromPageFile,
  run,
  validateKey,
  validateSite
} from "./submit-indexnow.mjs";

const site = validateSite("https://itwhite.ru");
assert.equal(normalizeCanonicalUrl("/cases/example/", site), "https://itwhite.ru/cases/example/");
assert.throws(() => normalizeCanonicalUrl("https://other.example/page/", site), /host must be/);
assert.throws(() => normalizeCanonicalUrl("/page/?draft=1", site), /query/);
assert.equal(validateKey("abcd-1234"), "abcd-1234");
assert.throws(() => validateKey("short"), /8-128/);
assert.deepEqual(parseSitemap("<urlset><url><loc>https://itwhite.ru/a/</loc></url><url><loc>https://itwhite.ru/b/</loc></url></urlset>"), [
  "https://itwhite.ru/a/",
  "https://itwhite.ru/b/"
]);
assert.equal(routeFromPageFile("src/pages/index.astro"), "/");
assert.equal(routeFromPageFile("src/pages/work/index.astro"), "/work/");
assert.equal(routeFromPageFile("src/pages/contact.astro"), "/contact/");
assert.equal(routeFromPageFile("src/pages/cases/[slug].astro"), null);
assert.deepEqual(chunkUrls(["a", "b", "c"], 2), [["a", "b"], ["c"]]);
assert.equal(parseArguments(["--url", "/", "--submit", "--batch-size", "2"]).submit, true);
assert.equal(parseArguments(["--url", "/", "--allow-unmapped"]).allowUnmapped, true);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "itwhite-indexnow-"));
fs.mkdirSync(path.join(temporaryRoot, "public"), { recursive: true });
fs.mkdirSync(path.join(temporaryRoot, "src/data"), { recursive: true });
fs.writeFileSync(path.join(temporaryRoot, "public/test-key1.txt"), "test-key1\n");
fs.writeFileSync(path.join(temporaryRoot, "src/data/servicePages.ts"), 'export const servicePages = [{ slug: "automation" }];\n');

const mapped = mapChangedFiles(["src/pages/index.astro", "src/data/servicePages.ts"], {
  root: temporaryRoot,
  sitemapUrls: ["https://itwhite.ru/", "https://itwhite.ru/about/", "https://itwhite.ru/automation/"]
});
assert.deepEqual(new Set(mapped.routes), new Set(["/", "/solutions/", "/automation/"]));

let fetchCalls = 0;
const dryRun = await run(["--url", "/", "--url", "/about/", "--batch-size", "1"], temporaryRoot, async () => {
  fetchCalls += 1;
  return new Response(null, { status: 200 });
});
assert.equal(dryRun.mode, "dry-run");
assert.equal(dryRun.batches.length, 2);
assert.equal(fetchCalls, 0, "dry-run must never call fetch");

const submitted = await run(["--url", "/", "--submit"], temporaryRoot, async (_endpoint, request) => {
  fetchCalls += 1;
  const body = JSON.parse(request.body);
  assert.equal(body.host, "itwhite.ru");
  assert.equal(body.key, "test-key1");
  return new Response(null, { status: 200 });
});
assert.equal(submitted.batches[0].accepted, true);
assert.equal(fetchCalls, 1);

fs.rmSync(temporaryRoot, { recursive: true, force: true });
console.log(JSON.stringify({ assertions: 23, status: "passed" }, null, 2));
