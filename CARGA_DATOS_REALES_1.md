# Carga de datos reales 1

**Fecha:** 2026-05-07  
**Proyecto:** BeStemcells-app / ERA Longevity Dashboard  
**Objetivo:** Reemplazar los datos mock del dashboard por datos reales provenientes de DriCloud.

---

## 1. Punto de partida

El dashboard tenía datos mock hardcodeados en `lib/era/mock-data.ts` (118 turnos de la semana del 13 al 17 de abril de 2026). El objetivo era conectarlo a datos reales.

### Credenciales configuradas

- **Supabase URL:** `https://ahpqrsibpxtgflcwipbo.supabase.co`
- **Supabase Anon Key (publishable):** `sb_publishable_aoWIQAHCnMjIUEXOMKQUDg_pLeKhkCt`
- **Supabase Service Role Key:** `[REDACTADA — guardada solo en .env.local]`

Guardadas en `.env.local` (gitignoreado).

---

## 2. Estado de Supabase

Se verificó que las tablas ya existían en Supabase (la migración `supabase/migrations/20260501_era_tables.sql` había sido ejecutada previamente). Las tablas disponibles son:

- `era_professionals` — doctores/profesionales
- `era_patients` — pacientes
- `era_services` — servicios (no se usa en el scraper)
- `era_appointments` — citas/turnos (tabla principal)
- `era_vertical_mapping` — mapeo de verticales configurable
- `era_schedules` — horarios de profesionales
- `era_sync_log` — bitácora de sincronizaciones

---

## 3. Integración con DriCloud

### API de DriCloud (descartada por costo)

Se analizó la documentación de la **DriCloud API v2.2**. El endpoint principal sería `GetCitasPacientes`. Sin embargo, la suscripción a la WebAPI requiere pago y no estaba activa:

```
{"Successful":false,"Html":"Error. Suscripción a WebAPI no activa."}
```

### Solución adoptada: Web Scraping con Playwright

Se optó por hacer scraping de la interfaz web de DriCloud con **Playwright** (browser headless), sin necesidad de API ni pagos.

**Credenciales de DriCloud:**
- URL clínica: `https://latam.dricloud.net/Dricloud_santiago_20737385`
- Usuario: `ficcadenti`
- Contraseña: `bestem2026`
- ID clínica: `20737`

---

## 4. Exploración de la interfaz de DriCloud

Se escribió un script explorador (`scripts/explore-dricloud.js`) que:
1. Hizo login exitoso en DriCloud
2. Detectó que la agenda está en `/Planning`
3. Guardó screenshots y HTML para análisis

### Estructura HTML de la página de Planning

La página `/Planning/?dateString=DD/MM/YYYY&tipo=1` muestra la agenda diaria dividida por consultorios (despachos).

**Estructura real:**
```html
<div id="despachoN">
  <div class="doctorAsignado drID">
    <h2>Dr./Dra. Apellido, Nombre (N. Especialidad)</h2>
  </div>
  <!-- puede haber más doctores asignados a distintas franjas horarias -->
  <ul>
    <li id="liXXX"
        title="Modificar/Eliminar cita HH:MM - Apellido, Nombre"
        class="cita occupy Abierto [PlanningBgLineasDiagonales]"
        data-width="MINUTOS"
        onclick="AltaEditCita('CPA_ID', 'SLOT_ID', 'HH:MM')">
    </li>
  </ul>
</div>
```

**Puntos clave:**
- El `SLOT_ID` en `AltaEditCita` corresponde al número en `class="doctorAsignado dr{SLOT_ID}"` → identifica el doctor.
- `data-width` = duración en minutos.
- `PlanningBgLineasDiagonales` en la clase = turno cancelado.
- Los `<li>` de citas están en un `<ul>` separado del div del doctor (son hermanos, no hijos).

### Mapeo de especialidades → verticales

| Especialidad en DriCloud | Vertical en dashboard |
|---|---|
| Regenerativa y Dolor | dolor |
| Longevidad y Wellness | longevidad |
| Rehabilitación Regenerativa | kinesiologia |
| Nutrición | nutricion |
| Kinesiología | kinesiologia |
| Estética | estetica |
| Sueroterapia | sueroterapia |

---

## 5. Script de sincronización

### Archivo: `scripts/sync-dricloud.js`

Dependencias instaladas:
- `playwright` (scraping del navegador)
- `@supabase/supabase-js` (cliente de base de datos)
- `dotenv` (lectura de `.env.local`)

### Uso

```bash
# Semana actual (lunes a viernes)
node scripts/sync-dricloud.js

# Un día puntual
node scripts/sync-dricloud.js 2026-04-13

# Rango de fechas
node scripts/sync-dricloud.js 2026-04-13 2026-04-17
```

### Flujo del script

1. Login en DriCloud (headless Chromium)
2. Por cada día hábil en el rango:
   - Navega a `/Planning/?dateString=DD/MM/YYYY&tipo=1`
   - Espera que carguen los bloques `[id^="despacho"]`
   - Extrae doctores (`doctorAsignado dr{ID}`) y sus nombres/especialidades
   - Extrae citas (`<li class="cita occupy ...">`)
3. Para cada cita:
   - Upsert del profesional en `era_professionals` (usando `dricloud_id = slot_id`)
   - Upsert del paciente en `era_patients` (usando nombre normalizado como `dricloud_id`)
   - Upsert de la cita en `era_appointments` (usando `CPA_ID` como `dricloud_id`)

### Consideraciones del parser

- **Bug encontrado y corregido:** el regex inicial asumía que el atributo `class` venía antes de `title` en el `<li>`, pero en el HTML real el orden es `title` primero. El regex corregido usa `[^>]*?` (lazy) para ser agnóstico al orden.
- **`es_primera_vez`:** se setea `false` por defecto (no es distinguible desde la UI de Planning).
- **`es_vip`:** se setea `false` por defecto (requiere marcado manual en Supabase).
- **`vertical_calculada`:** se infiere de la especialidad del doctor asignado.

---

## 6. Primera sincronización exitosa

```
=== Sync DriCloud → Supabase ===
Fechas: 04/05/2026 → 08/05/2026 (5 días hábiles)

Haciendo login en DriCloud...
Login OK ✓

  Cargando 04/05/2026...  → 41 turno(s)
  Cargando 05/05/2026...  → 44 turno(s)
  Cargando 06/05/2026...  → 37 turno(s)
  Cargando 07/05/2026...  → 28 turno(s)
  Cargando 08/05/2026...  → 39 turno(s)

✅ Sync completado
   Turnos sincronizados: 189
```

**189 turnos reales** de ERA Longevity cargados en Supabase.

---

## 7. Próximo paso

Conectar el dashboard (actualmente usando `lib/era/mock-data.ts`) para que lea los datos reales de las tablas de Supabase.
