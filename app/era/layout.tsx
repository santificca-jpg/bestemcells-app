"use client";

import Link from "next/link";
import Image from "next/image";
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
    <div className="flex min-h-screen bg-milky">
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: "linear-gradient(180deg, #232E49 0%, #2C3A5B 55%, #3E4095 100%)" }}
      >
        {/* Logo real ERA */}
        <div className="px-6 pt-7 pb-6 border-b border-white/10">
          <Image
            src="/era-logo-white.png"
            alt="ERA Longevity"
            width={1352}
            height={572}
            priority
            className="w-32 h-auto"
          />
          <div className="text-white/40 text-[11px] mt-3 tracking-[0.25em] uppercase font-display">
            Dashboard interno
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/era" ? pathname === "/era" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/55 hover:bg-white/5 hover:text-white/90 font-light"
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full"
                    style={{ background: "#D2AE6D" }}
                  />
                )}
                <Icon size={17} strokeWidth={active ? 2 : 1.5} style={active ? { color: "#D2AE6D" } : undefined} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/10">
          <div className="text-white/35 text-[11px] tracking-wide">Semana 13–17 Abr 2026</div>
          <div className="text-white/20 text-[11px] mt-0.5">Datos en vivo · DriCloud</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
