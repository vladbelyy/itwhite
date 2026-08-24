import { useEffect, useRef, useState } from "react";
import { trackGoal } from "../../lib/analytics";

const topics = [
  "теряются заявки и контроль",
  "много ручной работы",
  "нужна внутренняя система",
  "нужно развить существующий продукт"
];

const serviceContexts = {
  "lost-leads": { label: "Контроль потерянных заявок", path: "/lost-leads/" },
  "ai-in-operations": { label: "AI в операциях", path: "/ai-automation/" },
  "internal-business-system": { label: "Внутренняя система", path: "/internal-tools/" },
  "it-white-control": { label: "IT WHITE Control", path: "/it-white-control/" },
  "avito-analytics": { label: "Аналитика Авито", path: "/avito-analytics/" },
  "bitrix24-automation": { label: "Интеграции Bitrix24", path: "/bitrix24-automation/" },
  "crm-automation": { label: "CRM-автоматизация и контроль лидов", path: "/crm-automation/" },
  "ai-automation": { label: "AI-автоматизация бизнес-процессов", path: "/ai-automation/" },
  "business-process-audit": { label: "Аудит бизнес-процессов", path: "/business-process-audit/" },
  "custom-product-development": { label: "Разработка продукта под бизнес-задачу", path: "/custom-product-development/" },
  "internal-tools": { label: "Внутренние системы и панели", path: "/internal-tools/" },
  "seo-support": { label: "Спрос и атрибуция заявок", path: "/seo-support/" },
  "security-data": { label: "Безопасность и данные", path: "/security-data/" },
  "diagnose": { label: "Диагностика процесса", path: "/formats/" },
  "formats": { label: "Форматы работы", path: "/formats/" },
  "process-review": { label: "Первичный разбор процесса", path: "/" },
  "research-scenario": { label: "Проверка применимости исследовательского сценария", path: "/cases/" },
  "process-gap-check": { label: "Результат диагностики процесса", path: "/tools/process-gap-check/" }
} as const;

type ServiceSlug = keyof typeof serviceContexts;
type OriginService = (typeof serviceContexts)[ServiceSlug] & { slug: ServiceSlug };

