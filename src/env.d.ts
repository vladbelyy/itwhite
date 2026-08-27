/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly BITRIX24_WEBHOOK_URL?: string;
  readonly TELEGRAM_BOT_TOKEN?: string;
  readonly TELEGRAM_CHAT_ID?: string;
  readonly LEAD_INGEST_URL?: string;
  readonly LEAD_INGEST_SECRET?: string;
  readonly LEAD_IP_HASH_SECRET?: string;
  readonly LEAD_ALLOW_LEGACY_SYNC?: string;
  readonly PUBLIC_YANDEX_METRIKA_ID?: string;
  readonly PUBLIC_GA_ID?: string;
  readonly PUBLIC_TELEGRAM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
