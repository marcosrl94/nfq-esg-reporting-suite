-- Multi-tenant: organizaciones y ciclos de reporting
-- Requiere extensión uuid (ya en schema base)

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

CREATE TABLE IF NOT EXISTS public.reporting_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reporting_cycles_org ON public.reporting_cycles (organization_id);

-- Organización por defecto para datos existentes
INSERT INTO public.organizations (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  '{"defaultCurrency":"EUR","defaultLanguage":"es"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reporting_cycles (organization_id, label, period_start, period_end, status)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'FY2024',
  '2024-01-01',
  '2024-12-31',
  'open'
WHERE NOT EXISTS (
  SELECT 1 FROM public.reporting_cycles rc
  WHERE rc.organization_id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1
);

-- Columnas en tablas existentes (si ya existen)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
UPDATE public.users SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.standards SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS reporting_cycle_id UUID REFERENCES public.reporting_cycles(id) ON DELETE SET NULL;

UPDATE public.datapoints d
SET organization_id = s.organization_id
FROM public.standards s
WHERE d.standard_id = s.id AND d.organization_id IS NULL;

UPDATE public.datapoints SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

UPDATE public.datapoints d
SET reporting_cycle_id = (
  SELECT rc.id FROM public.reporting_cycles rc
  WHERE rc.organization_id = d.organization_id
  ORDER BY rc.period_start DESC NULLS LAST
  LIMIT 1
)
WHERE d.reporting_cycle_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_datapoints_org ON public.datapoints (organization_id);
CREATE INDEX IF NOT EXISTS idx_datapoints_cycle ON public.datapoints (reporting_cycle_id);

-- Columnas opcionales alineadas con apiService / tipos frontend
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS consolidation_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS consolidation_method TEXT;
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS consolidation_sources JSONB;
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS consolidated_value JSONB;
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS breakdowns JSONB;
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS last_consolidated TIMESTAMPTZ;

ALTER TABLE public.materiality_assessments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.materiality_assessments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_materiality_org ON public.materiality_assessments (organization_id);
