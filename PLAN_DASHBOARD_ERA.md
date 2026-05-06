# Dashboard ERA Longevity — Plan de implementación

## Contexto

Necesitás un dashboard personal (sólo para vos como Director Médico) que muestre en un mismo lugar todo lo que pasa en el consultorio de ERA Longevity: agenda diaria/semanal, performance por profesional, ocupación, distinción de pacientes nuevos vs recurrentes, distribución por vertical (dolor, longevidad, estética, nutrición, kinesio, estudios) y embudos en horarios pico.

Hoy existe un HTML estático ([dashboard_semana_13abril_2026.html](dashboard_semana_13abril_2026.html)) que ya tiene el diseño base que querés. Vamos a reemplazarlo por un dashboard dinámico dentro de esta app Next.js, que sincronice una vez por noche con **DriCloud** (la fuente de la información del consultorio) y guarde los datos en Supabase para que la vista sea instantánea.

## Decisiones ya tomadas (resumen de tus respuestas)

| Tema | Decisión |
|---|---|
| Fuente de datos | DriCloud (API REST con login user/pass) |
| Ubicación | Sección nueva `/era` dentro de esta app (BeStemcells-app) |
| Refresco | Sync automático **1 vez por noche** |
| Privacidad | Nombres completos (uso 100% personal) |
| Primera vez vs recurrente | Inferido por historial (si no tenía cita previa, es PV) |
| Vertical (área) | Mapeo configurable: por servicio y/o por profesional |
| Métricas extra | Tasa PV → recurrente + cancelaciones/no-shows. Sin métricas económicas |
| Histórico | Completo desde que usan DriCloud |
| Capacidad / ocupación | Leída de horarios cargados en DriCloud por profesional |
| Comparativos | Semana vs semana, mes vs mes, tendencia histórica |
| Dispositivo | Desktop primario, mobile responsive como bonus |

---

## Arquitectura general (3 capas)

```
┌─────────────────────────────────────────────────────────────┐
│  1. INGESTA  (job nocturno)                                 │
│  Vercel Cron → /api/era/sync → DriCloud API → upsert en DB │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. DATOS  (Supabase Postgres con RLS)                      │
│  Tablas: era_appointments, era_patients, era_professionals, │
│  era_services, era_vertical_mapping, era_schedules,         │
│  era_sync_log                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. PRESENTACIÓN  (rutas Next.js bajo /era)                 │
│  Lee de Supabase (rápido, sin pegarle a DriCloud en vivo)   │
└─────────────────────────────────────────────────────────────┘
```

**Por qué guardar en Supabase y no leer DriCloud en vivo:**
- Velocidad: el dashboard abre en menos de 1 segundo en vez de esperar la API.
- Resiliencia: si DriCloud cae, vos seguís viendo los datos de la última noche.
- Histórico: podemos guardar series temporales y comparativos sin re-pedir todo cada vez.
- Costo: una sola llamada masiva por noche en lugar de miles de llamadas durante el día.

---

## Modelo de datos (nuevas tablas en Supabase)

Todas con prefijo `era_` para no mezclar con las existentes de BeStemcells. Acceso restringido por RLS sólo a tu usuario admin.

| Tabla | Qué guarda | Campos clave |
|---|---|---|
| `era_professionals` | Médicos / kinesiólogos / nutricionistas | `id`, `dricloud_id`, `nombre`, `especialidad`, `vertical_default`, `activo` |
| `era_patients` | Pacientes únicos | `id`, `dricloud_id`, `nombre_completo`, `dni_nif`, `primera_visita_fecha`, `es_vip` |
| `era_services` | Catálogo de servicios (ej: "Primera consulta dolor", "Kine sesión") | `id`, `nombre`, `vertical`, `duracion_min`, `es_primera_vez_flag` |
| `era_appointments` | Cada cita (la tabla principal) | `id`, `dricloud_id`, `paciente_id`, `profesional_id`, `servicio_id`, `fecha_hora`, `duracion_min`, `estado` (confirmada/cancelada/asistió/no-show), `vertical_calculada`, `es_primera_vez` |
| `era_vertical_mapping` | Reglas vos podés editar para mapear servicios/profesionales → vertical | `tipo` (servicio/profesional), `match_id`, `vertical` |
| `era_schedules` | Horario de trabajo de cada profesional (capacidad para ocupación) | `profesional_id`, `dia_semana`, `hora_inicio`, `hora_fin` |
| `era_sync_log` | Bitácora de cada sync nocturno (cuándo, qué trajo, errores) | `started_at`, `finished_at`, `appointments_synced`, `errors`, `status` |

**Cálculo de "primera vez"**: al sincronizar, marcamos `es_primera_vez = TRUE` si el paciente no tiene ninguna cita previa con estado "asistió". Se recalcula en el sync para que sea consistente.

**Cálculo de "vertical"**: prioridad → (1) regla específica del servicio en `era_vertical_mapping`, (2) regla del profesional, (3) `vertical_default` del profesional. Vos podés editar esto desde una pantalla de Configuración.

---

## Estructura de archivos (donde va cada cosa)

