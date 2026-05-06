# Conversación — Plan Dashboard ERA Longevity

**Fecha:** 2026-05-06
**Proyecto:** BeStemcells-app
**Objetivo:** Diseñar un dashboard dinámico personal para el consultorio de ERA Longevity

---

## 1. Pedido inicial del usuario

> Necesito un dashboard detallado de todo lo que pasa en consultorio de ERA Longevity:
> - Agenda del día a día, semana a semana
> - Ver las agendas de cada profesional
> - Tasas de ocupación, métricas y KPIs, performance de cada médico
> - Poder distinguir pacientes de primera vez con pacientes que recurren
> - Distinguir el área/vertical (dolor, longevidad, estética, nutrición, kinesiología o estudios diagnósticos)
> - Detectar embudos en horarios pico de mayor asistencia al consultorio
>
> Este es un dashboard puramente personal, no para clientes ni staff.
> Quiero que sea dinámico y traiga de manera periódica datos de una fuente externa (software médico).
> En este proyecto ahora mismo hay un archivo html que representa la vista que quiero que emules (y mejores) en este programa. Esto proviene de una versión inicial que era estática pero sin lógica de programación.
>
> Formula un plan paso por paso, respeta una arquitectura fácil de entender para que a futuro sea mantenible y modificable y haceme preguntas sobre todos los detalles y dudas que tengas.
>
> Todavía no programes nada.

---

## 2. Exploración del código existente

Lancé dos agentes Explore en paralelo para entender:

### Stack actual de la app
- **Framework:** Next.js 14.2.5 (App Router)
- **Lenguaje:** TypeScript 5
- **DB:** Supabase (PostgreSQL) con RLS habilitado
- **Auth:** Supabase Authentication con roles `admin` | `doctor`
- **Estilos:** Tailwind CSS 3.4.1
- **Iconos:** Lucide-react
- **Sin librería de gráficos aún** — oportunidad para sumar Recharts
- **Admin por email** hardcodeado: `santificca@hotmail.com`

### Rutas existentes
- `/auth/login`, `/auth/register`
- `/dashboard` → home médico (clases, quiz, notificaciones)
- `/dashboard/classes`, `/dashboard/quiz`, `/dashboard/notifications`
- `/admin`, `/admin/users`, `/admin/classes`, `/admin/notifications`

### HTML estático existente
Archivo: `dashboard_semana_13abril_2026.html`

**Secciones detectadas:**
- Header con gradiente azul marino
- KPIs de la semana (visitas únicas 118, asistencia 88.3%, PV 23, VIP 9, cancelados 17, ingreso real 19.5%)
- Distribución por 7 verticales (Dolor, Longevidad, Sueroterapia, Estudios, Nutrición, Kinesiología, Estética)
- Agenda semanal con columnas por día (Lun-Vie)
- 11 profesionales (Ayala Vázquez, Saravia Toledo, Garbelino Moliné, Ficcadenti, etc.)
- Pacientes VIP, multi-turno, performance por profesional
- Embudos horarios (pico 14:00 con 24 turnos)
- Comparativo Sem 1 vs Sem 2
- Gráficos con Chart.js 4.4.1 (CDN)
- Datos hardcodeados, sin backend

---

## 3. Preguntas y respuestas (Ronda 1)

| Pregunta | Respuesta |
|---|---|
| Software médico fuente | **DriCloud** |
| Ubicación del dashboard | **Sección nueva dentro de esta app** |
| Frecuencia de actualización | **Una vez por día (de noche)** |
| Privacidad de pacientes | **Nombre completo, uso 100% personal** |

---

## 4. Investigación de DriCloud

Búsqueda web en `dricloud.com/api-software-medico/`:

- **API REST** con login usuario/contraseña cifrada
- Endpoints disponibles:
  - Login / Autenticación
  - Recuperación de clínicas, despachos, especialidades, doctores
  - Recuperación de disponibilidad de agenda
  - Citas: crear, modificar, eliminar, recuperar por paciente (NIF) y por fecha
  - Pacientes: crear, recuperar datos por NIF
  - Exportación de historial en Word
- **Limitaciones detectadas:** la web pública no tiene specs técnicas (URLs exactas, formato JSON, paginación, webhooks). Se necesita contactar a `info@dricloud.com` para documentación técnica completa y credenciales.
- **Seguridad:** protocolos LOPD, RGPD y HIPAA.

---

