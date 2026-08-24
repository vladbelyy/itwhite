import type { APIRoute } from "astro";

const attempts = new Map<string, { count: number; resetAt: number }>();
const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const maxAttachmentSize = 5 * 1024 * 1024;
const allowedAttachmentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);
const allowedOrigins = new Set(["https://itwhite.ru", "https://www.itwhite.ru"]);
type Lead = { name: string; company: string; contact: string; site: string; systems: string; task: string; topics: string[]; diagnosis: string; sessionId: string; requestCode: string; pageUrl: string; landingPath: string; referrer: string; utm: string; createdAt: string; attachmentName: string; consentVersion: string; privacyVersion: string; consentAt: string; ip: string; userAgent: string };

function response(body: Record<string, unknown>, status = 200) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }); }
function tooManyRequests(ip: string) {
  const now = Date.now(); const bucket = attempts.get(ip);
  if (!bucket || bucket.resetAt < now) { attempts.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  bucket.count += 1; return bucket.count > 5;
}
function clean(value: FormDataEntryValue | null) { return typeof value === "string" ? value.trim().slice(0, 4000) : ""; }
function env(name: string) {
  const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return runtimeEnv?.[name] || import.meta.env[name];
}
async function checkedFetch(url: string, init: RequestInit) {
  const result = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
  const payload = await result.json().catch(() => ({})) as { ok?: boolean; error?: string };
  if (!result.ok || payload.ok === false || payload.error) throw new Error("Delivery provider rejected the request");
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && !allowedOrigins.has(origin)) || fetchSite === "cross-site") {
    return response({ error: "Источник запроса не разрешён." }, 403);
  }
  const ip = clientAddress || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyRequests(ip)) return response({ error: "Слишком много попыток. Подождите минуту и попробуйте снова." }, 429);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) return response({ error: "Неподдерживаемый формат запроса." }, 415);
  let form: FormData;
  try { form = await request.formData(); } catch { return response({ error: "Не удалось прочитать данные формы." }, 400); }
  if (clean(form.get("website"))) return response({ ok: true });
  if (clean(form.get("consent")) !== "on") return response({ error: "Нужно согласие на обработку персональных данных." }, 400);

  const fileEntry = form.get("attachment");
  const attachment = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  if (attachment && (attachment.size > maxAttachmentSize || !allowedAttachmentTypes.has(attachment.type))) return response({ error: "Файл должен быть PDF, TXT, PNG, JPG или WebP размером до 5 МБ." }, 400);
  const receivedAt = new Date().toISOString();
  const lead: Lead = {
    name: clean(form.get("name")), company: clean(form.get("company")), contact: clean(form.get("contact")), site: clean(form.get("site")),
    systems: clean(form.get("systems")), task: clean(form.get("task")), topics: form.getAll("topics").map(clean).filter(Boolean),
    diagnosis: clean(form.get("diagnosis")), sessionId: clean(form.get("sessionId")), requestCode: clean(form.get("requestCode")),
    pageUrl: clean(form.get("pageUrl")), landingPath: clean(form.get("landingPath")), referrer: clean(form.get("referrer")), utm: clean(form.get("utm")),
    createdAt: receivedAt, attachmentName: attachment?.name ?? "",
    consentVersion: clean(form.get("consentVersion")), privacyVersion: clean(form.get("privacyVersion")), consentAt: receivedAt,
    ip: ip.slice(0, 128), userAgent: (request.headers.get("user-agent") || "unknown").slice(0, 512)
  };
  if (!lead.name || !lead.contact || !lead.task) return response({ error: "Заполните имя, контакт и описание задачи." }, 400);
  if (lead.consentVersion !== "PD-CONSENT-2026-08-14-R4" || lead.privacyVersion !== "PRIVACY-2026-08-14-R5") return response({ error: "Не удалось подтвердить актуальную версию документов. Обновите страницу и попробуйте снова." }, 400);

  const hasBitrix = Boolean(env("BITRIX24_WEBHOOK_URL"));
  const hasTelegram = Boolean(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID"));
  if (!hasBitrix && !hasTelegram) return response({ error: "Канал отправки временно недоступен. Напишите на info@itwhite.ru." }, 503);
  const deliveredChannels: string[] = []; const failures: string[] = [];
  if (hasBitrix) { try { await sendBitrixLead(lead); deliveredChannels.push("CRM"); } catch { failures.push("CRM"); } }
  let attachmentDelivered = !attachment;
  if (hasTelegram) {
    try { await sendTelegramNotice(lead); deliveredChannels.push("Telegram"); }
    catch { failures.push("Telegram"); }
    if (attachment && deliveredChannels.includes("Telegram")) {
      try { await sendTelegramAttachment(lead, attachment); attachmentDelivered = true; }
      catch { attachmentDelivered = false; }
    }
  }
  if (!deliveredChannels.length) return response({ error: "Не удалось передать заявку. Попробуйте позже или напишите на info@itwhite.ru." }, 502);
  const warnings: string[] = [];
  if (failures.length) warnings.push(`Резервный канал ${failures.join(" и ")} не ответил, но заявка принята.`);
  if (!attachmentDelivered) warnings.push("Заявка принята, но файл не был доставлен. Пришлите его отдельно в Telegram.");
  return response({ ok: true, deliveredChannels, degraded: warnings.length > 0, attachmentDelivered, warning: warnings.join(" ") });
};

