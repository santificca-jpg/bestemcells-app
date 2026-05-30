-- Agregar tipo_cita crudo (texto desde DriCloud, p.ej. "Primera consulta - Longevidad")
ALTER TABLE era_appointments
  ADD COLUMN IF NOT EXISTS tipo_cita TEXT;

-- Marcar pacientes históricos (importados desde Excel manual).
-- Si es_historico = true, el paciente NUNCA cuenta como primera vez,
-- aunque DriCloud diga "Primera consulta -" en el tipo de cita.
ALTER TABLE era_patients
  ADD COLUMN IF NOT EXISTS es_historico BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_era_patients_es_historico ON era_patients(es_historico);
CREATE INDEX IF NOT EXISTS idx_era_appointments_tipo_cita ON era_appointments(tipo_cita);
