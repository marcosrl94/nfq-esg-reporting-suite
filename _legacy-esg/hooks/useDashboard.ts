/**
 * Dashboard Hook - Para obtener datos del dashboard
 */
import { useMemo } from 'react';
import { StandardSection, WorkflowStatus, User, Department } from '../types';

interface DashboardKPIs {
  total: number;
  ready: number;
  atRisk: number;
  blocked: number;
}

interface ReadinessScore {
  dimension: 'function' | 'esrs';
  dimensionValue: string;
  score: number;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
}

export function useDashboard(
  sections: StandardSection[],
  currentUser: User,
  reportingYear: number
) {
  const kpis = useMemo<DashboardKPIs>(() => {
    let total = 0;
    let approved = 0;
    let review = 0;
    let locked = 0;

    sections.forEach(s => {
      s.datapoints.forEach(d => {
        total++;
        if (d.status === WorkflowStatus.APPROVED) approved++;
        else if (d.status === WorkflowStatus.REVIEW) review++;
        else if (d.status === WorkflowStatus.LOCKED) locked++;
      });
    });

    return {
      total,
      ready: approved,
      atRisk: review,
      blocked: locked
    };
  }, [sections]);

  const readinessByFunction = useMemo<ReadinessScore[]>(() => {
    const deptStats: Record<string, { total: number; approved: number; inProgress: number; blocked: number }> = {};
    
    Object.values(Department).forEach(d => {
      deptStats[d] = { total: 0, approved: 0, inProgress: 0, blocked: 0 };
    });

    sections.forEach(s => {
      s.datapoints.forEach(d => {
        if (deptStats[d.department]) {
          deptStats[d.department].total++;
          if (d.status === WorkflowStatus.APPROVED) {
            deptStats[d.department].approved++;
          } else if (d.status === WorkflowStatus.REVIEW) {
            deptStats[d.department].inProgress++;
          } else if (d.status === WorkflowStatus.LOCKED) {
            deptStats[d.department].blocked++;
          }
        }
      });
    });

    return Object.entries(deptStats)
      .filter(([_, stats]) => stats.total > 0)
      .map(([dept, stats]) => ({
        dimension: 'function' as const,
        dimensionValue: dept.split(' ')[0],
        score: Math.round((stats.approved / stats.total) * 100),
        total: stats.total,
        completed: stats.approved,
        inProgress: stats.inProgress,
        blocked: stats.blocked
      }));
  }, [sections]);

  const readinessByESRS = useMemo<ReadinessScore[]>(() => {
    const esrsStats: Record<string, { total: number; approved: number; inProgress: number; blocked: number }> = {};

    sections.forEach(s => {
      const standardCode = s.code.split(' ')[0]; // e.g., "ESRS E1" -> "ESRS"
      if (!esrsStats[standardCode]) {
        esrsStats[standardCode] = { total: 0, approved: 0, inProgress: 0, blocked: 0 };
      }

      s.datapoints.forEach(d => {
        esrsStats[standardCode].total++;
        if (d.status === WorkflowStatus.APPROVED) {
          esrsStats[standardCode].approved++;
        } else if (d.status === WorkflowStatus.REVIEW) {
          esrsStats[standardCode].inProgress++;
        } else if (d.status === WorkflowStatus.LOCKED) {
          esrsStats[standardCode].blocked++;
        }
      });
    });

    return Object.entries(esrsStats).map(([esrs, stats]) => ({
      dimension: 'esrs' as const,
      dimensionValue: esrs,
      score: Math.round((stats.approved / stats.total) * 100),
      total: stats.total,
      completed: stats.approved,
      inProgress: stats.inProgress,
      blocked: stats.blocked
    }));
  }, [sections]);

  const myTasks = useMemo(() => {
    return sections.flatMap(s =>
      s.datapoints
        .filter(
          d =>
            d.ownerId === currentUser.id &&
            d.status !== WorkflowStatus.APPROVED &&
            d.status !== WorkflowStatus.LOCKED
        )
        .map(d => ({
          id: d.id,
          code: d.code,
          name: d.name,
          status: d.status,
          department: d.department
        }))
    );
  }, [sections, currentUser]);

  return {
    kpis,
    readinessByFunction,
    readinessByESRS,
    myTasks
  };
}
