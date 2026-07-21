# Aplicar Migraciones Manualmente en Supabase

Como no tengo acceso directo a la contraseña de PostgreSQL, vamos a aplicar las migraciones usando el Supabase SQL Editor.

## Paso 1: Abre el SQL Editor de Supabase

1. Ve a: https://supabase.com/dashboard/project/vsaloslsautitcsqonlq
2. **SQL Editor** (en el menú izquierdo)
3. Haz clic en **New Query**

## Paso 2: Copia y pega cada migración

### Migración 1: Profiles & Auth
Abre: `supabase/migrations/20240101000001_profiles_and_auth.sql`
Copia todo el contenido → pégalo en el SQL Editor → haz clic en **RUN**

Repite esto para cada archivo:
- `20240101000002_locations_and_inventory.sql`
- `20240101000003_experiments.sql`
- `20240101000004_legal_acceptance.sql`
- `20240101000005_experiment_items.sql`
- `20240101000006_availability_and_triggers.sql`
- `20240101000007_notifications.sql`
- `20240101000008_storage.sql`

**Si ves un error** (ej: "already exists"), puedes ignorarlo en algunos casos (tablas extensiones ya creadas). Continúa con la siguiente.

---

## Alternativa (Si tienes psql instalado localmente):

Obtén la connection string real desde Supabase Dashboard → Settings → Database → Connection string (URI)

Luego:
```bash
psql "[CONNECTION_STRING]" < supabase/migrations/20240101000001_profiles_and_auth.sql
psql "[CONNECTION_STRING]" < supabase/migrations/20240101000002_locations_and_inventory.sql
# ... etc para todos los archivos
```

---

Cuando termines las migraciones, ejecuta:
```bash
npx tsx scripts/seed-inventory.ts
```

Esto va a poblar el inventario desde el Excel.