## 5. Preguntas y respuestas (Ronda 2)

| Pregunta | Respuesta |
|---|---|
| Cómo se identifica "primera vez" | **Por historial: si el paciente nunca tuvo cita antes** |
| Cómo se asigna la vertical | **Mixto: a veces por servicio, a veces por profesional** |
| Métricas de negocio | **Tasa conversión PV→recurrente + Cancelaciones/no-shows + Sólo operativas (sin económicas)** |
| Cuánto histórico | **Histórico completo desde que usan DriCloud** |

---

## 6. Preguntas y respuestas (Ronda 3)

| Pregunta | Respuesta |
|---|---|
| Capacidad para tasa de ocupación | **Horarios cargados en DriCloud por profesional** |
| Vistas comparativas | **Semana vs semana + Mes vs mes + Tendencia histórica** |
| Dispositivos | **Desktop principalmente, mobile como bonus** |

---

## 7. Plan final

Plan completo guardado en: [PLAN_DASHBOARD_ERA.md](PLAN_DASHBOARD_ERA.md)

### Resumen ejecutivo

**Arquitectura en 3 capas:**
1. **Ingesta** — Vercel Cron nocturno → DriCloud API → upsert en Supabase
2. **Datos** — 7 tablas nuevas con prefijo `era_` y RLS restringido
3. **Presentación** — rutas Next.js bajo `/era` que leen de Supabase (rápido)

**Tablas nuevas en Supabase:**
- `era_professionals`
- `era_patients`
- `era_services`
- `era_appointments` (la principal)
- `era_vertical_mapping` (configurable por vos)
- `era_schedules` (capacidad por profesional)
- `era_sync_log` (bitácora)

**Vistas del dashboard:**
1. `/era` — Overview con KPIs + donut + mini-agenda + comparativos
2. `/era/agenda` — Vista diaria/semanal/por profesional con filtros
3. `/era/profesionales` — Tabla con drill-down individual
4. `/era/embudos` — Heatmap día×hora + detección de picos
5. `/era/config` — Editar mapeo de verticales y ver sync log

**KPIs calculados:**
- Visitas únicas, tasa de asistencia
- Primera vez vs recurrentes (inferido por historial)
- Tasa conversión PV→recurrente (90 días)
- Cancelaciones y no-shows
- Tasa de ocupación por médico (citas / horario cargado)
- Distribución por vertical
- Embudos horarios

**Stack a sumar:**
- **Recharts** — gráficos
- **date-fns** — manejo de fechas
- **@tanstack/react-table** — tablas profesionales

**Fases de implementación:**
| Fase | Qué se hace |
|---|---|
| 0. Setup | Pedir docs DriCloud + migración tablas + sumar librerías |
| 1. Ingesta | Cliente DriCloud + sync nocturno |
| 2. Overview + Agenda | 80% del valor |
| 3. Profesionales + drill-down | Performance por médico |
| 4. Embudos + heatmap | Insights de horarios pico |
| 5. Configuración | Pantalla de mapeo verticales |
| 6. Comparativos avanzados | Tendencias, mes vs mes, YoY |

**Tarea bloqueante antes de programar la ingesta:**
Contactar `info@dricloud.com` para pedir:
1. Documentación técnica completa (Swagger/Postman)
2. Credenciales de la clínica
3. Confirmar exposición de horarios y verticales

**Trade-offs declarados:**
- Sync nocturno → un turno nuevo a las 10am no se ve hasta mañana (mitigable con botón "Sincronizar ahora" en `/era/config`).
- Histórico completo en primer sync → puede tardar minutos, se corre manual fuera de horario.
- Privacidad → asume acceso único con login, recomendado activar 2FA.

---

## 8. Estado actual

- Plan aprobado y guardado en [PLAN_DASHBOARD_ERA.md](PLAN_DASHBOARD_ERA.md)
- Pendiente: contactar DriCloud para documentación API
- Próximo paso sugerido: Fase 0 (migración tablas + setup librerías) en paralelo al contacto con DriCloud

---

## Archivos relevantes

- [dashboard_semana_13abril_2026.html](dashboard_semana_13abril_2026.html) — diseño base estático (referencia visual)
- [PLAN_DASHBOARD_ERA.md](PLAN_DASHBOARD_ERA.md) — plan completo de implementación
- [CLAUDE.md](CLAUDE.md) — instrucciones del proyecto (idioma, perfil del usuario, modo de colaboración)
