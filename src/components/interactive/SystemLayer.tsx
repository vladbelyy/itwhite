import { useEffect, useMemo, useState } from "react";

export function SystemLayer() {
  const [terminal, setTerminal] = useState(false);
  const [command, setCommand] = useState("");

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!items.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    items.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 35}ms`);
      observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setTerminal((value: boolean) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const output = useMemo(() => {
    const normalized = command.trim().toLowerCase();
    if (normalized === "list products") return "CRM Lead Control (private) / Avito Geo Demand (private) / tg.itwhite.ru";
    if (normalized === "show stack") return "Astro / React islands / Panda CSS / Node endpoint / CRM webhook ready";
    if (normalized === "contact team") return "Use /contact/ or the Telegram link.";
    return "commands: list products / show stack / contact team";
  }, [command]);

  return (
    <>
      {terminal && (
        <div className="terminal" role="dialog" aria-label="Системный терминал">
          <div>&gt; {output}</div>
          <input
            autoFocus
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="list products"
          />
        </div>
      )}
    </>
  );
}
