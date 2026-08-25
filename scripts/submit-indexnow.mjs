#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const DEFAULT_SITE = "https://itwhite.ru";
export const MAX_URLS = 10_000;
export const MAX_BATCH_SIZE = 10_000;

const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

export function parseArguments(argv) {
  const options = {
    submit: false,
    allowUnmapped: false,
    site: DEFAULT_SITE,
    urls: [],
    urlFiles: [],
    sitemaps: [],
    changedFrom: null,
    batchSize: 1_000,
    key: process.env.INDEXNOW_KEY || null,
    keyLocation: process.env.INDEXNOW_KEY_LOCATION || null,
    help: false
  };

  const valueFor = (flag, index) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--submit") options.submit = true;
    else if (argument === "--allow-unmapped") options.allowUnmapped = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--site") options.site = valueFor(argument, index++);
    else if (argument === "--url") options.urls.push(valueFor(argument, index++));
    else if (argument === "--urls-file") options.urlFiles.push(valueFor(argument, index++));
    else if (argument === "--sitemap") options.sitemaps.push(valueFor(argument, index++));
    else if (argument === "--changed-from") options.changedFrom = valueFor(argument, index++);
    else if (argument === "--batch-size") options.batchSize = Number(valueFor(argument, index++));
    else if (argument === "--key") options.key = valueFor(argument, index++);
    else if (argument === "--key-location") options.keyLocation = valueFor(argument, index++);
    else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > MAX_BATCH_SIZE) {
    throw new Error(`--batch-size must be an integer between 1 and ${MAX_BATCH_SIZE}`);
  }

  return options;
}

export function validateSite(value) {
  const site = new URL(value);
  if (site.protocol !== "https:") throw new Error("Site must use HTTPS");
  if (site.username || site.password || site.search || site.hash || site.pathname !== "/") {
    throw new Error("Site must be an HTTPS origin without credentials, path, query, or fragment");
  }
  return site;
}

export function validateKey(value) {
  if (!KEY_PATTERN.test(value || "")) {
    throw new Error("IndexNow key must contain 8-128 ASCII letters, digits, or hyphens");
  }
  return value;
}

export function normalizeCanonicalUrl(value, site) {
  const url = new URL(value, site);
  if (url.protocol !== "https:") throw new Error(`URL must use HTTPS: ${value}`);
  if (url.hostname !== site.hostname || url.port !== site.port) {
    throw new Error(`URL host must be ${site.host}: ${value}`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`Canonical URL cannot contain credentials, query, or fragment: ${value}`);
  }
  url.hostname = site.hostname;
  return url.href;
}

export function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'")
  );
}

export function readUrlFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8").trim();
  if (!source) return [];
  if (source.startsWith("[")) {
    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new Error(`${filePath} must contain a JSON array of URL strings`);
    }
    return parsed;
  }
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function routeFromPageFile(file) {
  if (!file.startsWith("src/pages/") || file.startsWith("src/pages/api/")) return null;
  let relative = file.slice("src/pages/".length);
  if (!/\.(astro|md|mdx)$/.test(relative) || relative.includes("[")) return null;
  relative = relative.replace(/\.(astro|md|mdx)$/, "").replace(/(^|\/)index$/, "");
  return `/${relative}${relative ? "/" : ""}`.replaceAll("//", "/");
}

function slugsFromSource(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const source = fs.readFileSync(filePath, "utf8");
  return [...source.matchAll(/\bslug:\s*["']([^"']+)["']/g)].map((match) => match[1]);
}