async function sendBitrixLead(lead: Lead) {
  const webhook = env("BITRIX24_WEBHOOK_URL"); if (!webhook) throw new Error("Bitrix is not configured");
  const fields = { TITLE: `IT WHITE ${lead.requestCode || "REQUEST"}: ${lead.name}`, NAME: lead.name, COMPANY_TITLE: lead.company,
    COMMENTS: [`Код: ${lead.requestCode}`, `Контакт: ${lead.contact}`, `Сайт: ${lead.site}`, `Системы: ${lead.systems}`, `Темы: ${lead.topics.join(", ")}`, `Задача: ${lead.task}`, `Диагностика: ${lead.diagnosis}`, `UTM: ${lead.utm}`, `Referrer: ${lead.referrer}`, `Page: ${lead.pageUrl}`, `Session: ${lead.sessionId}`, `Attachment: ${lead.attachmentName}`, `Согласие: ${lead.consentVersion} / ${lead.consentAt}`, `Политика: ${lead.privacyVersion}`, `IP: ${lead.ip}`, `User-Agent: ${lead.userAgent}`].join("\n") };
  await checkedFetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: "Y" } }) });
}
function telegramText(lead: Lead) { return [`Новая заявка IT WHITE / ${lead.requestCode || "без кода"}`, `Время: ${lead.createdAt}`, `Имя: ${lead.name}`, `Компания: ${lead.company || "-"}`, `Контакт: ${lead.contact}`, `Сайт: ${lead.site || "-"}`, `Системы: ${lead.systems || "-"}`, `Темы: ${lead.topics.join(", ") || "-"}`, `Задача: ${lead.task}`, `Диагностика: ${lead.diagnosis || "-"}`, `Страница: ${lead.pageUrl || "-"}`, `UTM: ${lead.utm || "-"}`, `Согласие: ${lead.consentVersion} / ${lead.consentAt}`, `Политика: ${lead.privacyVersion}`, `IP: ${lead.ip}`, `User-Agent: ${lead.userAgent}`].join("\n").slice(0, 4096); }
async function sendTelegramNotice(lead: Lead) {
  const token = env("TELEGRAM_BOT_TOKEN"); const chatId = env("TELEGRAM_CHAT_ID"); if (!token || !chatId) throw new Error("Telegram is not configured");
  await checkedFetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: telegramText(lead) }) });
}
async function sendTelegramAttachment(lead: Lead, attachment: File) {
  const token = env("TELEGRAM_BOT_TOKEN"); const chatId = env("TELEGRAM_CHAT_ID"); if (!token || !chatId) throw new Error("Telegram is not configured");
  const body = new FormData(); body.set("chat_id", chatId); body.set("caption", `Файл к заявке ${lead.requestCode || lead.name}`); body.set("document", attachment);
  await checkedFetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body });
}
