export type Vertical =
  | "longevidad"
  | "dolor"
  | "sueroterapia"
  | "estudios"
  | "nutricion"
  | "kinesiologia"
  | "estetica";

export type Estado = "asistio" | "cancelada" | "no-show" | "confirmada";

export interface Profesional {
  id: string;
  nombre: string;
  especialidad: string;
  vertical_default: Vertical;
  activo: boolean;
}

export interface Paciente {
  id: string;
  nombre_completo: string;
  es_vip: boolean;
  primera_visita_fecha: string;
}

export interface Cita {
  id: string;
  paciente: Paciente;
  profesional: Profesional;
  servicio: string;
  fecha_hora: string;
  duracion_min: number;
  estado: Estado;
  vertical: Vertical;
  es_primera_vez: boolean;
}

export interface KpiSemana {
  visitas_unicas: number;
  tasa_asistencia: number;
  primera_vez: number;
  vip: number;
  canceladas: number;
  no_shows: number;
  tasa_pv: number;
  vs_semana_anterior: {
    visitas_unicas: number;
    tasa_asistencia: number;
    primera_vez: number;
    vip: number;
    canceladas: number;
  };
}

export interface DistribucionVertical {
  vertical: Vertical;
  cantidad: number;
  porcentaje: number;
}

export interface TurnosDia {
  dia: string;
  fecha: string;
  cantidad: number;
}

export interface PerformanceProfesional {
  profesional: Profesional;
  turnos: number;
  asistidos: number;
  cancelados: number;
  no_shows: number;
  primera_vez: number;
  vip: number;
  tasa_asistencia: number;
  tasa_ocupacion: number;
}

export interface EmbudioHorario {
  hora: string;
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  total: number;
}
