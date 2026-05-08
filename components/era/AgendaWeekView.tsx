"use client";

import { useState } from "react";
import type { AgendaData } from "@/lib/era/dashboard-data";
import { VERTICAL_META } from "@/lib/era/verticals";
import type { Vertical } from "@/lib/era/types";

const HEADERS_BG = ["#1a1a2e", "#16213e", "#0f3460", "#1a4080", "#1560a8"];

export default function AgendaWeekView({ data }: { data: AgendaData }) {
  const [filtroVertical, setFiltroVertical] = useState<Vertical | "todas">("todas");
  const [filtroProfesional, setFiltroProfesional] = useState("todos");

  const filtradas = data.citas.filter((c) => {
    if (filtroVertical !== "todas" && c.vertical !== filtroVertical) return false;
    if (filtroProfesional !== "todos" && c.profesional.nombre !== filtroProfesional) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-gray-800">Agenda semanal</h1>
        <div className="flex gap-2">
          <select
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
            value={filtroVertical}
            onChange={(e) => setFiltroVertical(e.target.value as Vertical | "todas")}
          >
            <option value="todas">Todas las verticales</option>
            {(Object.keys(VERTICAL_META) as Vertical[]).map((v) => (
              <option key={v} value={v}>{VERTICAL_META[v].label}</option>
            ))}
          </select>
          <select
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
            value={filtroProfesional}
            onChange={(e) => setFiltroProfesional(e.target.value)}
          >
            <option value="todos">Todos los profesionales</option>
            {data.profesionales.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {data.dias.map(({ label, fecha }, i) => {
          const citas = filtradas
            .filter((c) => c.fecha_hora.startsWith(fecha))
            .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));

          return (
            <div key={fecha} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div
                className="flex justify-between items-center px-3 py-2.5 text-white text-sm font-bold"
                style={{ background: HEADERS_BG[i] }}
              >
                <span>{label}</span>
                <span className="bg-white/25 px-2 py-0.5 rounded-full text-xs">{citas.length}</span>
              </div>
              <div>
                {citas.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-400 text-center">Sin turnos</div>
                )}
                {citas.map((c) => {
                  const meta = VERTICAL_META[c.vertical];
                  const hora = c.fecha_hora.substring(11, 16);
                  return (
                    <div
                      key={c.id}
                      className={`flex border-b border-gray-100 hover:bg-gray-50 transition-colors ${c.es_primera_vez ? "bg-yellow-50" : ""}`}
                      style={{ borderLeft: `3px solid ${c.es_primera_vez ? "#eab308" : meta.color}` }}
                    >
                      <div className="px-2 py-1.5 flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-400">{hora}</div>
                        <div className="text-xs font-semibold text-gray-800 truncate">
                          {c.paciente.nombre_completo}
                          {c.paciente.es_vip && <span className="ml-0.5">🧬</span>}
                        </div>
                        <div className="text-xs text-gray-400 italic truncate">{c.profesional.nombre}</div>
                        <div className="text-xs text-gray-400 truncate">{c.servicio}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {c.es_primera_vez && (
                            <span className="text-xs font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 leading-none">PV</span>
                          )}
                          <span
                            className="text-xs font-bold px-1 py-0.5 rounded leading-none text-white"
                            style={{ background: meta.color, fontSize: "0.55rem" }}
                          >
                            {meta.label.slice(0, 6).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
