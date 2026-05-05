/**
 * Alcance in/out multi-estándar (ESRS como guion) + orígenes de datos + indicadores ampliados.
 */
import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Filter,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Layers
} from 'lucide-react';
import type { StandardSection, Datapoint, User, DataOrigin } from '../types';
import { StandardType, Department, WorkflowStatus } from '../types';
import { useIndicatorScope } from '../hooks/useIndicatorScope';
import DataView from './DataView';

const ORIGIN_LABEL: Record<DataOrigin, string> = {
  questionnaire: 'Cuestionario',
  bulk_import: 'Carga masiva',
  erp: 'ERP',
  manual: 'Manual'
};

const ALL_ORIGINS: DataOrigin[] = ['questionnaire', 'bulk_import', 'erp', 'manual'];

type StandardFilter = 'all' | StandardType;

const STANDARD_CHIPS: { id: StandardFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: StandardType.ESRS, label: 'ESRS' },
  { id: StandardType.GRI, label: 'GRI' },
  { id: StandardType.ISSB, label: 'ISSB' },
  { id: StandardType.TCFD, label: 'TCFD' },
  { id: StandardType.SASB, label: 'SASB' }
];

type ScopeListFilter = 'all' | 'in' | 'out';

function matchesStandardFilter(dp: Datapoint, f: StandardFilter): boolean {
  if (f === 'all' || f === StandardType.ESRS) return true;
  const m = dp.mappings?.[f];
  return typeof m === 'string' && m.length > 0;
}

interface IndicatorsScopeWorkspaceProps {
  sections: StandardSection[];
  reportingYear: number;
  currentUser: User;
  users: User[];
  onUpdateDatapoint: (datapointId: string, updates: Partial<Datapoint>) => void;
  onAddDatapoint: (sectionId: string, datapoint: Datapoint) => void;
}

