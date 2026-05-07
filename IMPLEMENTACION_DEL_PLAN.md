# Implementación del Plan — Dashboard ERA Longevity

**Fecha:** 2026-05-07
**Estado:** Fase 0 + Fases 2–5 completadas con datos mock

---

## Resumen

Se construyó el dashboard desde cero en esta carpeta (`bestemcells-app`), dado que el código anterior había sido eliminado en commits previos. La app arranca en modo mock (sin DriCloud ni Supabase) y ya es funcional en `http://localhost:3000`.

---

## Decisiones tomadas en esta sesión

| Tema | Decisión |
|---|---|
| Alcance | Solo el dashboard ERA (Opción B), sin reconstruir la app médica anterior |
| Carpeta | Misma carpeta `bestemcells-app` |
| Supabase | Pendiente — se construyó con datos mock mientras tanto |
| DriCloud | Pendiente — esperando credenciales y documentación API |

---

## Stack del proyecto

- **Next.js 14.2.5** (App Router, TypeScript)
- **Tailwind CSS 3.4.1**
- **Recharts 2.12** — gráficos (barras, donut)
- **Lucide React** — íconos del sidebar
- **@supabase/supabase-js** — instalado, pendiente de configurar
- **date-fns** — manejo de fechas
- **@tanstack/react-table** — pendiente de usar en tablas avanzadas

---

## Archivos creados

```
package.json                              ← dependencias del proyecto
tsconfig.json                             ← configuración TypeScript
next.config.mjs                           ← configuración Next.js
tailwind.config.ts                        ← configuración Tailwind
postcss.config.mjs                        ← PostCSS

app/
  globals.css                             ← estilos globales + variables de color
  layout.tsx                              ← layout raíz HTML
  page.tsx                                ← redirige / → /era
  era/
    layout.tsx                            ← sidebar de navegación (client component)
    page.tsx                              ← Overview con KPIs, verticales, gráficos
    agenda/page.tsx                       ← Agenda semanal con filtros
    profesionales/page.tsx                ← Tabla de performance por profesional
    profesionales/[id]/page.tsx           ← Drill-down individual
    embudos/page.tsx                      ← Heatmap horario + alertas de pico

lib/era/
  types.ts                                ← tipos TypeScript (Cita, Profesional, etc.)
  mock-data.ts                            ← todos los datos del HTML de referencia
  verticals.ts                            ← colores, etiquetas y emojis por vertical

components/era/
  KpiCard.tsx                             ← tarjeta de KPI reutilizable
  VerticalBadge.tsx                       ← badge de color por vertical

supabase/migrations/
  20260501_era_tables.sql                 ← migración completa con RLS restringido a tu email

vercel.json                               ← cron nocturno a las 03:00 ART
```

---

## Rutas del dashboard

| Ruta | Qué muestra |
|---|---|
| `/era` | Overview: 6 KPIs, distribución por 7 verticales, gráfico de barras por día, donut, próximas citas, comparativo Sem1 vs Sem2 |
| `/era/agenda` | Agenda semanal por columna de día · filtros por vertical y profesional · resaltado PV (amarillo) y VIP |
| `/era/profesionales` | Tabla de los 11 médicos ordenable por turnos / asistencia / ocupación / PV / VIP |
| `/era/profesionales/[id]` | Drill-down: KPIs propios, verticales que atiende, todas sus citas de la semana |
| `/era/embudos` | Heatmap día×hora · alertas automáticas para franjas con ≥12 turnos |
| `/era/config` | Mapeo vertical por profesional (editable), historial de sync, botón "Sincronizar ahora" |

---

## Datos mock

Los datos provienen del archivo `dashboard_semana_13abril_2026.html` (referencia visual original):

- **Semana:** 13–17 Abril 2026
- **Visitas únicas:** 118 · Asistencia: 88.3% · PV: 23 · VIP: 9 · Cancelados: 17
- **Verticales:** Sueroterapia 35 (27.3%), Dolor 33 (25.8%), Longevidad 26 (20.3%), Estudios 11 (8.6%), Nutrición 10 (7.8%), Kinesiología 9 (7%), Estética 4 (3.1%)
- **Profesionales:** Ayala Vázquez, Saravia Toledo, Garbelino Moliné, Ficcadenti, Rollán, Vanetta, Camilli, Cornejo, Hiese, Ottonello, Sabaté
- **Turnos por día:** Lun 29, Mar 27, Mié 20, Jue 19, Vie 22

---

## Cómo levantar el servidor

```bash
npm run dev
```

Luego abrir `http://localhost:3000` en el navegador.

---

## Pendientes para conectar datos reales

### 1. Supabase

Crear el archivo `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Luego correr la migración pegando el contenido de `supabase/migrations/20260501_era_tables.sql` en el SQL Editor de Supabase.

### 2. DriCloud

Contactar `info@dricloud.com` para pedir:
1. Documentación técnica completa (Swagger / Postman)
2. Credenciales de acceso de la clínica
3. Confirmación de campos para verticales y horarios de profesionales

Una vez obtenidas, se crean:
- `lib/dricloud/client.ts` — wrapper de autenticación y fetch
- `lib/dricloud/types.ts` — tipos de la respuesta
- `lib/dricloud/sync.ts` — lógica extract → transform → upsert
- `app/api/era/sync/route.ts` — endpoint del cron nocturno

### 3. Fases pendientes del plan

| Fase | Estado |
|---|---|
| 0. Setup (proyecto + librerías) | ✅ Completo |
| 1. Ingesta DriCloud + cron | ⏳ Bloqueado por credenciales DriCloud |
| 2. Overview + Agenda | ✅ Completo (con mock) |
| 3. Profesionales + drill-down | ✅ Completo (con mock) |
| 4. Embudos + heatmap | ✅ Completo (con mock) |
| 5. Configuración | ✅ Completo (con mock) |
| 6. Comparativos avanzados (tendencia histórica) | ⏳ Pendiente |

---

## Notas técnicas relevantes

- `page.tsx` del overview fue modificado para consumir `/api/era/dashboard` (API route) en lugar de importar los mocks directamente — preparado para cuando se conecte Supabase.
- `@supabase/supabase-js` ya está en el `package.json` (instalado como devDependency, mover a dependencies cuando se active).
- El cron en `vercel.json` está configurado a las 06:00 UTC = 03:00 ART.
- RLS en Supabase restringido únicamente a `santificca@hotmail.com`.
