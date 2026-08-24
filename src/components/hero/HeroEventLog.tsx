import { useEffect, useState } from "react";

const events = [
  ["12:42:08", "Новый лид получен из Авито"],
  ["12:42:12", "Менеджер не назначен"],
  ["12:48:12", "Lead Control запустил проверку"],
  ["12:48:14", "Уведомление отправлено в Bitrix24"],
  ["12:51:07", "Telegram account #04 synced"],
  ["12:53:21", "Обнаружен рост спроса: Новосибирск"],
  ["12:54:02", "CRM reaction timer active"],
  ["12:55:18", "Geo Demand updated regional queue"]
];

export default function HeroEventLog() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setOffset((current) => (current + 1) % events.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  const visible = Array.from({ length: 5 }, (_, index) => events[(offset + index) % events.length]);

  return (
    <aside className="event-log" aria-label="Демонстрационный журнал событий IT WHITE">
      <div className="event-log__header">
        <span>Example operating scenario</span>
        <b>Illustrative data / not client metrics</b>
      </div>
      <div className="event-log__feed">
        {visible.map(([time, text], index) => (
          <div className="event-row" key={`${time}-${text}`} data-active={index === 0}>
            <span>{time}</span>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="event-log__stats">
        <span><b>03</b> systems online</span>
        <span><b>DEMO</b> connections</span>
        <span><b>4 sec</b> last event</span>
      </div>
    </aside>
  );
}
