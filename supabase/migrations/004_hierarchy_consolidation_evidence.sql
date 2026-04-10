-- Jerarquía organizativa, fuentes de consolidación y vínculo evidencia–requisito

CREATE TABLE IF NOT EXISTS public.organizational_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.organizational_hierarchy(id) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN (
    'region', 'country', 'state', 'city', 'business_unit', 'subsidiary', 'facility'
  )),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_hierarchy_org ON public.organizational_hierarchy (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_hierarchy_parent ON public.organizational_hierarchy (parent_id);

CREATE TABLE IF NOT EXISTS public.consolidation_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  datapoint_id UUID NOT NULL REFERENCES public.datapoints(id) ON DELETE CASCADE,
  hierarchy_id UUID REFERENCES public.organizational_hierarchy(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  source_type TEXT,
  hierarchy_path TEXT[],
  responsible_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_ids TEXT[],
  evidence_summary JSONB,
  last_updated TIMESTAMPTZ,
  last_updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consolidation_sources_org ON public.consolidation_sources (organization_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_sources_dp ON public.consolidation_sources (datapoint_id);

ALTER TABLE public.evidence_files ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.disclosure_requirements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_requirement ON public.evidence_files (requirement_id);
