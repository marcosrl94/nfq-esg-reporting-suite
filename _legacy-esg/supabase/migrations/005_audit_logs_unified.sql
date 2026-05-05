-- Unificar auditoría de aplicación en audit_logs (deprecar audit_events)

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_target_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_display_name TEXT;

ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);

DROP TABLE IF EXISTS public.audit_events;

-- Políticas audit_logs: lectura ampliada + inserción desde cliente autenticado
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "audit_logs_select_org_or_role" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Sustainability Lead'
    )
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Auditor'
    )
    OR organization_id IN (
      SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL
    )
  );

CREATE POLICY "audit_logs_insert_own_org" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NULL
    OR organization_id IN (
      SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL
    )
  );
