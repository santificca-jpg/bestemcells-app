"use client";

import { useState } from "react";
import { VERTICAL_META } from "@/lib/era/verticals";
import { PROFESIONALES } from "@/lib/era/mock-data";
import type { Vertical } from "@/lib/era/types";

const VERTICALES = Object.keys(VERTICAL_META) as Vertical[];

export default function ConfigPage() {
  const [profs, setProfs] = useState(
    PROFESIONALES.map((p) => ({ ...p }))
  );
  const [guardado, setGuardado] = useState(false);

  const cambiarVerticalDefault = (id: string, v: Vertical) => {
    setProfs((ps) => ps.map((p) => p.id === id ? { ...p, vertical_default: v } : p));
    setGuardado(false);
  };

  const cambiarVerticalSecundaria = (id: string, v: Vertical | "") => {
    setProfs((ps) => ps.map((p) =>
      p.id === id ? { ...p, vertical_secundaria: v === "" ? undefined : v as Vertical } : p
    ));
    setGuardado(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-gray-800">Configuración</h1>
          <p className="text-xs text-gray-400 mt-0.5">Ajustá el mapeo de verticales por profesional</p>
        </div>
        <button
          onClick={() => setGuardado(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ background: "#0f3460" }}
        >
          {guardado ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </div>

      {/* Mapeo verticales por profesional */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Vertical por defecto por profesional</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Esta vertical se usa cuando la cita no tiene servicio mapeado explícitamente.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Profesional</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Especialidad</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Vertical principal</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Segunda vertical</th>
            </tr>
          </thead>
          <tbody>
            {profs.map((p) => {
              const metaDefault = VERTICAL_META[p.vertical_default];
              const metaSec = p.vertical_secundaria ? VERTICAL_META[p.vertical_secundaria] : null;
              return (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{p.especialidad}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={p.vertical_default}
                      onChange={(e) => cambiarVerticalDefault(p.id, e.target.value as Vertical)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 font-semibold"
                      style={{ color: metaDefault.color }}
                    >
                      {VERTICALES.map((v) => (
                        <option key={v} value={v}>{VERTICAL_META[v].emoji} {VERTICAL_META[v].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={p.vertical_secundaria ?? ""}
                      onChange={(e) => cambiarVerticalSecundaria(p.id, e.target.value as Vertical | "")}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 font-semibold"
                      style={{ color: metaSec?.color ?? "#9ca3af" }}
                    >
                      <option value="">— ninguna —</option>
                      {VERTICALES.map((v) => (
                        <option key={v} value={v}>{VERTICAL_META[v].emoji} {VERTICAL_META[v].label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sync log (mock) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Historial de sincronización</h2>
          <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
            Sincronizar ahora
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { fecha: "2026-04-13 03:00", estado: "ok", synced: 117, duracion: "2m 14s" },
            { fecha: "2026-04-12 03:00", estado: "ok", synced: 98, duracion: "1m 52s" },
            { fecha: "2026-04-11 03:00", estado: "ok", synced: 103, duracion: "2m 01s" },
            { fecha: "2026-04-10 03:00", estado: "error", synced: 0, duracion: "—" },
            { fecha: "2026-04-09 03:00", estado: "ok", synced: 89, duracion: "1m 44s" },
          ].map((log) => (
            <div key={log.fecha} className="px-4 py-3 flex items-center gap-4 text-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${log.estado === "ok" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-gray-400 text-xs font-mono w-36 shrink-0">{log.fecha}</span>
              <span className={`text-xs font-bold ${log.estado === "ok" ? "text-green-600" : "text-red-500"}`}>
                {log.estado === "ok" ? "✓ OK" : "✗ Error"}
              </span>
              <span className="text-xs text-gray-500">{log.synced > 0 ? `${log.synced} citas sincronizadas` : "Sin datos"}</span>
              <span className="text-xs text-gray-400 ml-auto">{log.duracion}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Próximos pasos:</strong> Conectar con DriCloud para reemplazar los datos mock con datos reales.
        El sync automático correrá todas las noches a las 03:00 ART vía Vercel Cron.
      </div>
    </div>
  );
}
