-- Restringe lectura de perfiles: misma organización o uno mismo (admins globales siguen viendo todo).

DROP POLICY IF EXISTS "Users can view all users" ON public.users;

CREATE POLICY "users_select_self_or_org_or_lead" ON public.users
  FOR SELECT TO authenticated
  USING (
    id::text = auth.uid()::text
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT u.organization_id
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.organization_id IS NOT NULL
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'Sustainability Lead'
    )
  );
