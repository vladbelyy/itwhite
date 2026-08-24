export type SitemapPage = {
  loc: string;
  lastmod: string;
  priority: string;
};

// Update the relevant date in the same change that modifies public page content.
// Dates describe content changes, not deployments, so technical-only releases do
// not make every URL appear freshly updated to search engines.
export const staticSitemapPages: SitemapPage[] = [
  { loc: "/", lastmod: "2026-08-14", priority: "1.0" },
  { loc: "/solutions/", lastmod: "2026-08-24", priority: "0.9" },
  { loc: "/products/", lastmod: "2026-08-24", priority: "0.9" },
  { loc: "/work/", lastmod: "2026-08-24", priority: "0.9" },
  { loc: "/about/", lastmod: "2026-08-24", priority: "0.8" },
  { loc: "/insights/", lastmod: "2026-08-24", priority: "0.8" },
  { loc: "/contact/", lastmod: "2026-08-24", priority: "0.9" },
  { loc: "/tools/process-gap-check/", lastmod: "2026-08-24", priority: "0.8" },
  { loc: "/cases/", lastmod: "2026-08-08", priority: "0.8" },
  { loc: "/privacy/", lastmod: "2026-08-14", priority: "0.3" },
  { loc: "/personal-data-consent/", lastmod: "2026-08-14", priority: "0.3" },
  { loc: "/cookies/", lastmod: "2026-08-14", priority: "0.3" }
];

// Service pages are maintained as one content collection in servicePages.ts.
export const servicePagesLastmod = "2026-08-14";

// These routes remain buildable for backward compatibility but permanently
// redirect to the canonical commercial pages and must not enter the sitemap.
export const redirectedServiceSlugs = new Set([
  "ai-in-operations",
  "internal-business-system",
  "diagnose"
]);

export function assertSitemapDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Invalid sitemap lastmod: ${value}`);
  }
  return value;
}
