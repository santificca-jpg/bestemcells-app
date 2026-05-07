-- ERA Longevity Dashboard — Tablas en Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profesionales
CREATE TABLE era_professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dricloud_id TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  especialidad TEXT,
  vertical_default TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pacientes
CREATE TABLE era_patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dricloud_id TEXT UNIQUE NOT NULL,
  nombre_completo TEXT NOT NULL,
  dni_nif TEXT,
  primera_visita_fecha DATE,
  es_vip BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Servicios
CREATE TABLE era_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dricloud_id TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  vertical TEXT,
  duracion_min INT,
  es_primera_vez_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citas (tabla principal)
CREATE TABLE era_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dricloud_id TEXT UNIQUE NOT NULL,
  paciente_id UUID REFERENCES era_patients(id),
  profesional_id UUID REFERENCES era_professionals(id),
  servicio_id UUID REFERENCES era_services(id),
  fecha_hora TIMESTAMPTZ NOT NULL,
  duracion_min INT,
  estado TEXT NOT NULL CHECK (estado IN ('confirmada', 'asistio', 'cancelada', 'no-show')),
  vertical_calculada TEXT,
  es_primera_vez BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapeo vertical (configurable)
CREATE TABLE era_vertical_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN ('servicio', 'profesional')),
  match_id TEXT NOT NULL,
  vertical TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tipo, match_id)
);

-- Horarios de cada profesional (para calcular ocupación)
CREATE TABLE era_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesional_id UUID REFERENCES era_professionals(id),
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL
);

-- Bitácora de sync
CREATE TABLE era_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  appointments_synced INT DEFAULT 0,
  errors JSONB,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'ok', 'error'))
);

-- Índices para performance
CREATE INDEX idx_era_appointments_fecha ON era_appointments(fecha_hora);
CREATE INDEX idx_era_appointments_profesional ON era_appointments(profesional_id);
CREATE INDEX idx_era_appointments_paciente ON era_appointments(paciente_id);
CREATE INDEX idx_era_appointments_estado ON era_appointments(estado);

-- RLS: sólo el admin puede acceder
ALTER TABLE era_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_vertical_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE era_sync_log ENABLE ROW LEVEL SECURITY;

-- Política: sólo tu email accede
CREATE POLICY "solo admin" ON era_professionals FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
CREATE POLICY "solo admin" ON era_patients FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
CREATE POLICY "solo admin" ON era_services FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
CREATE POLICY "solo admin" ON era_appointments FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
CREATE POLICY "solo admin" ON era_vertical_mapping FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
CREATE POLICY "solo admin" ON era_schedules FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
CREATE POLICY "solo admin" ON era_sync_log FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
