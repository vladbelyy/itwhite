export type EvidenceState = "verified" | "bounded" | "editorial";

export const corporateSections = [
  { href: "/solutions/", label: "Решения" },
  { href: "/products/", label: "Продукты" },
  { href: "/work/", label: "Работа" },
  { href: "/insights/", label: "Исследования" },
  { href: "/about/", label: "О компании" }
] as const;

export const solutionGroups = [
  {
    code: "PROCESS / AUTOMATION",
    title: "Автоматизация процессов",
    href: "/process-automation/",
    problem: "Повторяемый результат собирается между людьми и системами вручную, а исключение становится заметно только после срыва срока.",
    scope: ["карта события и владельца", "правила переходов", "интеграции и очереди", "ошибки и ручной fallback"],
    boundary: "Не автоматизируем несогласованный регламент. Сначала участники фиксируют состояние завершения и допустимые исключения.",
    related: [
      { href: "/business-process-audit/", label: "Аудит процесса" },
      { href: "/formats/", label: "Diagnose / Launch" },
      { href: "/security-data/", label: "Надёжность и данные" }
    ]
  },
  {
    code: "CRM / BITRIX24",
    title: "CRM и Bitrix24",
    href: "/crm-automation/",
    problem: "Обращение уже попало в канал или CRM, но у него нет видимого владельца, срока реакции или следующего действия.",
    scope: ["карта входящих каналов", "контроль SLA", "роботы и webhooks", "эскалации и наблюдаемость"],
    boundary: "CRM делает состояние и бездействие видимыми. Дисциплинарные и коммерческие решения остаются у руководителя.",
    related: [
      { href: "/bitrix24-automation/", label: "Автоматизация Bitrix24" },
      { href: "/lost-leads/", label: "Контроль потерянных заявок" },
      { href: "/it-white-control/", label: "IT WHITE Control" }
    ]
  },
  {
    code: "INTERNAL / SYSTEMS",
    title: "Внутренние системы",
    href: "/internal-tools/",
    problem: "Сотрудники работают между CRM, таблицами и кабинетами, а состояние процесса и права приходится сверять вручную.",
    scope: ["роли и обязательные действия", "системы-источники", "рабочие интерфейсы", "права и журнал событий"],
    boundary: "Не копируем весь набор сервисов. Внутренний слой закрывает один завершённый рабочий маршрут и его исключения.",
    related: [
      { href: "/custom-product-development/", label: "Разработка продукта" },
      { href: "/security-data/", label: "Права и данные" },
      { href: "/work/", label: "Собственные рабочие контуры" }
    ]
  },
  {
    code: "AI / CONTROLLED",
    title: "Контролируемый AI",
    href: "/ai-automation/",
    problem: "Модель запускают отдельно от процесса: без достаточного контекста, эталонной проверки, владельца качества и fallback.",
    scope: ["допустимая AI-операция", "минимальный контекст", "human-in-the-loop", "эталонный набор и журнал"],
    boundary: "AI получает ограниченную роль. Критичное действие подтверждает человек или детерминированное правило.",
    related: [
      { href: "/security-data/", label: "Контур данных" },
      { href: "/cases/", label: "Редакционные сценарии" },
      { href: "/formats/", label: "Безопасный пилот" }
    ]
  }
] as const;

export const supportingCapabilities = [
  {
    code: "TECH / ARCHITECTURE",
    title: "Технический консалтинг и архитектура",
    href: "/technical-consulting/",
    summary: "Независимо проверяем архитектуру, код, инфраструктуру, данные и эксплуатационные риски до модернизации, крупной инвестиции или смены подрядчика."
  },
  {
    code: "DATA / RELIABILITY",
    title: "Интеграции, безопасность и данные",
    href: "/security-data/",
    summary: "Событийные контракты, права, секреты, журнал, повторная доставка и восстановление — обязательный слой каждого из четырёх направлений."
  },
  {
    code: "DEMAND / ATTRIBUTION",
    title: "Спрос и атрибуция",
    href: "/seo-support/",
    summary: "Связываем спрос, посадочную, валидное обращение и CRM-источник, не выдавая позиции и трафик за коммерческий результат."
  }
] as const;

