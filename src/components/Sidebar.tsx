"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GearIcon,
  HeartIcon,
  HomeIcon,
  InfoIcon,
  LayersIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@/components/icons";
import type { TranslationKey } from "@/locales";

const LINKS: { href: string; icon: typeof HomeIcon; key: TranslationKey }[] = [
  { href: "/", icon: HomeIcon, key: "nav.home" },
  { href: "/layout-profiles/", icon: LayersIcon, key: "nav.layoutProfiles" },
  { href: "/settings/", icon: GearIcon, key: "nav.settings" },
  { href: "/history/", icon: ClockIcon, key: "nav.history" },
  { href: "/donate/", icon: HeartIcon, key: "nav.donate" },
  { href: "/about/", icon: InfoIcon, key: "nav.about" },
];

const COLLAPSE_KEY = "jadoo:sidebar-collapsed";
const THEME_CYCLE = ["dark", "light", "system"] as const;
const THEME_ICON = { dark: MoonIcon, light: SunIcon, system: MonitorIcon };
const THEME_LABEL_KEY: Record<(typeof THEME_CYCLE)[number], TranslationKey> = {
  dark: "theme.dark",
  light: "theme.light",
  system: "theme.system",
};

export function Sidebar() {
  const pathname = usePathname();
  const { t, preferences, setThemeMode, batchStatus } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(preferences.themeMode);
    setThemeMode(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  }

  const CurrentThemeIcon = THEME_ICON[preferences.themeMode];

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-brand">
        <img src="/jadoo-icon.png" alt="Jadoo" className="logo-mark" />
        {!collapsed && (
          <div className="brand-text">
            <div className="brand-name">Jadoo</div>
            <div className="brand-subtitle">{t("sidebar.subtitle")}</div>
          </div>
        )}
      </div>

      <nav>
        {LINKS.map(({ href, icon: Icon, key }) => {
          const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={"nav-link" + (isActive ? " active" : "")}
              title={collapsed ? t(key) : undefined}
            >
              <span className="nav-icon">
                <Icon />
              </span>
              {!collapsed && <span>{t(key)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {collapsed ? (
          // Collapsed mein jagah tang hoti hai — sirf abhi wale mode ka ek
          // icon dikhao; click karne se agla mode cycle ho jata hai.
          <div className="theme-toggle-row">
            <button title={t(THEME_LABEL_KEY[preferences.themeMode])} className="active" onClick={cycleTheme}>
              <CurrentThemeIcon />
            </button>
          </div>
        ) : (
          <div className="theme-toggle-row">
            <button
              title={t("theme.dark")}
              className={preferences.themeMode === "dark" ? "active" : ""}
              onClick={() => setThemeMode("dark")}
            >
              <MoonIcon />
            </button>
            <button
              title={t("theme.light")}
              className={preferences.themeMode === "light" ? "active" : ""}
              onClick={() => setThemeMode("light")}
            >
              <SunIcon />
            </button>
            <button
              title={t("theme.system")}
              className={preferences.themeMode === "system" ? "active" : ""}
              onClick={() => setThemeMode("system")}
            >
              <MonitorIcon />
            </button>
          </div>
        )}

        <div className="status-row">
          <span className={"status-dot" + (batchStatus === "running" ? " working" : "")} />
          {!collapsed && <span>{batchStatus === "running" ? t("status.working") : t("status.stopped")}</span>}
        </div>

        <button
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          {!collapsed && <span>{t("sidebar.collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}
