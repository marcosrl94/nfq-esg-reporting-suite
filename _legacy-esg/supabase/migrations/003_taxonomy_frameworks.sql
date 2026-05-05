-- Taxonomía parametrizable: marcos de reporting y requisitos de disclosure

CREATE TABLE IF NOT EXISTS public.reporting_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  label TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, version)
);

CREATE INDEX IF NOT EXISTS idx_reporting_frameworks_code ON public.reporting_frameworks (code);

CREATE TABLE IF NOT EXISTS public.disclosure_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID NOT NULL REFERENCES public.reporting_frameworks(id) ON DELETE CASCADE,
  stable_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'quantitative' CHECK (data_type IN ('quantitative', 'qualitative', 'narrative')),
  unit_hint TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, stable_code)
);

CREATE INDEX IF NOT EXISTS idx_disclosure_requirements_framework ON public.disclosure_requirements (framework_id);

CREATE TABLE IF NOT EXISTS public.requirement_crosswalk (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_requirement_id UUID NOT NULL REFERENCES public.disclosure_requirements(id) ON DELETE CASCADE,
  to_framework_code TEXT NOT NULL,
  to_code TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_requirement_id, to_framework_code, to_code)
);

CREATE INDEX IF NOT EXISTS idx_crosswalk_from ON public.requirement_crosswalk (from_requirement_id);

ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.disclosure_requirements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_datapoints_requirement ON public.datapoints (requirement_id);

INSERT INTO public.reporting_frameworks (code, version, label, metadata)
SELECT 'CSRD_ESRS', '2024-12', 'ESRS bajo CSRD', '{"reference":"CSRD / ESRS"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.reporting_frameworks WHERE code = 'CSRD_ESRS' AND version = '2024-12'
);

DO $$
DECLARE
  fid UUID;
BEGIN
  SELECT id INTO fid FROM public.reporting_frameworks WHERE code = 'CSRD_ESRS' AND version = '2024-12' LIMIT 1;
  IF fid IS NULL THEN RETURN; END IF;

  INSERT INTO public.disclosure_requirements (framework_id, stable_code, title, data_type, unit_hint)
  SELECT fid, x.code, x.tit, x.dt::text, x.u
  FROM (VALUES
    ('E1-1', 'Transition plan for climate change mitigation', 'qualitative', NULL::text),
    ('E1-6-01', 'Gross Scope 1 GHG emissions', 'quantitative', 'tCO2e'),
    ('E1-6-02', 'Gross Scope 2 GHG emissions (location-based)', 'quantitative', 'tCO2e'),
    ('E1-6-03', 'Gross Scope 3 GHG emissions', 'quantitative', 'tCO2e'),
    ('S1-9', 'Diversity indicators', 'quantitative', '%')
  ) AS x(code, tit, dt, u)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.disclosure_requirements dr
    WHERE dr.framework_id = fid AND dr.stable_code = x.code
  );
END $$;