export function mapChangedFiles(files, { root, sitemapUrls = [] }) {
  const routes = new Set();
  const mappedFiles = [];
  const ignoredFiles = [];
  const unmappedFiles = [];
  const allSitemapPaths = sitemapUrls.map((value) => new URL(value).pathname);
  const declaredServicePaths = slugsFromSource(path.join(root, "src/data/servicePages.ts")).map((slug) => `/${slug}/`);
  const servicePaths = declaredServicePaths.filter((value) => allSitemapPaths.includes(value));

  const add = (file, values) => {
    values.forEach((value) => routes.add(value));
    mappedFiles.push(file);
  };

  for (const file of files) {
    const pageRoute = routeFromPageFile(file);
    if (pageRoute) {
      add(file, [pageRoute]);
      continue;
    }
    if (file === "src/pages/cases/[slug].astro" || file === "src/data/caseStudies.ts") {
      const casePaths = allSitemapPaths.filter((value) => value === "/cases/" || value.startsWith("/cases/"));
      if (!casePaths.length) unmappedFiles.push(file);
      else add(file, casePaths);
      continue;
    }
    if (["src/pages/[slug].astro", "src/data/servicePages.ts", "src/data/serviceDepth.ts", "src/data/directions.ts"].includes(file)) {
      if (!allSitemapPaths.length) unmappedFiles.push(file);
      else add(file, ["/", "/solutions/", ...servicePaths]);
      continue;
    }
    if (file === "src/data/corporate.ts") {
      add(file, ["/", "/about/", "/work/", "/solutions/", "/products/"]);
      continue;
    }
    if (
      file === "src/data/site.ts" ||
      file === "src/middleware.ts" ||
      file.startsWith("src/layouts/") ||
      file.startsWith("src/components/layout/")
    ) {
      if (!allSitemapPaths.length) unmappedFiles.push(file);
      else add(file, allSitemapPaths);
      continue;
    }
    if (
      file.startsWith("public/") ||
      file.startsWith("scripts/") ||
      file.startsWith("docs/") ||
      file.startsWith("src/styles/") ||
      file.startsWith("src/pages/api/") ||
      file === "package.json" ||
      file === "package-lock.json" ||
      file === "astro.config.mjs" ||
      file.startsWith(".github/") ||
      file.startsWith(".git")
    ) {
      ignoredFiles.push(file);
      continue;
    }
    if (file.startsWith("src/")) unmappedFiles.push(file);
    else ignoredFiles.push(file);
  }

  return { routes: [...routes], mappedFiles, ignoredFiles, unmappedFiles };
}

export function chunkUrls(urls, batchSize) {
  const chunks = [];
  for (let index = 0; index < urls.length; index += batchSize) chunks.push(urls.slice(index, index + batchSize));
  return chunks;
}

function changedFilesSince(ref, root) {
  const commands = [
    ["diff", "--name-only", "--diff-filter=ACMRT", `${ref}...HEAD`],
    ["diff", "--name-only", "--diff-filter=ACMRT"],
    ["diff", "--cached", "--name-only", "--diff-filter=ACMRT"],
    ["ls-files", "--others", "--exclude-standard"]
  ];
  const files = new Set();
  for (const args of commands) {
    const output = execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    output.split(/\r?\n/).filter(Boolean).forEach((file) => files.add(file));
  }
  return [...files].sort();
}

function discoverKey(root, explicitKey) {
  if (explicitKey) return validateKey(explicitKey);
  const publicDirectory = path.join(root, "public");
  const candidates = fs
    .readdirSync(publicDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => ({ name: entry.name.slice(0, -4), path: path.join(publicDirectory, entry.name) }))
    .filter((entry) => KEY_PATTERN.test(entry.name) && fs.readFileSync(entry.path, "utf8").trim() === entry.name);
  if (candidates.length !== 1) {
    throw new Error("Set INDEXNOW_KEY/--key or keep exactly one public/<key>.txt verification file");
  }
  return candidates[0].name;
}

function validateKeyLocation(value, site, key, root) {
  const location = new URL(value || `/${key}.txt`, site);
  if (location.protocol !== "https:" || location.hostname !== site.hostname || location.port !== site.port) {
    throw new Error("IndexNow key location must use the site's HTTPS origin");
  }
  if (location.search || location.hash || location.username || location.password) {
    throw new Error("IndexNow key location cannot contain credentials, query, or fragment");
  }
  const publicRoot = path.resolve(root, "public");
  const localPath = path.resolve(publicRoot, `.${decodeURIComponent(location.pathname)}`);
  if (!localPath.startsWith(`${publicRoot}${path.sep}`) || !fs.existsSync(localPath)) {
    throw new Error(`Verification file is missing from public/: ${location.pathname}`);
  }
  if (fs.readFileSync(localPath, "utf8").trim() !== key) {
    throw new Error(`Verification file content does not match the IndexNow key: ${location.pathname}`);
  }
  return location.href;
}

function findDefaultSitemap(root) {
  return [path.join(root, "dist/client/sitemap.xml"), path.join(root, "public/sitemap.xml")].find((candidate) => fs.existsSync(candidate)) || null;
}

