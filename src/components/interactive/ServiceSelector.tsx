import { useMemo, useState } from "react";

const options = [
  {
    label: "Теряются заявки",
    route: "/crm-automation/",
    result: "CRM control",
    text: "Проверяем путь лида, SLA реакции, ответственных, уведомления и точки, где заявка выпадает из процесса."
  },
  {
    label: "Нужен AI-инструмент",
    route: "/ai-automation/",
    result: "AI operations",
    text: "Определяем, где модель действительно нужна: переписки, классификация, документы, база знаний или контроль качества."
  },
  {
    label: "Спрос не связан с продажами",
    route: "/seo-support/",
    result: "Demand & attribution system",
    text: "Связываем поисковый спрос, посадочные страницы, события, CRM-источники и управленческую аналитику."
  },
  {
    label: "Нужен свой продукт",
    route: "/custom-product-development/",
    result: "Custom product",
    text: "Проектируем собственную систему: процесс, архитектуру, UX, MVP, интеграции и план развития."
  },
  {
    label: "Нужна панель",
    route: "/internal-tools/",
    result: "Internal tool",
    text: "Собираем роли, данные и действия в один рабочий интерфейс для сотрудников или руководителя."
  }
];

export default function ServiceSelector() {
  const [active, setActive] = useState(0);
  const selected = options[active];
  const session = useMemo(() => `ITW-${new Date().getFullYear()}-${String(active + 1).padStart(2, "0")}`, [active]);

  return (
    <div className="service-selector" data-reveal>
      <div className="service-selector__panel">
        <span>SELECT PROCESS PAIN</span>
        <div className="service-selector__buttons">
          {options.map((option, index) => (
            <button type="button" key={option.label} data-active={active === index} onClick={() => setActive(index)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <aside className="service-selector__result" aria-live="polite">
        <span>RECOMMENDED TRACK / {session}</span>
        <h3>{selected.result}</h3>
        <p>{selected.text}</p>
        <div>
          <a className="button button--primary" href={`/contact/?service=${selected.route.split("/").filter(Boolean)[0]}`}>Разобрать задачу</a>
          <a className="button" href={selected.route}>Открыть направление</a>
        </div>
      </aside>
    </div>
  );
}
