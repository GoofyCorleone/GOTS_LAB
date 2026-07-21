# GOTS Lab — Sistema de Inventario y Trazabilidad

**Estado**: ✅ **PRODUCCIÓN** — Todas las fases completadas

Sistema web de gestión de inventario óptico y trazabilidad de experimentos para el Grupo de Óptica y Tratamiento de Señales (GOTS) en la Universidad Industrial de Santander (UIS).

## Características Principales

✅ **Autenticación institucional** — Solo con email `@correo.uis.edu.co` (validación BD-level)  
✅ **Inventario navegable** — Por ubicación física (cajones/armarios) + búsqueda de nombre/referencia  
✅ **Reserva de equipos** — Con disponibilidad en tiempo real y control de concurrencia  
✅ **Responsabilidad legal** — Aceptación auditada e inmutable antes de cada experimento  
✅ **Multi-sesión** — Pausar y continuar experimentos en múltiples días  
✅ **Colaboración** — Invitar acompañantes o solicitar acceso a experimentos en curso  
✅ **Notificaciones** — Solicitudes, aprobaciones, finalizaciones (en app + email vía Resend)  

## Stack Técnico

| Componente | Tecnología | Versión | Notas |
|-----------|-----------|---------|-------|
| Frontend | Next.js App Router | 15 | Static export para GitHub Pages |
| Styling | Tailwind CSS + shadcn/ui | v4 + Radix | Tokens oklch (diseño institucional) |
| Backend | Supabase | - | PostgreSQL + Auth + Storage + Edge Functions |
| Hosting | GitHub Pages | - | Desplegado vía GitHub Actions |
| Email | Resend | - | Notificaciones transaccionales (capa gratuita) |

## Comenzar Rápido

### Requisitos
- Node.js 18+
- Cuenta Supabase (gratuita)
- Repositorio GitHub con permisos de secretos

### Instalación

```bash
git clone <repo-url>
cd GOTS_LAB

npm install

# Copiar variables de entorno
cp .env.local.example .env.local

# Editar con credenciales Supabase
# NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Desarrollo Local

```bash
npm run dev
# Abre http://localhost:3000
```

### Deploy a GitHub Pages

1. Agregar secrets en repositorio:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Hacer push a main — GitHub Actions auto-deploya a Pages (`/GOTS_LAB`)

### Comandos Útiles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Dev server (http://localhost:3000) |
| `npm run build` | Build estático a `./out` |
| `npm run start` | Servir build local |
| `npx supabase migration up` | Aplicar migraciones BD (local) |
| `npx tsx scripts/seed-inventory.ts` | Poblar inventario desde Excel |
| `npx supabase gen types typescript > src/lib/supabase/types.ts` | Regenerar tipos TypeScript |

## Estructura del Proyecto

```
src/
  app/                          # App Router (Next.js 15)
    page.tsx                   # Home
    login/, register/          # Auth
    experiments/new/           # Crear experimento (wizard 5 pasos)
    experiments/               # Historial (tablas activos/finalizados)
    experiments/detail/        # Detalle (continuar, sessiones, finalizar)
    accompany/                 # Buscar encargado, solicitar acceso
    inventory/                 # Catálogo (por ubicación + búsqueda)
    profile/                   # Perfil + notificaciones
  components/
    ui/                        # shadcn/ui (40+ componentes)
    layout/                    # Header, Footer
    experiments/, inventory/, accompany/
  lib/supabase/
    client.ts                  # Singleton Supabase browser client
    queries/                   # Reutilizable queries (CRUD, validación)
    types.ts                   # Auto-generated desde BD
  hooks/
    useAuth, useInventory, useExperimentWizard, ...
supabase/
  migrations/                  # 0001_*.sql ... 0010_*.sql
    - 0001: Profiles + auth trigger
    - 0002: Locations + Inventory items
    - 0003: Experiments + Sessions
    - 0004: Legal acceptance (immutable)
    - 0005: Experiment items + Sharing
    - 0006: Availability function + Concurrency trigger
    - 0007: Notifications + Email log
    - 0008: Storage policies
    - 0009: Multi-session support
    - 0010: Access request policies
  functions/send-email/        # Deno Edge Function (Resend)
scripts/
  seed-inventory.ts            # Parse Excel → Seed BD
```

## Seguridad

✅ **Row Level Security (RLS)** — Todas las tablas con policies que aíslan datos por usuario  
✅ **Email domain** — Enforced a nivel BD (imposible bypassear via API)  
✅ **Legal acceptance** — Tabla inmutable (REVOKE UPDATE/DELETE + RLS DENY)  
✅ **Inventory concurrency** — SELECT...FOR UPDATE previene double-booking  
✅ **Audit trail** — Registros inmutables de aceptación legal, solicitudes, finalizaciones  

→ Ver **[README-SECURITY.md](./README-SECURITY.md)** para auditoría completa y checklist E2E testing.

## Arquitectura de Estados

### Experimento

```
draft
  ↓ (legal acceptance + inventario)
in_progress
  ↓ (sesión 1 cerrada)
in_progress (sesión 2 abierta)
  ↓ (continuar N veces)
in_progress (sesión N abierta)
  ↓ (finalizar)
