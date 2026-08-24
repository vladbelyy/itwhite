export const YANDEX_METRIKA_ID = 111614138;

export type AnalyticsGoal =
  | "lead_form_start"
  | "lead_submit_attempt"
  | "lead_success"
  | "diagnostic_start"
  | "diagnostic_complete"
  | "telegram_click"
  | "contact_cta_click"
  | "case_open";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

export function trackGoal(goal: AnalyticsGoal, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.ym !== "function") return;
  window.ym(YANDEX_METRIKA_ID, "reachGoal", goal, params);
}
