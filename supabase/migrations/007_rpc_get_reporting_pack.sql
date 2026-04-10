-- RPC: paquete de reporting en una llamada (sustituye N+1 en cliente opcional)

CREATE OR REPLACE FUNCTION public.get_reporting_pack(
  p_organization_id uuid,
  p_reporting_cycle_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH dp AS (
    SELECT
      d.id,
      d.standard_id,
      jsonb_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'description', d.description,
        'values', d.values,
        'unit', d.unit,
        'type', d.type,
        'status', d.status,
        'owner_id', d.owner_id,
        'department', d.department,
        'updated_at', COALESCE(d.last_modified, d.updated_at),
        'evidence', COALESCE(d.evidence, '[]'::jsonb),
        'mappings', COALESCE(d.mappings, '{}'::jsonb),
        'ai_verification', d.ai_verification,
        'consolidation_enabled', d.consolidation_enabled,
        'consolidation_method', d.consolidation_method,
        'consolidation_sources', d.consolidation_sources,
        'consolidated_value', d.consolidated_value,
        'breakdowns', d.breakdowns,
        'last_consolidated', d.last_consolidated,
        'reporting_frequency', d.reporting_frequency,
        'assigned_to_user_id', d.assigned_to_user_id,
        'requirement_id', d.requirement_id,
        'comments', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', c.id,
                'user_id', c.user_id,
                'user_name', COALESCE(u.name, 'Unknown'),
                'text', c.text,
                'created_at', c.created_at
              ) ORDER BY c.created_at
            )
            FROM public.comments c
            LEFT JOIN public.users u ON u.id = c.user_id
            WHERE c.datapoint_id = d.id
          ),
          '[]'::jsonb
        )
      ) AS dp_json
    FROM public.datapoints d
    WHERE d.organization_id = p_organization_id
      AND (p_reporting_cycle_id IS NULL OR d.reporting_cycle_id IS NOT DISTINCT FROM p_reporting_cycle_id)
  ),
  by_std AS (
    SELECT
      s.id AS sid,
      s.code,
      s.title,
      COALESCE(
        jsonb_agg(dp.dp_json ORDER BY dp.dp_json->>'code') FILTER (WHERE dp.dp_json IS NOT NULL),
        '[]'::jsonb
      ) AS datapoints
    FROM public.standards s
    LEFT JOIN dp ON dp.standard_id = s.id
    WHERE (s.organization_id IS NULL OR s.organization_id = p_organization_id)
    GROUP BY s.id, s.code, s.title
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', sid,
        'code', code,
        'title', title,
        'datapoints', datapoints
      ) ORDER BY code
    ),
    '[]'::jsonb
  )
  FROM by_std;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporting_pack(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_reporting_pack IS 'Devuelve estándares con datapoints y comentarios anidados para una organización y ciclo opcional.';
