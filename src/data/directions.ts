export type DirectionProfile = {
  key: "process" | "crm" | "internal" | "ai";
  code: string;
  shortLabel: string;
  title: string;
  href: string;
  accent: string;
  thesis: string;
  controlLoop: readonly [
    { label: string; value: string },
    { label: string; value: string },
    { label: string; value: string },
    { label: string; value: string }
  ];
};

export const directionProfiles: DirectionProfile[] = [
  {
    key: "process",
    code: "PROCESS / AUTOMATION",
    shortLabel: "Автоматизация процессов",
    title: "Автоматизация процессов без закрепления хаоса",
    href: "/process-automation/",
    accent: "#9c3508",
    thesis: "Сначала фиксируем событие, владельца и состояние завершения. Только затем убираем ручной переход или добавляем интеграцию.",
    controlLoop: [
      { label: "SIGNAL", value: "повторяемая ручная передача" },
      { label: "UNIT", value: "событие → владелец → срок" },
      { label: "CONTROL", value: "исключение видно до отчёта" },
      { label: "PROOF", value: "сценарий воспроизводится" }
    ]
  },
  {
    key: "crm",
    code: "CRM / BITRIX24",
    shortLabel: "CRM и Bitrix24",
    title: "CRM и Bitrix24 как рабочий контур, а не архив сделок",
    href: "/crm-automation/",
    accent: "#275b87",
    thesis: "Соединяем канал, карточку, SLA и следующее действие. Внешнюю логику добавляем только там, где штатных инструментов недостаточно.",
    controlLoop: [
      { label: "SIGNAL", value: "лид есть, действия нет" },
      { label: "SYSTEM", value: "CRM хранит состояние" },
      { label: "CONTROL", value: "SLA и эскалация" },
      { label: "PROOF", value: "событие не теряется" }
    ]
  },
  {
    key: "internal",
    code: "INTERNAL / SYSTEMS",
    shortLabel: "Внутренние системы",
    title: "Внутренние системы вокруг роли и решения",
    href: "/internal-tools/",
    accent: "#426800",
    thesis: "Не копируем все функции CRM и таблиц. Собираем один завершённый рабочий маршрут с правами, источниками и видимыми исключениями.",
    controlLoop: [
      { label: "ROLE", value: "кто принимает решение" },
      { label: "VIEW", value: "что нужно увидеть" },
      { label: "ACTION", value: "что изменить или подтвердить" },
      { label: "PROOF", value: "маршрут пройден без обхода" }
    ]
  },
  {
    key: "ai",
    code: "AI / CONTROLLED",
    shortLabel: "Контролируемый AI",
    title: "AI с ограниченной ролью, проверкой и fallback",
    href: "/ai-automation/",
    accent: "#624276",
    thesis: "Модель получает только необходимый контекст, возвращает структурированный результат и не выполняет критичное действие без правила или человека.",
    controlLoop: [
      { label: "INPUT", value: "допустимый контекст" },
      { label: "MODEL", value: "ограниченная операция" },
      { label: "CONTROL", value: "проверка и fallback" },
      { label: "PROOF", value: "эталонный набор и журнал" }
    ]
  }
];

const directionBySlug: Record<string, DirectionProfile> = {
  "process-automation": directionProfiles[0],
  "business-process-audit": directionProfiles[0],
  "crm-automation": directionProfiles[1],
  "bitrix24-automation": directionProfiles[1],
  "lost-leads": directionProfiles[1],
  "it-white-control": directionProfiles[1],
  "internal-tools": directionProfiles[2],
  "custom-product-development": directionProfiles[2],
  "technical-consulting": directionProfiles[2],
  "ai-automation": directionProfiles[3]
};

export function getDirectionProfile(slug: string) {
  return directionBySlug[slug];
}