function helpText() {
  return `Usage:
  node scripts/submit-indexnow.mjs --url /path/ [--url /other/] [--submit]
  node scripts/submit-indexnow.mjs --urls-file urls.txt [--submit]
  node scripts/submit-indexnow.mjs --sitemap dist/client/sitemap.xml [--submit]
  node scripts/submit-indexnow.mjs --changed-from <git-ref> [--submit]

Dry-run is the default. --submit is the only option that performs network requests.
Options: --site, --key, --key-location, --batch-size, --allow-unmapped, --help`;
}

export async function run(argv = process.argv.slice(2), root = process.cwd(), fetchImplementation = globalThis.fetch) {
  const options = parseArguments(argv);
  if (options.help) return { help: helpText() };
  if (!options.urls.length && !options.urlFiles.length && !options.sitemaps.length && !options.changedFrom) {
    throw new Error("No URL source supplied. Use --url, --urls-file, --sitemap, or --changed-from");
  }

  const site = validateSite(options.site);
  const key = discoverKey(root, options.key);
  const keyLocation = validateKeyLocation(options.keyLocation, site, key, root);
  const rawUrls = [...options.urls];
  const sources = { explicit: options.urls.length, files: [], sitemaps: [], changed: null };

  for (const value of options.urlFiles) {
    const filePath = path.resolve(root, value);
    const fileUrls = readUrlFile(filePath);
    rawUrls.push(...fileUrls);
    sources.files.push({ path: path.relative(root, filePath), urls: fileUrls.length });
  }
  for (const value of options.sitemaps) {
    const filePath = path.resolve(root, value);
    const sitemapUrls = parseSitemap(fs.readFileSync(filePath, "utf8"));
    rawUrls.push(...sitemapUrls);
    sources.sitemaps.push({ path: path.relative(root, filePath), urls: sitemapUrls.length });
  }

  if (options.changedFrom) {
    const sitemapPath = findDefaultSitemap(root);
    const sitemapUrls = sitemapPath ? parseSitemap(fs.readFileSync(sitemapPath, "utf8")) : [];
    const files = changedFilesSince(options.changedFrom, root);
    const mapped = mapChangedFiles(files, { root, sitemapUrls });
    rawUrls.push(...mapped.routes);
    sources.changed = {
      ref: options.changedFrom,
      files: files.length,
      mappedFiles: mapped.mappedFiles,
      ignoredFiles: mapped.ignoredFiles,
      unmappedFiles: mapped.unmappedFiles,
      sitemap: sitemapPath ? path.relative(root, sitemapPath) : null,
      urls: mapped.routes.length
    };
    if (mapped.unmappedFiles.length && !options.allowUnmapped) {
      throw new Error(`Changed source files could not be mapped safely; add explicit --url values and acknowledge with --allow-unmapped: ${mapped.unmappedFiles.join(", ")}`);
    }
  }

  const urls = [...new Set(rawUrls.map((value) => normalizeCanonicalUrl(value, site)))].sort();
  if (!urls.length) throw new Error("URL sources did not produce any canonical URLs");
  if (urls.length > MAX_URLS) throw new Error(`IndexNow accepts at most ${MAX_URLS} URLs per run`);

  const batches = chunkUrls(urls, options.batchSize);
  const output = {
    mode: options.submit ? "submit" : "dry-run",
    endpoint: INDEXNOW_ENDPOINT,
    site: site.origin,
    keyLocation,
    sources,
    urls,
    batchSize: options.batchSize,
    batches: batches.map((batch, index) => ({ number: index + 1, urls: batch.length, status: options.submit ? "pending" : "not-sent" }))
  };

  if (!options.submit) return output;
  if (typeof fetchImplementation !== "function") throw new Error("This Node.js runtime does not provide fetch");

  for (let index = 0; index < batches.length; index += 1) {
    const response = await fetchImplementation(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: site.hostname, key, keyLocation, urlList: batches[index] })
    });
    const body = await response.text();
    output.batches[index] = { number: index + 1, urls: batches[index].length, status: response.status, accepted: response.ok, body: body || null };
    if (!response.ok) throw Object.assign(new Error(`IndexNow rejected batch ${index + 1} with HTTP ${response.status}`), { output });
  }

  return output;
}

async function main() {
  try {
    const output = await run();
    if (output.help) process.stdout.write(`${output.help}\n`);
    else process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    const output = error.output || { status: "error", mode: process.argv.includes("--submit") ? "submit" : "dry-run", error: error.message };
    if (error.output) output.error = error.message;
    process.stderr.write(`${JSON.stringify(output, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