export const productRegistry = [
  {
    code: "PRODUCT / CONTROL",
    name: "IT WHITE Control",
    href: "/it-white-control/",
    state: "verified" as EvidenceState,
    stateLabel: "Рабочий контур / доступ ограничен",
    summary: "Дополнительный слой контроля поверх CRM: отслеживает SLA и отсутствие обязательного действия, затем возвращает риск ответственному.",
    evidence: "Публично описаны архитектура сценария и границы роли AI. Рабочая поверхность требует авторизации.",
    boundary: "Клиентские показатели, автономные решения модели и универсальная совместимость не заявляются."
  },
  {
    code: "PRODUCT / COMMUNICATION",
    name: "Telegram Multiaccount",
    href: "https://tg.itwhite.ru/",
    state: "verified" as EvidenceState,
    stateLabel: "Рабочая веб-система",
    summary: "Единое рабочее пространство для нескольких Telegram-аккаунтов, распределения диалогов и контроля коммуникаций.",
    evidence: "Публичная продуктовая поверхность доступна. На этой странице не публикуются чужие переписки или клиентские метрики.",
    boundary: "Статус продукта не означает обещание конкретной пропускной способности, SLA или эффекта для другого бизнеса."
  },
  {
    code: "PRODUCT / DEMAND",
    name: "Avito Geo Demand",
    href: "/avito-analytics/",
    state: "bounded" as EvidenceState,
    stateLabel: "Внутренний продукт / публичный доступ не заявлен",
    summary: "Контур для сопоставления географии спроса, активности продвижения и связанных обращений.",
    evidence: "На сайте описана продуктовая логика. Открытая рабочая поверхность и внешние результаты здесь не заявляются.",
    boundary: "Демонстрационные числа нельзя трактовать как показатели клиента, охват рынка или гарантированный потенциал региона."
  }
] as const;

export const verifiedWork = [
  {
    code: "OWN SYSTEM / 01",
    title: "Контроль реакции на обращения",
    product: "IT WHITE Control",
    href: "/it-white-control/",
    status: "Собственный рабочий контур",
    verified: ["событийная проверка SLA", "возврат риска в рабочий канал", "разделение правил, AI-контекста и решения человека"],
    notClaimed: "Не публикуем показатели конкретного клиента, рост конверсии или ROI без отдельного подтверждения."
  },
  {
    code: "OWN SYSTEM / 02",
    title: "Рабочее пространство Telegram",
    product: "Telegram Multiaccount",
    href: "https://tg.itwhite.ru/",
    status: "Собственная работающая система",
    verified: ["единая веб-поверхность", "работа с несколькими аккаунтами", "централизованный контроль диалогов"],
    notClaimed: "Не публикуем содержимое коммуникаций, клиентские данные, SLA или количественный эффект."
  },
  {
    code: "OWN SYSTEM / 03",
    title: "Аналитика географии спроса",
    product: "Avito Geo Demand",
    href: "/avito-analytics/",
    status: "Внутренняя продуктовая работа",
    verified: ["модель сопоставления спроса и продвижения", "связь региона с управленческим действием", "отделение демонстрационных данных от клиентских"],
    notClaimed: "Публичный доступ, внешние результаты и клиентские показатели не заявляются."
  }
] as const;

export const teamProfiles = [
  {
    id: "vladislav-bely",
    name: "Владислав Белый",
    role: "Product & Engineering Partner",
    image: "/images/team/vladislav-bely-editorial-v1.webp",
    responsibility: "Отвечает за перевод бизнес-логики в работающую систему: архитектуру, данные, интерфейсы, интеграции, AI-контур и технический запуск.",
    areas: ["product strategy", "system architecture", "data and integrations", "engineering control"]
  },
  {
    id: "denis-korablev",
    name: "Денис Кораблёв",
    role: "Business & Delivery Partner",
    image: "/images/team/denis-korablev-editorial-v1.webp",
    responsibility: "Отвечает за связь решения с бизнес-процессом: диагностику, границы результата, согласование участников, внедрение и принятие системой команды.",
    areas: ["process discovery", "commercial framing", "stakeholder alignment", "delivery and adoption"]
  }
] as const;

export const evidenceRules = [
  "Выполненная работа, собственный продукт и редакционное исследование обозначаются разными статусами.",
  "Демонстрационные данные не выдаются за клиентские показатели.",
  "До измерения базовой линии не обещаются проценты роста, экономии или возврата инвестиций.",
  "Если AI не нужен, решение строится на правилах и обычной автоматизации.",
  "Критичные действия получают владельца, журнал и маршрут ручной проверки."
] as const;
