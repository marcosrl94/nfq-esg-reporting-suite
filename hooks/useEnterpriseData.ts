import { useQuery } from '@tanstack/react-query';
import { fetchSections, fetchUsers, isApiConfigured } from '../services/apiService';
import { getActiveOrganizationId, getActiveReportingCycleId } from '../services/dataPlane';

export function useRemoteSectionsQuery(options?: { enabled?: boolean }) {
  const orgId = getActiveOrganizationId();
  const cycleId = getActiveReportingCycleId();
  const base = isApiConfigured() && (options?.enabled !== false);
  return useQuery({
    queryKey: ['esg-sections', orgId, cycleId],
    queryFn: () => fetchSections(),
    enabled: base,
    staleTime: 30_000,
    retry: 1
  });
}

export function useRemoteUsersQuery(options?: { enabled?: boolean }) {
  const orgId = getActiveOrganizationId();
  const base = isApiConfigured() && (options?.enabled !== false);
  return useQuery({
    queryKey: ['esg-users', orgId],
    queryFn: () => fetchUsers(),
    enabled: base,
    staleTime: 60_000,
    retry: 1
  });
}
