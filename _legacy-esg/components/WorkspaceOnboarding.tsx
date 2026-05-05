import React, { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarRange, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import {
  setActiveOrganizationId,
  setActiveReportingCycleId,
  setWorkspaceOnboardingDone
} from '../services/dataPlane';

export interface WorkspaceOnboardingProps {
  defaultOrganizationId?: string | null;
  onComplete: () => void;
}

type OrgRow = { id: string; name: string };
type CycleRow = { id: string; label: string };

/**
 * Selección de organización y ciclo de reporting tras el login (Supabase).
 */
export const WorkspaceOnboarding: React.FC<WorkspaceOnboardingProps> = ({
  defaultOrganizationId,
  onComplete
}) => {
  const queryClient = useQueryClient();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [orgId, setOrgId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const run = async () => {
      setError(null);
      const { data, error: e } = await supabase.from('organizations').select('id,name').order('name');
      if (e) {
        setError(e.message);
        setLoading(false);
        return;
      }
      const list = (data || []) as OrgRow[];
      setOrgs(list);
      if (list.length === 1) {
        setOrgId(list[0].id);
      } else if (defaultOrganizationId && list.some((o) => o.id === defaultOrganizationId)) {
        setOrgId(defaultOrganizationId);
      }
      setLoading(false);
    };
    void run();
  }, [defaultOrganizationId]);

  useEffect(() => {
    if (!supabase || !orgId) {
      setCycles([]);
      return;
    }
    const run = async () => {
      const { data, error: e } = await supabase
        .from('reporting_cycles')
        .select('id,label')
        .eq('organization_id', orgId)
        .order('period_start', { ascending: false, nullsFirst: false });
      if (e) {
        setError(e.message);
        return;
      }
      const list = (data || []) as CycleRow[];
      setCycles(list);
      if (list.length === 1) setCycleId(list[0].id);
      else setCycleId('');
    };
    void run();
  }, [orgId]);

  const handleContinue = useCallback(() => {
    if (!orgId || !cycleId) return;
    setActiveOrganizationId(orgId);
    setActiveReportingCycleId(cycleId);
    setWorkspaceOnboardingDone(true);
    void queryClient.invalidateQueries({ queryKey: ['esg-sections'] });
    void queryClient.invalidateQueries({ queryKey: ['esg-users'] });
    onComplete();
  }, [orgId, cycleId, queryClient, onComplete]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{ background: '#000000', fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <p style={{ color: '#9ca3af', margin: 0 }}>Preparando espacio de trabajo…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0a0a0a', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div
        className="w-full max-w-md rounded-lg border p-8"
        style={{ borderColor: '#27272a', background: '#111113' }}
      >
        <h1 className="text-xl font-semibold text-white mb-1">Espacio de trabajo</h1>
        <p className="text-sm mb-6" style={{ color: '#a1a1aa' }}>
          Elige la organización y el ciclo de reporting para cargar datos.
        </p>

        {error && (
          <p className="text-sm mb-4" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}

        <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#71717a' }}>
          <Building2 className="inline w-4 h-4 mr-1 align-text-bottom" />
          Organización
        </label>
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="w-full mb-4 rounded px-3 py-2 text-sm text-white border"
          style={{ background: '#18181b', borderColor: '#3f3f46' }}
        >
          <option value="">Selecciona…</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#71717a' }}>
          <CalendarRange className="inline w-4 h-4 mr-1 align-text-bottom" />
          Ciclo de reporting
        </label>
        <select
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          disabled={!orgId || cycles.length === 0}
          className="w-full mb-6 rounded px-3 py-2 text-sm text-white border"
          style={{ background: '#18181b', borderColor: '#3f3f46' }}
        >
          <option value="">{cycles.length ? 'Selecciona…' : 'Sin ciclos disponibles'}</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!orgId || !cycleId}
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 rounded py-2.5 text-sm font-medium text-black disabled:opacity-40"
          style={{ background: '#e4e4e7' }}
        >
          Continuar
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