function serviceSlugFrom(value: string | null | undefined): ServiceSlug | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().split(/[?#]/)[0]?.replace(/^\/+|\/+$/g, "") || "";
  const slug = normalized.split("/").filter(Boolean).at(-1) || "";
  return slug in serviceContexts ? slug as ServiceSlug : null;
}

function serviceFromSlug(slug: ServiceSlug | null): OriginService | null {
  return slug ? { slug, ...serviceContexts[slug] } : null;
}

export default function ProjectForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "partial" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [originService, setOriginService] = useState<OriginService | null>(null);
  const [originScenario, setOriginScenario] = useState("");
  const [requestStatus, setRequestStatus] = useState({
    contact: false,
    process: false,
    company: false
  });
  const [sessionId, setSessionId] = useState("pending");
  const [requestCode, setRequestCode] = useState("ITW-2026-0000");
  const formStarted = useRef(false);

  useEffect(() => {
    const storedDiagnosis = localStorage.getItem("itwhiteDiagnosis");
    if (storedDiagnosis) {
      try {
        const parsed = JSON.parse(storedDiagnosis) as { expiresAt?: string };
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) setDiagnosis(storedDiagnosis);
        else localStorage.removeItem("itwhiteDiagnosis");
      } catch { localStorage.removeItem("itwhiteDiagnosis"); }
    }

    const params = new URLSearchParams(window.location.search);
    let serviceSlug = serviceSlugFrom(params.get("service") || params.get("originService"));
    const scenario = params.get("scenario") || "";
    if (/^[a-z0-9-]{1,120}$/.test(scenario)) setOriginScenario(scenario);

    if (!serviceSlug && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin) serviceSlug = serviceSlugFrom(referrer.pathname);
      } catch {
        // Ignore malformed or non-URL referrers.
      }
    }

    if (!serviceSlug && window.location.hash === "#contact") {
      const storedService = sessionStorage.getItem("itwhiteOriginService");
      if (storedService) {
        try {
          const parsed = JSON.parse(storedService) as { slug?: string; savedAt?: number };
          if (parsed.savedAt && Date.now() - parsed.savedAt < 30 * 60 * 1000) serviceSlug = serviceSlugFrom(parsed.slug);
        } catch {
          serviceSlug = serviceSlugFrom(storedService);
        }
      }
    }

    setOriginService(serviceFromSlug(serviceSlug));
    setSessionId(crypto.randomUUID());
    setRequestCode(`ITW-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  async function submit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    trackGoal("lead_submit_attempt", { requestCode, originService: originService?.slug || "" });
    setState("sending");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("diagnosis", diagnosis);
    data.set("sessionId", sessionId === "pending" ? crypto.randomUUID() : sessionId);
    data.set("requestCode", requestCode);
    data.set("originService", originService?.slug || "");
    data.set("originScenario", originScenario);
    data.set("pageUrl", window.location.href);
    data.set("landingPath", originScenario ? `/cases/${originScenario}/` : originService?.path || window.location.pathname);
    data.set("referrer", document.referrer);
    data.set("utm", JSON.stringify(Object.fromEntries(new URLSearchParams(window.location.search))));

    try {
      const response = await fetch("/api/lead", { method: "POST", body: data });
      const result = await response.json().catch(() => ({})) as { error?: string; warning?: string; deliveredChannels?: string[] };
      if (!response.ok) throw new Error(result.error || "Не удалось передать заявку.");
      const partial = Boolean(result.warning);
      setState(partial ? "partial" : "sent");
      setMessage(result.warning || `Заявка передана: ${(result.deliveredChannels || []).join(" + ") || "канал связи"}.`);
      trackGoal("lead_success", { requestCode, originService: originService?.slug || "", degraded: partial, channels: result.deliveredChannels || [] });
      form.reset();
      setFileName("");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось отправить форму.");
    }
  }

  function updateRequestStatus(form: HTMLFormElement) {
    const data = new FormData(form);
    setRequestStatus({
      contact: Boolean(String(data.get("contact") ?? "").trim()),
      process: Boolean(String(data.get("task") ?? "").trim()),
      company: Boolean(String(data.get("company") ?? "").trim())
    });
  }

  return (
    <form className="form-grid ym-disable-keys" onSubmit={submit} onFocusCapture={() => {
      if (!formStarted.current) { formStarted.current = true; trackGoal("lead_form_start", { requestCode, originService: originService?.slug || "" }); }
    }} onInput={(event) => updateRequestStatus(event.currentTarget)} onChange={(event) => updateRequestStatus(event.currentTarget)} aria-busy={state === "sending"}>
      <div className="form-header field--full">
        <span>PRIMARY REVIEW / INTRO</span>
        <b>ID: {requestCode}</b>
        {originService && (
          <p role="status"><strong>Контекст обращения:</strong> {originService.label}. Он будет передан вместе с заявкой — повторно выбирать направление не нужно.</p>
        )}
        <p>Сначала уточняем задачу, контекст и следующий разумный шаг. Полная карта процесса появляется только в отдельной диагностике.</p>
        <div className="request-status" aria-label="Статус заполнения заявки">
          <em data-ready={requestStatus.contact}>CONTACT</em>
          <em data-ready={requestStatus.process}>PROCESS</em>
          <em data-ready={requestStatus.company}>COMPANY</em>
        </div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
      <input type="hidden" name="consentVersion" value="PD-CONSENT-2026-08-14-R4" />
      <input type="hidden" name="privacyVersion" value="PRIVACY-2026-08-14-R5" />
      <input type="hidden" name="originService" value={originService?.slug || ""} />
      <input type="hidden" name="originScenario" value={originScenario} />
      <div className="field">
        <label htmlFor="name">01 / Имя</label>
        <input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="company">02 / Компания</label>
        <input id="company" name="company" autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="contact">03 / Telegram или телефон</label>
        <input id="contact" name="contact" required autoComplete="tel" inputMode="tel" placeholder="@username или +7 900 000-00-00" aria-describedby="contact-hint" />
        <small id="contact-hint">Оставьте удобный канал — без автоматических рассылок.</small>
      </div>
      <div className="field field--full">
        <label htmlFor="task">04 / Что тормозит бизнес?</label>
        <textarea id="task" name="task" required placeholder="Опишите процесс, который раздражает: где команда теряет время, заявки, деньги или контроль?" />
      </div>
      <details className="field field--full form-optional">
        <summary>Добавить детали для платной диагностики</summary>
        <div className="form-optional__grid">
          <div className="field">
            <label htmlFor="site">05 / Сайт</label>
            <input id="site" name="site" inputMode="url" />
          </div>
          <div className="field">
            <label htmlFor="systems">06 / Системы</label>
            <input id="systems" name="systems" placeholder="Bitrix24, amoCRM, Авито, Telegram..." />
          </div>
          <div className="field field--full">
            <span className="question-label">07 / Где уже чувствуется боль?</span>
            <div className="topic-pills">
              {topics.map((topic) => (
                <label key={topic}>
                  <input type="checkbox" name="topics" value={topic} />
                  {topic}
                </label>
              ))}
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="attachment">08 / Файл или скриншот</label>
            <input id="attachment" name="attachment" type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/png,image/jpeg,image/webp" aria-describedby="attachment-hint" onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")} />
            <small id="attachment-hint">PDF, TXT, PNG, JPG или WebP до 5 МБ.{fileName ? ` Выбран: ${fileName}` : ""}</small>
          </div>
        </div>
      </details>
      <label className="form-consent field--full">
        <input type="checkbox" name="consent" required />
        <span>Даю отдельное <a href="/personal-data-consent/" target="_blank" rel="noopener noreferrer">согласие на обработку персональных данных</a> для ответа на это обращение.</span>
      </label>
      <p className="form-legal-note field--full">До отправки ознакомьтесь с <a href="/privacy/" target="_blank" rel="noopener noreferrer">политикой обработки персональных данных</a> и <a href="/cookies/" target="_blank" rel="noopener noreferrer">данными браузера</a>. Согласие не включает рекламные рассылки.</p>
      <div className="field field--full">
        <button className="button button--primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Отправляем" : "Запустить первичный разбор"}
        </button>
        {(state === "sent" || state === "partial") && <p role="status" data-form-state={state}>REQUEST ACCEPTED / ID: {requestCode}. {message}</p>}
        {state === "error" && <p role="alert" data-form-state="error">{message} Можно написать напрямую: <a href="mailto:info@itwhite.ru">info@itwhite.ru</a> или <a href="https://t.me/rgvldi" target="_blank" rel="noopener noreferrer">@rgvldi</a>.</p>}
      </div>
    </form>
  );
}
