# ADR-0002 · Un único proyecto Supabase para GEShop

- Estado: **Aceptada**
- Fecha: 2026-05-04
- Decisor: Marcos
- Contexto del plan: §7.2 y §10 de [PLAN_MEGA_SUITE_ESG.md](../../../PLAN_MEGA_SUITE_ESG.md)

## Contexto

`nfq-carbon-intelligence` corre en el proyecto Supabase `wvxhreyogkmfthmioird`. Para GEShop podríamos:

- (a) Reusar ese proyecto y migrar incremental.
- (b) Crear un proyecto Supabase nuevo `geshop-prod` y, opcionalmente, otro `geshop-dev`.
- (c) Crear un proyecto por entorno (dev/staging/prod).

## Decisión

**Opción (b) refinada:** **un único proyecto Supabase `geshop` (ref: `dkfwfculonlnhoabxszw`)** con uso de **branches de Supabase** para entornos efímeros y dev. Sin staging dedicado hasta v2.

**Proyecto creado por Marcos:** [`dkfwfculonlnhoabxszw`](https://supabase.com/dashboard/project/dkfwfculonlnhoabxszw).

Razones:

1. **Carbon en prod sigue intocable** durante la reescritura (decisión Marcos 2026-05-04: mantenimiento mínimo). Carbon vive en proyecto distinto: `wvxhreyogkmfthmioird`.
2. **Branches de Supabase** dan entornos aislados sin coste de proyecto adicional. Cada PR puede tener su propio branch con migraciones aplicadas para preview real.
3. **Sin piloto comprometido**, multiplicar proyectos es overhead innecesario. Cuando entre v2 con cliente, evaluamos staging dedicado.
4. **Residencia UE:** se asume que el proyecto se creó en región `eu-central-*` (UE). Verificar en el dashboard antes de F1.

## Plan de migraciones (F1)

```bash
# Desde la raíz del repo, una vez linkado al proyecto:
supabase link --project-ref dkfwfculonlnhoabxszw

cp ../nfq-carbon-intelligence/supabase/migrations/*.sql supabase/migrations/
supabase db push     # aplica las 21 migraciones al proyecto dkfwfculonlnhoabxszw
```

Las 21 migraciones de carbon ya están probadas y son canónicas. No se reescriben — se aplican tal cual. Las migraciones nuevas de F2+ siguen el patrón `YYYYMMDDHHMMSS_descripcion.sql`.

## Alternativas consideradas

- **Reusar el proyecto de carbon** (opción a). Riesgo: una migración rota en GEShop tira el carbon de prod. Descartada.
- **3 proyectos (dev/staging/prod)** (opción c). Sobreingeniería para el momento actual. Reabrir cuando entre piloto.

## Consecuencias

- ✅ Carbon en prod no se ve afectado por nada que pase en GEShop.
- ✅ Los devs trabajan contra un branch personal, no contra prod.
- ✅ La residencia UE queda fijada desde el inicio (no requiere migración futura).
- ⚠️ Necesitamos disciplina con migraciones: nada se aplica a `main` sin pasar por un branch primero.
- ⚠️ El `service_role_key` es ultra-sensible — vive solo en `.env.local` (gitignored) y en secrets de Vercel/Supabase.
