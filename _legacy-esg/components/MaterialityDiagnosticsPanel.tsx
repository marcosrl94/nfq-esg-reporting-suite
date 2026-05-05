/**
 * Herramienta de diagnóstico: umbrales parametrizables, cruce impacto/financiero vs indicadores esperados.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  Globe2
} from 'lucide-react';
import type { StandardSection } from '../types';
import { useMateriality } from '../contexts';
import {
  computeTopicDiagnostics,
  aggregateDiagnostics
} from '../services/materialityDiagnostics';

const EXPOSURE_STORAGE_KEY = 'nfq_materiality_exposure_v1';

interface MaterialityDiagnosticsPanelProps {
  sections: StandardSection[];
  reportingYear: number;
  /** Si se omiten, se leen desde la última evaluación en Doble materialidad (localStorage). */
  exposureSectors?: string[];
  exposureCountries?: string[];
}

const MaterialityDiagnosticsPanel: React.FC<MaterialityDiagnosticsPanelProps> = ({
  sections,
  reportingYear,
  exposureSectors: exposureSectorsProp,
  exposureCountries: exposureCountriesProp
}) => {
  const [storedExposure, setStoredExposure] = useState<{
    sectors: string[];
    countries: string[];
  }>({ sectors: [], countries: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPOSURE_STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { sectors?: string[]; countries?: string[] };
      setStoredExposure({
        sectors: Array.isArray(p.sectors) ? p.sectors : [],
        countries: Array.isArray(p.countries) ? p.countries : []
      });
    } catch {
      /* ignore */
    }
  }, []);

  const exposureSectors =
    exposureSectorsProp && exposureSectorsProp.length > 0
      ? exposureSectorsProp
      : storedExposure.sectors;
  const exposureCountries =
    exposureCountriesProp && exposureCountriesProp.length > 0
      ? exposureCountriesProp
      : storedExposure.countries;
  const {
    topics,
    hasAssessment,
    thresholds,
    setThresholds,
    criterion,
    setCriterion
  } = useMateriality();

  const rows = useMemo(
    () =>
      hasAssessment && topics.length > 0
        ? computeTopicDiagnostics(topics, sections, reportingYear, thresholds, criterion)
        : [],
    [topics, sections, reportingYear, thresholds, criterion, hasAssessment]
  );

  const summary = useMemo(() => aggregateDiagnostics(rows), [rows]);

  if (!hasAssessment || topics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#3a3a3a] bg-[#0a0a0a]/40 p-6 text-center text-sm text-[#6a6a6a]">
        Ejecuta la evaluación de materialidad (segmentos y geografías) para activar el diagnóstico de cobertura
        de indicadores y el cruce con umbrales de impacto y financiero.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Activity className="w-5 h-5 text-amber-400" />
          Diagnóstico de doble materialidad
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-[#6a6a6a]">
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {exposureSectors.length > 0 ? exposureSectors.join(', ') : 'Sin segmentos guardados'}
          </span>
          <span className="flex items-center gap-1">
            <Globe2 className="w-3.5 h-3.5" />
            {exposureCountries.length > 0 ? exposureCountries.join(', ') : 'Sin geografías guardadas'}
          </span>
        </div>
      </div>

      <p className="text-xs text-[#8a8a8a] leading-relaxed">
        Comprueba que los topics materiales (impacto y financiero) son coherentes con la profundidad de
        disclosure elegida y con la disponibilidad de indicadores en el catálogo para el ejercicio{' '}
        <strong className="text-[#cccccc]">{reportingYear}</strong>. Los umbrales son parametrizables para
        alinear el diagnóstico con la política de materialidad del grupo o filiales.
      </p>

      {/* Parámetros */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-white mb-3">
          <SlidersHorizontal className="w-4 h-4 text-[#0066ff]" />
          Umbrales y regla de materialidad
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-[#9a9a9a] uppercase tracking-wide">
              Materialidad de impacto (mín. {thresholds.impactMin})
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={thresholds.impactMin}
              onChange={(e) => setThresholds({ impactMin: Number(e.target.value) })}
              className="w-full mt-1 accent-[#00ff88]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#9a9a9a] uppercase tracking-wide">
              Materialidad financiera (mín. {thresholds.financialMin})
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={thresholds.financialMin}
              onChange={(e) => setThresholds({ financialMin: Number(e.target.value) })}
              className="w-full mt-1 accent-[#0066ff]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-[#6a6a6a]">Criterio frente a umbrales:</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-[#cccccc]">
            <input
              type="radio"
              name="mat-criterion"
              checked={criterion === 'both'}
              onChange={() => setCriterion('both')}
              className="accent-[#0066ff]"
            />
            Ambos ejes (impacto y financiero)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[#cccccc]">
            <input
              type="radio"
              name="mat-criterion"
              checked={criterion === 'either'}
              onChange={() => setCriterion('either')}
              className="accent-[#0066ff]"
            />
            Al menos un eje
          </label>
        </div>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded border border-[#2a2a2a] bg-[#0d0d0d] p-3">
          <p className="text-[10px] text-[#6a6a6a] uppercase">Topics evaluados</p>
          <p className="text-xl font-bold text-white">{summary.total}</p>
        </div>
        <div className="rounded border border-[#2a2a2a] bg-[#0d0d0d] p-3">
          <p className="text-[10px] text-[#6a6a6a] uppercase">Con disclosure activo</p>
          <p className="text-xl font-bold text-[#00cc88]">{summary.materialByDepth}</p>
        </div>
        <div className="rounded border border-[#2a2a2a] bg-[#0d0d0d] p-3">
          <p className="text-[10px] text-[#6a6a6a] uppercase">Cobertura media (datos)</p>
          <p className="text-xl font-bold text-white">{summary.avgCoverage}%</p>
        </div>
        <div className="rounded border border-[#2a2a2a] bg-[#0d0d0d] p-3">
          <p className="text-[10px] text-[#6a6a6a] uppercase">Topics con alertas</p>
          <p className={`text-xl font-bold ${summary.withFlags > 0 ? 'text-amber-400' : 'text-[#00cc88]'}`}>
            {summary.withFlags}
          </p>
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="overflow-x-auto rounded border border-[#2a2a2a]">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-[#0a0a0a] text-[#8a8a8a] uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2 font-medium">Topic / ESRS</th>
              <th className="px-2 py-2 font-medium">Impacto</th>
              <th className="px-2 py-2 font-medium">Financ.</th>
              <th className="px-2 py-2 font-medium">Umbral</th>
              <th className="px-2 py-2 font-medium">Profundidad</th>
              <th className="px-2 py-2 font-medium">Indic. esperados</th>
              <th className="px-2 py-2 font-medium">Con dato {reportingYear}</th>
              <th className="px-2 py-2 font-medium">Cob.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {rows.map((r) => (
              <tr key={r.topicId} className="hover:bg-[#141414]">
                <td className="px-2 py-2 align-top">
                  <div className="text-white font-medium max-w-[200px]">{r.topicName}</div>
                  <div className="font-mono text-[10px] text-[#66aaff] mt-0.5">{r.esrsCode}</div>
                </td>
                <td className="px-2 py-2 text-[#cccccc]">{r.impactScore}</td>
                <td className="px-2 py-2 text-[#cccccc]">{r.financialScore}</td>
                <td className="px-2 py-2">
                  {r.passesMaterialityRule ? (
                    <span className="text-[#00cc88] flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Sí
                    </span>
                  ) : (
                    <span className="text-[#6a6a6a]">No</span>
                  )}
                </td>
                <td className="px-2 py-2 text-[#cccccc]">{r.disclosureDepth}</td>
                <td className="px-2 py-2">{r.expectedDatapoints}</td>
                <td className="px-2 py-2">{r.datapointsWithData}</td>
                <td className="px-2 py-2 font-mono">{r.coveragePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alertas */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Alertas y comprobaciones
        </div>
        <ul className="space-y-2">
          {rows.map((r) =>
            r.flags.map((f, i) => (
              <li
                key={`${r.topicId}-${i}`}
                className="text-xs text-amber-100/90 bg-amber-500/10 border border-amber-500/25 rounded px-3 py-2"
              >
                <span className="font-medium text-amber-200">{r.topicName}: </span>
                {f}
              </li>
            ))
          )}
          {rows.every((r) => r.flags.length === 0) && (
            <li className="text-xs text-[#00cc88] flex items-center gap-2 bg-[#00cc88]/10 border border-[#00cc88]/25 rounded px-3 py-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Sin incoherencias detectadas con los umbrales actuales y el catálogo de indicadores.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MaterialityDiagnosticsPanel;
