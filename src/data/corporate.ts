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
    code: "CONTROL / REVENUE",
    title: "Контроль продаж и CRM",
    href: "/crm-automation/",
    problem: "Обращение уже попало в канал или CRM, но у него нет видимого владельца, срока реакции или следующего действия.",
    scope: ["карта входящих каналов", "контроль SLA", "правила эскалации", "интеграции CRM и уведомлений"],
    boundary: "Система обнаруживает остановку процесса. Дисциплинарные и коммерческие решения остаются у руководителя.",
    related: [
      { href: "/lost-leads/", label: "Контроль потерянных заявок" },
      { href: "/bitrix24-automation/", label: "Автоматизация Bitrix24" },
      { href: "/it-white-control/", label: "IT WHITE Control" }
    ]
  },
  {
    code: "OPERATIONS / INTERFACE",
    title: "Внутренние системы",
    href: "/internal-tools/",
    problem: "Сотрудники работают между CRM, таблицами и чатами, а состояние процесса приходится собирать вручную.",
    scope: ["роли и обязательные действия", "единая модель данных", "рабочие интерфейсы", "права и журнал событий"],
    boundary: "Новая система не обязана заменять весь набор сервисов. Она соединяет только те источники, которые нужны процессу.",
    related: [
      { href: "/internal-tools/", label: "Панели и внутренние инструменты" },
      { href: "/security-data/", label: "Безопасность и данные" },
      { href: "/custom-product-development/", label: "Разработка продукта" }
    ]
  },
  {
    code: "AI / CONTROLLED ROLE",
    title: "AI в операциях",
    href: "/ai-automation/",
    problem: "Модели запускают отдельно от рабочего процесса: без достаточного контекста, проверки и ответственного действия.",
    scope: ["допустимые AI-операции", "контекст и источники", "human-in-the-loop", "логирование и fallback"],
    boundary: "AI получает ограниченную роль. Критичное действие подтверждает человек или детерминированное правило.",
    related: [
      { href: "/ai-automation/", label: "AI-автоматизация процессов" },
      { href: "/security-data/", label: "Контур данных" },
      { href: "/cases/", label: "Редакционные сценарии" }
    ]
  },
  {
    code: "SYSTEMS / CONNECTION",
    title: "Интеграции и данные",
    href: "/bitrix24-automation/",
    problem: "Сервисы фиксируют отдельные части процесса, но данные и обязательные действия не переходят между ними надёжно.",
    scope: ["API и webhooks", "событийная модель", "синхронизация состояний", "наблюдаемость и восстановление"],
    boundary: "Интеграция считается готовой не после первого успешного запроса, а после проверки ошибок, повторов и восстановления.",
    related: [
      { href: "/business-process-audit/", label: "Аудит процесса" },
      { href: "/internal-tools/", label: "Рабочие интерфейсы" },
      { href: "/security-data/", label: "Доступы и журнал" }
    ]
  },
  {
    code: "DEMAND / ATTRIBUTION",
    title: "Спрос и атрибуция",
    href: "/seo-support/",
    problem: "Поисковый спрос, посадочные страницы, обращения и сделки измеряются отдельно и не дают руководителю цельной картины.",
    scope: ["семантическая архитектура", "посадочные страницы", "события и источники", "связь заявок с CRM"],
    boundary: "Позиции и трафик не выдаются за бизнес-результат. Канал оценивается по качеству данных и связанным обращениям.",
    related: [
      { href: "/avito-analytics/", label: "Аналитика географии спроса" },
      { href: "/business-process-audit/", label: "Диагностика контура" },
      { href: "/formats/", label: "Форматы работы" }
    ]
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
