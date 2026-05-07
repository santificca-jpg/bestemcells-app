"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, TrendingUp, Settings } from "lucide-react";

const NAV = [
  { href: "/era", label: "Overview", icon: LayoutDashboard },
  { href: "/era/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/era/profesionales", label: "Profesionales", icon: Users },
  { href: "/era/embudos", label: "Embudos", icon: TrendingUp },
  { href: "/era/config", label: "Configuración", icon: Settings },
];

export default function EraLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-white font-black text-base leading-tight">ERA Longevity</div>
          <div className="text-white/50 text-xs mt-0.5">Dashboard interno</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/era" ? pathname === "/era" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="text-white/30 text-xs">Semana 13–17 Abr 2026</div>
          <div className="text-white/20 text-xs mt-0.5">Datos mock</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
