import { defineMiddleware } from "astro:middleware";

const DOCUMENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://mc.yandex.ru",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: https://mc.yandex.ru https://hdrc.yandex.net",
  "connect-src 'self' https://mc.yandex.ru https://hdrc.yandex.net",
  "frame-src https://mc.yandex.ru"
].join("; ");

const PERMANENT_ROUTE_REDIRECTS = new Map([
  ["/ai-in-operations", "/ai-automation/"],
  ["/internal-business-system", "/internal-tools/"],
  ["/diagnose", "/formats/"]
]);

function shouldAddTrailingSlash(pathname: string, method: string) {
  if (method !== "GET" && method !== "HEAD") return false;
  if (pathname === "/" || pathname.endsWith("/")) return false;
  if (pathname.startsWith("/_astro/") || pathname.startsWith("/api/") || pathname.startsWith("/.well-known/")) return false;

  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return !lastSegment.includes(".");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const redirectTarget = PERMANENT_ROUTE_REDIRECTS.get(context.url.pathname.replace(/\/$/, ""));
  if (redirectTarget && (context.request.method === "GET" || context.request.method === "HEAD")) {
    return context.redirect(`${redirectTarget}${context.url.search}`, 308);
  }

  if (shouldAddTrailingSlash(context.url.pathname, context.request.method)) {
    return context.redirect(`${context.url.pathname}/${context.url.search}`, 308);
  }

  const response = await next();
  const headers = new Headers(response.headers);
  const contentType = headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    headers.set("Content-Security-Policy-Report-Only", DOCUMENT_SECURITY_POLICY);
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }

  if (context.url.pathname.startsWith("/_astro/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (context.url.pathname.startsWith("/images/")) {
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
});
