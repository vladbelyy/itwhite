import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const labels: Record<string, string> = {
  intro: "01 INTRO",
  problem: "02 PROCESS GAPS",
  systems: "03 LIVE SYSTEMS",
  method: "04 METHOD",
  case: "05 CRM CONTROL",
  team: "06 TEAM / RESPONSIBILITY",
  diagnostic: "06 DIAGNOSTIC",
  contact: "07 ACCEPTING PROJECTS"
};

const sectionLinks = [
  { id: "intro", label: "01 Intro", href: "/#intro" },
  { id: "problem", label: "02 Problem", href: "/#problem" },
  { id: "systems", label: "03 Systems", href: "/#systems" },
  { id: "method", label: "04 Method", href: "/#method" },
  { id: "case", label: "05 Case", href: "/#case" },
  { id: "team", label: "06 Team", href: "/#team" },
  { id: "contact", label: "07 Contact", href: "/contact/" }
];

const corporateLinks = [
  { label: "Решения", href: "/solutions/" },
  { label: "Продукты", href: "/products/" },
  { label: "Внедрения", href: "/work/" },
  { label: "Материалы", href: "/insights/" },
  { label: "Команда", href: "/about/" }
];

const contextPanels: Record<string, { index: string; label: string; idea: string[]; status: string }> = {
  intro: {
    index: "01 / INTRO",
    label: "IT WHITE / SYSTEMS STUDIO",
    idea: ["SOLUTIONS / PRODUCTS / WORK", "STATUS: ACCEPTING PROJECTS"],
    status: "READY"
  },
  problem: {
    index: "02 / PROCESS BREAKS",
    label: "LOSS DETECTION",
    idea: ["CRM / PEOPLE / DATA", "STATUS: UNCONTROLLED"],
    status: "BREAK"
  },
  systems: {
    index: "03 / LIVE SYSTEMS",
    label: "CRM / TELEGRAM / AVITO",
    idea: ["03 INTERNAL CONTOURS", "PUBLIC ACCESS VARIES"],
    status: "CONTROLLED"
  },
  method: {
    index: "04 / METHOD",
    label: "DIAGNOSE / LAUNCH / OPERATE",
    idea: ["PROCESS BEFORE CODE", "STATUS: METHOD"],
    status: "METHOD"
  },
  case: {
    index: "05 / VERIFIED WORK",
    label: "CRM LEAD CONTROL",
    idea: ["LIVE INTERNAL SYSTEM", "STATUS: DEPLOYED"],
    status: "DEPLOYED"
  },
  team: {
    index: "06 / RESPONSIBILITY",
    label: "NO HANDOFF BETWEEN",
    idea: ["SALES AND ENGINEERING", "STATUS: SHARED OWNERSHIP"],
    status: "SHARED"
  },
  diagnostic: {
    index: "06 / DIAGNOSTIC",
    label: "BUSINESS CONTROL CHECK",
    idea: ["MANUAL DEPENDENCY", "STATUS: SCANNING"],
    status: "SCAN"
  },
  contact: {
    index: "07 / REQUEST",
    label: "PROCESS DIAGNOSTIC",
    idea: ["FIRST REVIEW", "STATUS: ACCEPTING PROJECTS"],
    status: "ACCEPTING"
  }
};

export default function StatusBar() {
  const [active, setActive] = useState("intro");
  const [currentPath, setCurrentPath] = useState("/");
  const [navTheme, setNavTheme] = useState<"light" | "dark">("light");
  const context = contextPanels[active] ?? contextPanels.intro;
  const progressIndex = Math.min(sectionLinks.findIndex((item) => item.id === active) + 1 || 1, sectionLinks.length);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-status-section]"));
    const syncMenuItemThemes = () => {
      const links = Array.from(document.querySelectorAll<HTMLElement>(".side-nav a"));
      links.forEach((link) => {
        const rect = link.getBoundingClientRect();
        const sampleX = Math.max(1, Math.round(rect.left + Math.min(rect.width / 2, 28)));
        const sampleY = Math.round(rect.top + rect.height / 2);
        const stack = document.elementsFromPoint(sampleX, sampleY);
        const section = stack
          .map((element) => element.closest<HTMLElement>("[data-status-section]"))
          .find((candidate) => candidate && !link.contains(candidate));
        link.dataset.overTheme = section?.classList.contains("dark-section") ? "dark" : "light";
      });
    };

    const syncActiveSection = () => {
      const probeY = Math.round(window.innerHeight * 0.42);
      const current = sections
        .map((section) => {
          const rect = section.getBoundingClientRect();
          return {
            section,
            distance: rect.top <= probeY && rect.bottom >= probeY ? 0 : Math.min(Math.abs(rect.top - probeY), Math.abs(rect.bottom - probeY))
          };
        })
        .sort((a, b) => a.distance - b.distance)[0]?.section;

      const currentId = current?.dataset.navCurrent || current?.id;
      if (currentId) setActive(currentId);
      setNavTheme(current?.classList.contains("dark-section") ? "dark" : "light");
      syncMenuItemThemes();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const target = visible?.target as HTMLElement | undefined;
        const targetId = target?.dataset.navCurrent || target?.id;
        if (targetId) setActive(targetId);
        setNavTheme(target?.classList.contains("dark-section") ? "dark" : "light");
        syncMenuItemThemes();
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.15, 0.35, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));
    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncMenuItemThemes);
    window.addEventListener("hashchange", syncActiveSection);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncMenuItemThemes);
      window.removeEventListener("hashchange", syncActiveSection);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.navTheme = navTheme;
  }, [navTheme]);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-nav-target]").forEach((link) => {
      const isActive = link.dataset.navTarget === active;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, [active]);

  return (
    <>
    <aside className="top-status" aria-label="Контекст текущей секции">
      <div className="top-status__content" key={active}>
        <span>CURRENT SECTION</span>
        <b>{context.index}</b>
        <p>{context.label}</p>
        {context.idea.map((item) => <p key={item}>{item}</p>)}
        <div className="top-status__progress" aria-label={`Прогресс ${progressIndex} из ${sectionLinks.length}`}>
          <em>{String(progressIndex).padStart(2, "0")} / {String(sectionLinks.length).padStart(2, "0")}</em>
          <i style={{ "--progress": `${(progressIndex / sectionLinks.length) * 100}%` } as CSSProperties} />
          <strong>{context.status}</strong>
        </div>
      </div>
    </aside>

    <nav className="status-bar" data-active-section={active} aria-label="Нижняя навигация">
      <a className="status-bar__brand" href="/#intro" aria-label="IT WHITE: к началу страницы">
        <span className="status-bar__signal" aria-hidden="true" />
        <span>IT WHITE</span>
      </a>

      <div className="status-bar__cluster status-bar__cluster--sections" aria-label="Разделы сайта">
        {corporateLinks.map((item) => (
          <a key={item.href} href={item.href} data-active={currentPath === item.href} aria-current={currentPath === item.href ? "page" : undefined}>
            {item.label}
          </a>
        ))}
      </div>

      <div className="status-bar__state">
        <span>{labels[active] ?? "ONLINE"}</span>
        <b>SYSTEMS / WORK / RESEARCH</b>
      </div>

      <a className="status-bar__cta" href="/contact/?service=process-review">
        <span className="status-bar__full">Разобрать процесс</span>
        <span className="status-bar__short">Заявка</span>
      </a>
    </nav>
    </>
  );
}
