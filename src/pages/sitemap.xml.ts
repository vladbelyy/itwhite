import type { APIRoute } from "astro";
import { caseStudies } from "../data/caseStudies";
import { servicePages } from "../data/servicePages";
import { assertSitemapDate, redirectedServiceSlugs, servicePagesLastmod, staticSitemapPages } from "../lib/sitemap-governance";

export const prerender = true;

const origin = "https://itwhite.ru";

function urlEntry(loc: string, lastmod: string, priority: string) {
  return `<url><loc>${origin}${loc}</loc><lastmod>${assertSitemapDate(lastmod)}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
}

export const GET: APIRoute = () => {
  const urls = [
    ...staticSitemapPages.map((page) => urlEntry(page.loc, page.lastmod, page.priority)),
    ...servicePages.filter((page) => !redirectedServiceSlugs.has(page.slug)).map((page) => urlEntry(`/${page.slug}/`, servicePagesLastmod, "0.8")),
    ...caseStudies.map((study) => urlEntry(`/cases/${study.slug}/`, study.updatedAt, "0.7"))
  ];

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
};