```
app/
  era/                             ← TODO el dashboard nuevo vive acá
    layout.tsx                     ← guard: solo tu email, sidebar lateral
    page.tsx                       ← Overview (home del dashboard)
    agenda/page.tsx                ← Vista diaria/semanal
    profesionales/page.tsx         ← Lista de médicos con KPIs
    profesionales/[id]/page.tsx    ← Drill-down de un profesional
    embudos/page.tsx               ← Horarios pico y heatmap
    config/page.tsx                ← Editar mapeos verticales y horarios
  api/era/
    sync/route.ts                  ← Endpoint del cron nocturno
    sync/manual/route.ts           ← Botón "Sincronizar ahora" (opcional)

lib/
  dricloud/
    client.ts                      ← Wrapper de la API DriCloud (login, fetch)
    types.ts                       ← Tipos TypeScript de la respuesta DriCloud
    sync.ts                        ← Lógica de sync (extract → transform → upsert)
  era/
    queries.ts                     ← Queries a Supabase para el dashboard
    kpis.ts                        ← Cálculo de KPIs (ocupación, PV→recurrente, etc.)
    verticals.ts                   ← Lógica de mapeo a verticales

components/era/
  KpiCard.tsx, AgendaWeek.tsx, ProfessionalRow.tsx,
  HourlyHeatmap.tsx, VerticalDonut.tsx, TrendLine.tsx, etc.

supabase/
  migrations/
    20260501_era_tables.sql        ← Crea todas las tablas era_*

vercel.json                        ← Configura el cron job nocturno
```

---

## KPIs y cómo se calculan

| KPI | Fórmula |
|---|---|
| **Visitas únicas (semana)** | `COUNT(DISTINCT paciente_id) WHERE estado='asistió'` |
| **Tasa de asistencia** | `asistió / (asistió + no-show)` |
| **Primera vez** | `COUNT WHERE es_primera_vez=TRUE AND estado='asistió'` |
| **Recurrentes** | `COUNT WHERE es_primera_vez=FALSE AND estado='asistió'` |
| **Tasa conversión PV→recurrente** | De los PV de un mes, cuántos volvieron en los 90 días siguientes |
| **Cancelaciones** | `COUNT WHERE estado='cancelada'` y `% sobre total` |
| **No-shows** | `COUNT WHERE estado='no-show'` y `% sobre total` |
| **Tasa de ocupación por médico** | `Σ(duracion_citas_confirmadas) / Σ(horas_trabajo_definidas)` |
| **Distribución por vertical** | `COUNT GROUP BY vertical_calculada` |
| **Embudos horarios** | `COUNT(citas) GROUP BY hora_del_dia` — heatmap día×hora |

Todos los KPIs se calculan en `lib/era/kpis.ts` con funciones puras testeables. La vista los consume vía Server Components (rápido, datos siempre frescos al render).

---

## Vistas del dashboard

### 1. Overview (`/era`)
- Banner con KPIs principales (6 cards, como en el HTML actual)
- Distribución por vertical (donut)
- Mini-agenda del día actual + próximos turnos
- Comparativo semana actual vs anterior
- Mini-tendencia (últimas 8 semanas)

### 2. Agenda (`/era/agenda`)
- Toggle: Vista **diaria** / **semanal** / **por profesional**
- Filtros: por vertical, por profesional, por estado
- Resaltado visual de PV (amarillo), VIP (badge), canceladas (tachado)
- Click en cita → modal con detalle del paciente y su historial reciente

### 3. Profesionales (`/era/profesionales`)
- Tabla con cada médico: turnos, ocupación, PV, recurrentes, no-shows
- Click → drill-down individual con su agenda, evolución mensual y verticales que atiende

### 4. Embudos horarios (`/era/embudos`)
- Heatmap día × hora (intensidad por cantidad de citas)
- Detección automática de "picos" (>X turnos simultáneos en una franja)
- Recomendaciones (ej: "Embudo 14:00–16:00, considerar pre-check 13:30")

### 5. Configuración (`/era/config`)
- Editar `era_vertical_mapping` (qué servicio/profesional cae en qué vertical)
- Ver/forzar última sincronización
- Ver `era_sync_log` (historial de syncs y errores)

---

## Sincronización nocturna con DriCloud

**Cron**: Vercel Cron Jobs disparando `/api/era/sync` todos los días a las 03:00 ART.

**Flujo del job**:
1. Login en DriCloud → obtener token de sesión.
2. Traer profesionales activos → upsert en `era_professionals`.
3. Traer especialidades / agendas → upsert horarios en `era_schedules`.
4. Traer citas del día anterior + próximos 60 días → upsert en `era_appointments`.
5. Traer pacientes nuevos detectados → upsert en `era_patients`.
6. Recalcular `es_primera_vez` y `vertical_calculada` para las citas afectadas.
7. Registrar resultado en `era_sync_log`. Si falla, retry con backoff y registrar error.

**Idempotencia**: todo es upsert por `dricloud_id`. Correr el sync dos veces no rompe nada.

