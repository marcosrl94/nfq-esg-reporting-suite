-- RLS por organización en tablas nuevas y refuerzo en existentes

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disclosure_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_crosswalk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizational_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidation_sources ENABLE ROW LEVEL SECURITY;

-- Catálogo de marcos y requisitos: lectura para usuarios autenticados
CREATE POLICY "frameworks_read_authenticated" ON public.reporting_frameworks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "disclosure_requirements_read_authenticated" ON public.disclosure_requirements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "crosswalk_read_authenticated" ON public.requirement_crosswalk
  FOR SELECT TO authenticated USING (true);

-- Organización: solo la propia (o sin fila si aún no migrado)
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead'
    )
  );

CREATE POLICY "reporting_cycles_select_org" ON public.reporting_cycles
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead'
    )
  );

CREATE POLICY "org_hierarchy_select_org" ON public.organizational_hierarchy
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead'
    )
  );

CREATE POLICY "consolidation_sources_select_org" ON public.consolidation_sources
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead'
    )
  );

CREATE POLICY "consolidation_sources_write_org" ON public.consolidation_sources
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead'
    )
  )
  WITH CHECK (
    organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead'
    )
  );

-- Datapoints: añadir filtro por organización a las políticas existentes (reemplazo)
DROP POLICY IF EXISTS "Users can view datapoints" ON public.datapoints;
CREATE POLICY "Users can view datapoints" ON public.datapoints
  FOR SELECT USING (
    (
      organization_id IS NULL
      OR organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead')
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id::text = auth.uid()::text
        AND public.users.role = 'Sustainability Lead'
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE public.users.id::text = auth.uid()::text
          AND public.users.role = 'Data Owner'
          AND public.users.department = datapoints.department
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE public.users.id::text = auth.uid()::text
          AND public.users.role = 'Auditor'
        )
        AND datapoints.status IN ('Approved', 'Locked')
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert datapoints in their department" ON public.datapoints;
CREATE POLICY "Users can insert datapoints in their department" ON public.datapoints
  FOR INSERT WITH CHECK (
    (
      organization_id IS NULL
      OR organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead')
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id::text = auth.uid()::text
      AND (
        public.users.role = 'Sustainability Lead'
        OR (public.users.role = 'Data Owner' AND public.users.department = datapoints.department)
      )
    )
  );

DROP POLICY IF EXISTS "Users can update datapoints" ON public.datapoints;
CREATE POLICY "Users can update datapoints" ON public.datapoints
  FOR UPDATE USING (
    (
      organization_id IS NULL
      OR organization_id IN (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead')
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id::text = auth.uid()::text
      AND (
        public.users.role = 'Sustainability Lead'
        OR (
          public.users.role = 'Data Owner'
          AND (
            public.users.department = datapoints.department
            OR public.users.id = datapoints.owner_id
          )
        )
      )
    )
  );
