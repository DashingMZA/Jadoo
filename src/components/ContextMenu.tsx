"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import {
  ClockIcon,
  GearIcon,
  HeartIcon,
  HomeIcon,
  InfoIcon,
  LayersIcon,
} from "@/components/icons";
import type { TranslationKey } from "@/locales";

const ITEMS: { href: string; icon: typeof HomeIcon; key: TranslationKey }[] = [
  { href: "/", icon: HomeIcon, key: "nav.home" },
  { href: "/layout-profiles/", icon: LayersIcon, key: "nav.layoutProfiles" },
  { href: "/settings/", icon: GearIcon, key: "nav.settings" },
  { href: "/history/", icon: ClockIcon, key: "nav.history" },
  { href: "/donate/", icon: HeartIcon, key: "nav.donate" },
  { href: "/about/", icon: InfoIcon, key: "nav.about" },
];

/**
 * Native webview right-click menu (Back/Refresh/Save as/Print) ek desktop
 * app mein ajeeb lagta hai — isse poori tarah block karke iski jagah apne
 * pages ke quick-navigation links dikhate hain.
 */
export function ContextMenu() {
  const router = useRouter();
  const { t } = useAppContext();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
    }
    function onDismiss(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && menuRef.current?.contains(e.target as Node)) return;
      setPos(null);
    }

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("click", onDismiss);
    window.addEventListener("blur", () => setPos(null));
    window.addEventListener("keydown", onDismiss);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("click", onDismiss);
      window.removeEventListener("keydown", onDismiss);
    };
  }, []);

  if (!pos) return null;

  // Menu ko screen ke andar hi rakho (viewport ke bahar na jaye)
  const menuWidth = 190;
  const menuHeight = ITEMS.length * 34 + 10;
  const x = Math.min(pos.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(pos.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: y,
        left: x,
        width: menuWidth,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 5,
        zIndex: 1000,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      {ITEMS.map(({ href, icon: Icon, key }) => (
        <button
          key={href}
          onClick={() => {
            setPos(null);
            router.push(href);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            padding: "7px 8px",
            fontSize: 13,
            justifyContent: "flex-start",
          }}
        >
          <Icon width={16} height={16} />
          {t(key)}
        </button>
      ))}
    </div>
  );
}
