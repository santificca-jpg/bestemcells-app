# BestEmCells — Plataforma Educativa Médica

Aplicación web construida con **Next.js 14**, **Supabase** y **Tailwind CSS** para la gestión de clases grabadas, notificaciones y quiz de ingreso para médicos.

---

## Estructura de la app

```
app/
├── auth/login          → Inicio de sesión
├── auth/register       → Registro de médicos
├── dashboard/          → Panel del médico
│   ├── classes         → Biblioteca de clases
│   ├── notifications   → Notificaciones recibidas
│   └── quiz            → Quiz de ingreso
└── admin/              → Panel de administración
    ├── classes         → CRUD de clases/videos
    ├── notifications   → Envío de avisos
    └── users           → Gestión de usuarios
```

---

## Instalación local

```bash
# 1. Clonar / descomprimir el proyecto
cd BeStemcells-app

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de variables de entorno
cp .env.local.example .env.local
# → Completar con tus credenciales de Supabase (ver sección siguiente)

# 4. Correr en modo desarrollo
npm run dev
# Abrir http://localhost:3000
```

---

## Paso 1 — Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Elegir nombre, contraseña de base de datos y región (recomendado: `South America (São Paulo)`)
3. Esperar que se provisione el proyecto (~2 min)

---

## Paso 2 — Ejecutar el schema SQL

1. En el panel de Supabase ir a **SQL Editor** → **New query**
2. Copiar el contenido completo de `supabase/schema.sql`
3. Hacer clic en **Run**

Esto crea todas las tablas, políticas RLS y 5 preguntas de quiz de ejemplo.

---

## Paso 3 — Copiar las credenciales

1. En Supabase ir a **Settings** → **API**
2. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Pegar en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Paso 4 — Crear el primer usuario administrador

El registro público siempre crea usuarios con rol `doctor`. Para tener un admin:

**Opción A — SQL (recomendado):**
1. Registrarse normalmente desde `/auth/register`
2. En Supabase → **SQL Editor** ejecutar:

```sql
update public.profiles
set role = 'admin'
where email = 'tu@email.com';
```

**Opción B — Table Editor:**
1. En Supabase → **Table Editor** → tabla `profiles`
2. Buscar tu usuario y editar el campo `role` a `admin`

---

## Paso 5 — Deploy en Vercel, hola 

### 5.1 Subir código a GitHub

```bash
git init
git add .
git commit -m "Initial commit — BestEmCells"
git remote add origin https://github.com/TU_USUARIO/bestemcells.git
git push -u origin main
```

### 5.2 Importar en Vercel

1. Ir a [vercel.com](https://vercel.com) → **Add New Project**
2. Importar el repositorio de GitHub
3. En **Environment Variables** agregar:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | tu URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key |

4. Hacer clic en **Deploy**

Vercel detecta Next.js automáticamente. No hace falta configurar nada más.

### 5.3 Configurar la URL del sitio en Supabase

1. En Supabase → **Authentication** → **URL Configuration**
2. **Site URL**: `https://tu-proyecto.vercel.app`
3. **Redirect URLs**: `https://tu-proyecto.vercel.app/**`

---

## Características

| Feature | Descripción |
|---------|-------------|
| **Auth** | Email/password con Supabase Auth + cookies SSR |
| **Roles** | `admin` y `doctor`, controlados por middleware |
| **Clases** | Videos YouTube/Vimeo embebidos, filtrables por categoría |
| **Notificaciones** | El admin envía avisos; los médicos los leen con indicador "Nuevo" |
| **Quiz** | Preguntas de opción múltiple, puntaje calculado, revisión de respuestas |
| **RLS** | Row Level Security activo en todas las tablas |

---

## Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=        # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Clave pública anónima
```

---

## Stack técnico

- **Next.js 14** — App Router, Server Components, Server Actions-ready
- **Supabase** — Auth, PostgreSQL, RLS
- **Tailwind CSS** — Estilos utilitarios con tema azul médico
- **Lucide React** — Iconografía
- **TypeScript** — Tipado estático en todo el proyecto