export const IndicatorsScopeWorkspace: React.FC<IndicatorsScopeWorkspaceProps> = ({
  sections,
  reportingYear,
  currentUser,
  users,
  onUpdateDatapoint,
  onAddDatapoint
}) => {
  const { getEntry, isInScope, setInScope, toggleOrigin, seedNewDatapoint } = useIndicatorScope();

  const [search, setSearch] = useState('');
  const [stdFilter, setStdFilter] = useState<StandardFilter>('all');
  const [scopeList, setScopeList] = useState<ScopeListFilter>('all');
  const [showAdd, setShowAdd] = useState(false);

  const [formSectionId, setFormSectionId] = useState(sections[0]?.id ?? '');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [formDept, setFormDept] = useState<Department>(Department.SUSTAINABILITY);
  const [formOrigins, setFormOrigins] = useState<DataOrigin[]>(['manual']);

  const flatRows = useMemo(() => {
    const out: { section: StandardSection; dp: Datapoint }[] = [];
    sections.forEach((s) => {
      s.datapoints.forEach((dp) => out.push({ section: s, dp }));
    });
    return out;
  }, [sections]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flatRows.filter(({ section, dp }) => {
      if (stdFilter !== 'all' && !matchesStandardFilter(dp, stdFilter)) return false;
      if (scopeList === 'in' && !isInScope(dp.id)) return false;
      if (scopeList === 'out' && isInScope(dp.id)) return false;
      if (!q) return true;
      return (
        dp.code.toLowerCase().includes(q) ||
        dp.name.toLowerCase().includes(q) ||
        section.code.toLowerCase().includes(q)
      );
    });
  }, [flatRows, search, stdFilter, scopeList, isInScope]);

  const sectionsForDataEntry = useMemo(() => {
    return sections
      .map((s) => ({
        ...s,
        datapoints: s.datapoints.filter((dp) => isInScope(dp.id))
      }))
      .filter((s) => s.datapoints.length > 0);
  }, [sections, isInScope]);

  const inCount = useMemo(
    () => flatRows.filter(({ dp }) => isInScope(dp.id)).length,
    [flatRows, isInScope]
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSectionId || !formCode.trim() || !formName.trim()) return;

    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dp-custom-${Date.now()}`;

    const datapoint: Datapoint = {
      id,
      code: formCode.trim(),
      name: formName.trim(),
      description: formDesc.trim() || formName.trim(),
      values: {},
      type: formType,
      status: WorkflowStatus.DRAFT,
      department: formDept,
      comments: [],
      mappings: { [StandardType.ESRS]: formCode.trim() },
      isCustom: true
    };

    onAddDatapoint(formSectionId, datapoint);
    seedNewDatapoint(id, formOrigins, StandardType.ESRS);

    setShowAdd(false);
    setFormCode('');
    setFormName('');
    setFormDesc('');
    setFormOrigins(['manual']);
  };

  const toggleFormOrigin = (o: DataOrigin) => {
    setFormOrigins((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full min-h-0">
      <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex gap-3">
            <div className="p-2 bg-[#0066ff]/20 rounded-lg h-fit">
              <Layers className="w-6 h-6 text-[#0066ff]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#66aaff]" />
                Alcance e indicadores (ESRS + otros estándares)
              </h2>
              <p className="text-sm text-[#6a6a6a] mt-1 max-w-3xl">
                El catálogo sigue la estructura <strong className="text-[#9a9a9a]">ESRS</strong> como guion.
                Activa o excluye indicadores del alcance del ejercicio, enlaza otros estándares (GRI, ISSB…)
                y define orígenes de datos (cuestionario, carga masiva, ERP). Puedes ampliar con indicadores
                propios bajo una sección ESRS.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0066ff] hover:bg-[#0052cc] text-white text-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4" />
            Añadir indicador
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-[#6a6a6a]" />
            <span className="text-xs text-[#6a6a6a] uppercase tracking-wide">Estándar</span>
            <div className="flex flex-wrap gap-1">
              {STANDARD_CHIPS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStdFilter(id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    stdFilter === id
                      ? 'bg-[#0066ff] border-[#0066ff] text-white'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9a9a9a] hover:border-[#0066ff]/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#6a6a6a]">Alcance</span>
            {(['all', 'in', 'out'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setScopeList(k)}
                className={`px-2.5 py-1 rounded text-xs font-medium border ${
                  scopeList === k
                    ? 'border-amber-500/80 bg-amber-500/10 text-amber-100'
                    : 'border-[#2a2a2a] text-[#9a9a9a] hover:border-[#2a2a2a]/80'
                }`}
              >
                {k === 'all' ? 'Todos' : k === 'in' ? 'En alcance' : 'Fuera'}
              </button>
            ))}
            <span className="text-xs text-[#5a5a5a] ml-1">
              {inCount}/{flatRows.length} en alcance
            </span>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre o sección ESRS…"
            className="w-full pl-10 pr-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder:text-[#5a5a5a] focus:outline-none focus:border-[#0066ff]"
          />
        </div>

        <div className="overflow-x-auto rounded border border-[#2a2a2a]">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead className="bg-[#0a0a0a] text-[#9a9a9a] text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 font-medium">Alcance</th>
                <th className="px-3 py-2 font-medium">ESRS / sección</th>
                <th className="px-3 py-2 font-medium">Indicador</th>
                <th className="px-3 py-2 font-medium">Otros estándares</th>
                <th className="px-3 py-2 font-medium">Orígenes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filteredRows.map(({ section, dp }) => {
                const inS = isInScope(dp.id);
                const entry = getEntry(dp.id);
                const mappingEntries = Object.entries(dp.mappings || {}).filter(
                  ([k]) => k !== StandardType.ESRS
                );
                return (
                  <tr key={dp.id} className="hover:bg-[#141414]">
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => setInScope(dp.id, !inS)}
                        className="flex items-center gap-1.5 text-xs font-medium text-white"
                        title={inS ? 'En alcance — clic para excluir' : 'Fuera de alcance — clic para incluir'}
                      >
                        {inS ? (
                          <ToggleRight className="w-8 h-8 text-[#00cc88]" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-[#6a6a6a]" />
                        )}
                        <span className={inS ? 'text-[#00cc88]' : 'text-[#6a6a6a]'}>
                          {inS ? 'In' : 'Out'}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2 align-top text-[#cccccc]">
                      <span className="font-mono text-xs text-[#66aaff]">{section.code}</span>
                      <div className="text-[11px] text-[#6a6a6a] truncate max-w-[140px]">{section.title}</div>
                      {dp.isCustom && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          Ampliado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-mono text-xs text-[#8a8a8a]">{dp.code}</div>
                      <div className="text-white font-medium">{dp.name}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        {mappingEntries.length === 0 ? (
                          <span className="text-xs text-[#5a5a5a]">—</span>
                        ) : (
                          mappingEntries.map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#cccccc]"
                            >
                              {k}: {String(v).slice(0, 12)}
                              {String(v).length > 12 ? '…' : ''}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {ALL_ORIGINS.map((o) => {
                          const on = entry.origins.includes(o);
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() => toggleOrigin(dp.id, o)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                on
                                  ? 'border-[#0066ff] bg-[#0066ff]/20 text-white'
                                  : 'border-[#2a2a2a] text-[#6a6a6a] hover:border-[#3a3a3a]'
                              }`}
                            >
                              {ORIGIN_LABEL[o]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <div className="text-center py-8 text-[#6a6a6a] text-sm">Ningún indicador coincide con los filtros.</div>
          )}
        </div>
      </div>

      <div className="border-t border-[#2a2a2a] pt-2">
        <p className="text-xs text-[#6a6a6a] mb-3">
          Carga de valores: solo se listan indicadores <strong className="text-[#9a9a9a]">en alcance</strong> (puedes
          ampliar el alcance arriba).
        </p>
        {sectionsForDataEntry.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3a3a3a] bg-[#0a0a0a]/50 p-8 text-center text-sm text-[#6a6a6a]">
            Ningún indicador está en alcance. Incluye al menos uno en la tabla superior para habilitar la carga
            de valores aquí.
          </div>
        ) : (
          <DataView
            sections={sectionsForDataEntry}
            reportingYear={reportingYear}
            currentUser={currentUser}
            users={users}
            onUpdateDatapoint={onUpdateDatapoint}
            compactMode
          />
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
          <div
            className="w-full max-w-lg rounded-lg border border-[#2a2a2a] bg-[#121212] p-5 shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-indicator-title"
          >
            <h3 id="add-indicator-title" className="text-lg font-bold text-white mb-1">
              Añadir indicador al catálogo
            </h3>
            <p className="text-sm text-[#6a6a6a] mb-4">
              Se asocia a una sección ESRS existente. Los orígenes definen cómo planeas alimentar el dato.
            </p>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[#9a9a9a]">Sección ESRS</label>
                <select
                  value={formSectionId}
                  onChange={(e) => setFormSectionId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-sm"
                  required
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9a9a9a]">Código</label>
                  <input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-sm"
                    placeholder="p. ej. E1-CUSTOM-01"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9a9a9a]">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'quantitative' | 'qualitative')}
                    className="mt-1 w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-sm"
                  >
                    <option value="quantitative">Cuantitativo</option>
                    <option value="qualitative">Cualitativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9a9a9a]">Nombre</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-[#9a9a9a]">Descripción</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[#9a9a9a]">Área responsable</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value as Department)}
                  className="mt-1 w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-sm"
                >
                  {Object.values(Department).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-xs text-[#9a9a9a]">Orígenes de datos</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALL_ORIGINS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggleFormOrigin(o)}
                      className={`text-xs px-2 py-1 rounded border ${
                        formOrigins.includes(o)
                          ? 'border-[#0066ff] bg-[#0066ff]/20 text-white'
                          : 'border-[#2a2a2a] text-[#6a6a6a]'
                      }`}
                    >
                      {ORIGIN_LABEL[o]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded border border-[#2a2a2a] text-sm text-[#cccccc] hover:bg-[#1a1a1a]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#0066ff] text-white text-sm font-medium hover:bg-[#0052cc]"
                >
                  Crear indicador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicatorsScopeWorkspace;
