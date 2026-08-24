/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly BITRIX24_WEBHOOK_URL?: string;
  readonly TELEGRAM_BOT_TOKEN?: string;
  readonly TELEGRAM_CHAT_ID?: string;
  readonly PUBLIC_YANDEX_METRIKA_ID?: string;
  readonly PUBLIC_GA_ID?: string;
  readonly PUBLIC_TELEGRAM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