finished
```

- **draft**: Formulario en progreso
- **in_progress**: Activo, puede continuar (nuevas sesiones)
- **finished**: Completado, inventario liberado, correo-resumen enviado

### Disponibilidad de Inventario

La disponibilidad se calcula en tiempo real sin vistas materializadas:

```sql
quantity_available = quantity_total - SUM(reserved_qty)
```

Control de concurrencia via trigger `BEFORE INSERT/UPDATE` con `SELECT...FOR UPDATE`.

## Flujos de Usuario

### 1️⃣ Nuevo Experimento
1. Login con email institucional
2. Click "Nuevo Experimento"
3. Wizard de 5 pasos:
   - Información (título, encargado, acompañantes)
   - Aceptación legal (firma digital auditada)
   - Seleccionar equipos (con disponibilidad real)
   - Fechas (inicio/fin tentativas)
   - Resumen
4. Click "Empezar Experimento" → Crea sesión 1, status = in_progress

### 2️⃣ Continuar Experimento
1. Ir a "Mis Experimentos" → Tab Activos
2. Click en experimento → Detalle
3. "Continuar" → Re-abre el carrito (agregar/quitar equipos)
4. "Nueva Sesión" → Registra cierre de sesión actual, abre sesión N+1

### 3️⃣ Finalizar Experimento
1. En detalle del experimento
2. "Finalizar Experimento" → Valida que última sesión esté cerrada
3. Libera todo el inventario
4. Envía email-resumen al owner con equipos utilizados

### 4️⃣ Solicitar Acceso (Acompañar)
1. Ir a "Acompañar Experimento"
2. Buscar encargado (auto-complete)
3. Ver sus experimentos en curso
4. Click "Solicitar acceso" → Notificación al owner + correo
5. Owner aprueba/rechaza en "Mi Perfil" → Notificación al solicitante

## Variables de Entorno

### Desarrollo (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Producción (GitHub Secrets)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY` (para Edge Function, opcional en Phase 5)

## Implementación de Fases

| Fase | Enfoque | Estado | Commit |
|------|---------|--------|--------|
| **0** | Scaffold + migraciones | ✅ | 81a5ac8 |
| **1** | Auth + layout | ✅ | 69188ff |
| **2** | Inventario | ✅ | 16fabfc |
| **3** | Nuevo experimento | ✅ | 933c3f6 |
| **4** | Continuar + historial | ✅ | 08e06bf / 8e0eb8d |
| **5** | Acompañar + notificaciones | ✅ | f8adc77 / c502bff |
| **6** | Polish + seguridad | ✅ | e4cdd18 / b46cb48 |

## Testing

### Manual (Recomendado)

Seguir checklist en [README-SECURITY.md § 8](./README-SECURITY.md):
- 18 tests E2E que cubren RLS, dominio, legal gate, concurrencia

### Flujos Críticos a Validar

1. **Email domain**: Registrar `user@gmail.com` → BD rechaza ✓
2. **Legal gate**: Pasar a in_progress sin acceptance → Trigger bloquea ✓
3. **Inventory concurrency**: Dos usuarios × 1 item → Uno falla ✓
4. **RLS isolation**: User2 no ve items User1 pre-aprobación ✓

## Troubleshooting

### "Anon key doesn't have permissions..."
→ Revisar que `NEXT_PUBLIC_SUPABASE_ANON_KEY` esté en `.env.local`  
→ Verificar que el proyecto Supabase esté activo

### "Email not @correo.uis.edu.co"
→ Esperado — validación a nivel BD rechaza otros dominios

### "Build fails with dynamic routes"
→ Esperado con `output: "export"` — usamos query strings (`?id=...`) en lugar de `[id]`

## Deployment

### GitHub Pages (Automático)

1. GitHub Actions se dispara en cada push a main
2. Build estático generado
3. Desplegado a `https://github.com/repo/GOTS_LAB` (basePath="/GOTS_LAB")

Verificar en repositorio → Settings → Pages → Custom domain (si aplica)

### Supabase Production

1. Crear proyecto en supabase.com (capa gratuita incluida)
2. Correr todas las migraciones (`npx supabase migration up`)
3. Configurar GitHub Secrets con URLs/keys de producción
4. Opcional: Configurar Edge Function para send-email

## Notas para Futuros Desarrolladores

- **No modificar** el esquema de BD sin pasar por auditoría (CLAUDE.md § Security Checklist)
- **Siempre usar** queries en `lib/supabase/queries/` — evita SQL injection
- **Validar** RLS policies si agregas tablas nuevas
- **Respetar** restricción email domain — no es UX, es BD-level
- **Consultar** README-SECURITY.md antes de mergear cambios a auth/data-access

## Referencias

- 📖 [Supabase Docs](https://supabase.com/docs)
- 📖 [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- 📖 [Tailwind CSS v4](https://tailwindcss.com)
- 📖 [shadcn/ui](https://ui.shadcn.com)
- 🔗 [Sitio Institucional GOTS](https://gotsresearchgroup-beep.github.io/GOTS.github.io/)

## Licencia

Institucional — Para uso exclusivo del Grupo GOTS, UIS.

---

**Versión**: 1.0 (Producción)  
**Fecha**: 21 de julio, 2026  
**Responsable**: Grupo GOTS, UIS
