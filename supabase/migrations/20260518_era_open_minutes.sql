-- ERA Longevity Dashboard — Tabla de minutos abiertos por profesional/día
-- Permite calcular la tasa de ocupación de consultorio.
--
-- Cada fila guarda, para un profesional en una fecha dada, cuántos minutos
-- tuvo la agenda abierta (celdas verdes "cita free" en DriCloud).
-- Las horas cerradas y "asuntos propios" (cita closedHours) no se cuentan.
-- Si no hay fila para un (profesional, fecha) → ese día no tenía agenda.

CREATE TABLE era_open_minutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesional_id UUID REFERENCES era_professionals(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  minutos_libres INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profesional_id, fecha)
);

CREATE INDEX idx_era_open_minutes_fecha ON era_open_minutes(fecha);
CREATE INDEX idx_era_open_minutes_profesional ON era_open_minutes(profesional_id);

ALTER TABLE era_open_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo admin" ON era_open_minutes FOR ALL USING (auth.jwt() ->> 'email' = 'santificca@hotmail.com');