**Backfill inicial**: la primera vez vamos a correrlo manualmente para traer todo el histórico desde que usás DriCloud (puede tardar minutos según volumen).

---

## Stack y librerías a sumar

| Librería | Para qué | Por qué |
|---|---|---|
| **Recharts** | Gráficos (donut, líneas, barras, heatmap) | Es la más usada en Next.js, fácil de estilar con Tailwind |
| **date-fns** | Manejo de fechas (semana ISO, comparativos) | Liviana, tree-shakeable |
| **@tanstack/react-table** | Tablas profesionales con sort/filter | Para la vista de profesionales |

Todo lo demás (Tailwind, Supabase, Next 14, TypeScript) ya está en el proyecto.

---

## Tarea bloqueante antes de programar: documentación DriCloud

La página pública de DriCloud lista los endpoints pero NO tiene specs técnicas (URLs exactas, formato JSON, paginación). Antes de implementar la capa de ingesta necesito que pidas a DriCloud (`info@dricloud.com`):

1. Documentación técnica completa de la API (Swagger/Postman si tienen).
2. Credenciales de acceso para tu clínica.
3. Confirmación de:
   - Si los servicios/agendas en DriCloud tienen un campo claro para distinguir verticales.
   - Si exponen los horarios cargados de cada profesional (para calcular ocupación).
   - Si tienen sandbox/datos de prueba.

Mientras tanto se puede avanzar con el frontend usando datos mock que después se reemplazan.

---

## Fases de implementación (orden sugerido)

| Fase | Qué se hace | Por qué primero |
|---|---|---|
| **0. Setup** | Pedir docs a DriCloud + crear migración con tablas vacías + sumar Recharts/date-fns | Bloqueante para todo lo demás |
| **1. Ingesta básica** | Cliente DriCloud + sync de profesionales/servicios/citas. Cron nocturno. | Sin datos no hay dashboard |
| **2. Overview + Agenda** | Páginas `/era` y `/era/agenda` con KPIs y vistas diaria/semanal | Es el 80% del valor — replica el HTML actual |
| **3. Profesionales + drill-down** | Vista por médico con su performance | Después del overview, esto es lo siguiente que más usás |
| **4. Embudos + heatmap** | Detección de horarios pico | Insight más fino, una vez que las vistas básicas funcionan |
| **5. Configuración** | Pantalla para editar mapeo verticales | Sólo necesario cuando quieras ajustar reglas |
| **6. Comparativos avanzados** | Mes vs mes, tendencia histórica con líneas | Refinamiento final |

Cada fase es independiente y entrega valor visible. Podés validar cada una antes de seguir.

---

## Trade-offs que vas a notar

- **Sync nocturno** → Si entra un turno nuevo a las 10am, no lo ves hasta mañana. Si esto molesta, después podemos sumar un botón "Sincronizar ahora" en `/era/config` (es 1 hora de trabajo extra).
- **Histórico completo en el primer sync** → puede tardar varios minutos la primera vez. Lo corremos manualmente fuera de horario.
- **Mapeo vertical configurable** → flexible pero requiere que vos lo configures una vez al principio (la pantalla `/era/config` lo hace simple).
- **Privacidad (nombres completos)** → asumimos que sólo vos accedés con tu login. Recomiendo activar 2FA en Supabase Auth para tu usuario.

---

## Verificación (cómo testear que todo funciona)

1. **Datos**: correr migración → tablas creadas, RLS activado, sólo tu email accede.
2. **Sync manual**: invocar `/api/era/sync` desde el navegador autenticado → ver `era_sync_log` con `status='ok'` y `appointments_synced > 0`.
3. **Overview**: abrir `/era` un lunes → KPIs coinciden con lo que ves en DriCloud (cruzar números a mano la primera semana).
4. **Agenda**: comparar `/era/agenda` con la vista semanal de DriCloud lado a lado.
5. **Primera vez**: tomar 3 pacientes que sabés que son nuevos → confirmar que aparecen marcados PV.
6. **Verticales**: revisar que cada cita tenga la vertical correcta. Si alguna está mal, ajustar regla en `/era/config`.
7. **Cron**: dejar pasar una noche → al día siguiente `era_sync_log` tiene la entrada nueva con `status='ok'`.
8. **Mobile**: abrir desde el celular → verificar que se ve usable (aunque optimizado para desktop).

---

## Archivos críticos a crear/modificar

- `supabase/migrations/20260501_era_tables.sql` (nuevo)
- `lib/dricloud/client.ts`, `lib/dricloud/sync.ts` (nuevos)
- `lib/era/kpis.ts`, `lib/era/queries.ts` (nuevos)
- `app/era/layout.tsx` + 5 páginas hijas (nuevos)
- `app/api/era/sync/route.ts` (nuevo)
- `vercel.json` (nuevo o modificar — agregar cron)
- `components/Sidebar.tsx` (modificar — sumar link "ERA Dashboard")
- `package.json` (modificar — sumar Recharts, date-fns, @tanstack/react-table)

El HTML estático actual queda como referencia visual y se elimina cuando el dashboard nuevo esté validado.
