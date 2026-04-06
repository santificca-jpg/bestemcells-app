-- ============================================================
-- BestEmCells — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text not null default '',
  role          text not null default 'doctor' check (role in ('admin', 'doctor')),
  quiz_completed boolean not null default false,
  quiz_score    integer,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Policies: users can read/update their own profile; admins can read all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 2. CLASSES ───────────────────────────────────────────────
create table if not exists public.classes (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null default '',
  video_url        text not null,
  video_type       text not null default 'youtube' check (video_type in ('youtube', 'vimeo')),
  category         text not null default '',
  duration_minutes integer,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id)
);

alter table public.classes enable row level security;

-- Authenticated users can read classes
create policy "Authenticated users can read classes"
  on public.classes for select
  using (auth.role() = 'authenticated');

-- Only admins can insert/update/delete
create policy "Admins can manage classes"
  on public.classes for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 3. NOTIFICATIONS ─────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  message    text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.notifications enable row level security;

create policy "Authenticated users can read notifications"
  on public.notifications for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage notifications"
  on public.notifications for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 4. NOTIFICATION READS ────────────────────────────────────
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.notification_reads enable row level security;

create policy "Users manage their own reads"
  on public.notification_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. QUIZ QUESTIONS ────────────────────────────────────────
create table if not exists public.quiz_questions (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  options      jsonb not null,   -- array of strings: ["opción A", "opción B", ...]
  correct_answer integer not null, -- 0-based index into options
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.quiz_questions enable row level security;

create policy "Authenticated users can read quiz questions"
  on public.quiz_questions for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage quiz questions"
  on public.quiz_questions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 6. QUIZ ATTEMPTS ─────────────────────────────────────────
create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  score        integer not null,
  answers      jsonb not null,
  passed       boolean not null default false,
  completed_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

create policy "Users can read own attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

create policy "Admins can read all attempts"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 7. SEED — Quiz questions de ejemplo ──────────────────────
insert into public.quiz_questions (question, options, correct_answer, order_index) values
(
  '¿Cuál es la característica principal de las células madre?',
  '["Capacidad de auto-renovación y diferenciación", "Producción exclusiva de glóbulos rojos", "Resistencia a la apoptosis", "Expresión de marcadores T"]',
  0, 1
),
(
  '¿Qué tipo de células madre se encuentran en la médula ósea?',
  '["Células madre embrionarias", "Células madre hematopoyéticas", "Células madre epidérmicas", "Células madre neurales"]',
  1, 2
),
(
  '¿Qué significa el término "pluripotente"?',
  '["Capaz de dar origen a todos los tejidos del cuerpo", "Capaz de renovarse indefinidamente", "Restringido a un solo linaje celular", "Con capacidad migratoria elevada"]',
  0, 3
),
(
  '¿Cuál es el marcador de superficie clásico de las células madre hematopoyéticas humanas?',
  '["CD3", "CD19", "CD34", "CD8"]',
  2, 4
),
(
  '¿Cuál de los siguientes procesos describe mejor la "diferenciación celular"?',
  '["División celular sin cambio de identidad", "Conversión de una célula en otra de distinto tipo y función", "Muerte programada de la célula", "Fusión de dos células"]',
  1, 5
)
on conflict do nothing;
