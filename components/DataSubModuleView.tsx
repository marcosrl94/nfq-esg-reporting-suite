/**
 * DataSubModuleView - Sub-módulo por big topic material (estilo Sygris)
 * KPIs, filtros, gráficos y tabla de indicadores
 */
import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Plus, FileText, ChevronLeft } from 'lucide-react';
import { StandardSection, Datapoint, WorkflowStatus } from '../types';
import {
  SubModuleConfig,
  BigTopicConfig,
  getDatapointsForSubModule
} from '../services/dataSubModulesConfig';
import DataInput from './DataInput';
import CarbonFootprintModule from './CarbonFootprintModule';

interface DataSubModuleViewProps {
  bigTopic: BigTopicConfig;
  subModule: SubModuleConfig;
  sections: StandardSection[];
  reportingYear: number;
  currentUser: import('../types').User;
  users: import('../types').User[];
  onUpdateDatapoint: (datapointId: string, updates: Partial<Datapoint>) => void;
  onBulkImportClick?: () => void;
  onBack?: () => void;
}

export const DataSubModuleView: React.FC<DataSubModuleViewProps> = ({
  bigTopic,
  subModule,
  sections,
  reportingYear,
  currentUser,
  users,
  onUpdateDatapoint,
  onBulkImportClick,
  onBack
}) => {
  const [selectedYear, setSelectedYear] = useState(reportingYear.toString());
  const [detailDatapointId, setDetailDatapointId] = useState<string | null>(null);

  const { section, datapoints } = useMemo(() => {
    const pairs = getDatapointsForSubModule(sections, subModule, bigTopic.sectionCode);
    if (pairs.length === 0) return { section: null, datapoints: [] };
    const first = pairs[0];
    const allDps = pairs.flatMap(p => p.datapoints);
    return { section: first.section, datapoints: allDps };
  }, [sections, subModule, bigTopic.sectionCode]);

  const kpis = useMemo(() => {
    const yearKey = selectedYear;
    const quantitative = datapoints.filter(d => d.type === 'quantitative');
    const withData = datapoints.filter(d => {
      const v = d.values?.[yearKey];
      return v !== null && v !== undefined && v !== '';
    });
    const approved = datapoints.filter(d => d.status === WorkflowStatus.APPROVED || d.status === WorkflowStatus.LOCKED);

    let scope1 = 0, scope2 = 0, scope3 = 0;
    quantitative.forEach(dp => {
      const v = Number(dp.values?.[yearKey]);
      if (!isNaN(v)) {
        if (dp.code.includes('E1-6-01')) scope1 += v;
        else if (dp.code.includes('E1-6-02')) scope2 += v;
        else if (dp.code.includes('E1-6-03')) scope3 += v;
      }
    });

    return {
      total: datapoints.length,
      withData: withData.length,
      approved: approved.length,
      scope1,
      scope2,
      scope3,
      totalCO2: scope1 + scope2 + scope3
    };
  }, [datapoints, selectedYear]);

  const chartData = useMemo(() => {
    const years = [reportingYear, reportingYear - 1, reportingYear - 2];
    return years.map(year => {
      const key = year.toString();
      const point: Record<string, string | number> = { year: key };
      datapoints.filter(d => d.type === 'quantitative').forEach(dp => {
        const v = dp.values?.[key];
        if (v !== null && v !== undefined) {
          point[dp.code] = Number(v);
        }
      });
      return point;
    }).reverse();
  }, [datapoints, reportingYear]);

  const tableRows = useMemo(() => {
    return datapoints.map(dp => {
      const val = dp.values?.[selectedYear];
      return {
        id: dp.id,
        code: dp.code,
        name: dp.name,
        value: val,
        unit: dp.unit,
        status: dp.status,
        department: dp.department,
        hasEvidence: dp.evidence && dp.evidence.length > 0
      };
    });
  }, [datapoints, selectedYear]);

  if (detailDatapointId && section) {
    const ordered = [...datapoints].sort((a, b) =>
      a.id === detailDatapointId ? -1 : b.id === detailDatapointId ? 1 : 0
    );
    const detailSection = { ...section, datapoints: ordered };
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setDetailDatapointId(null)}
          className="flex items-center gap-2 text-sm text-[#6a6a6a] hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al sub-módulo
        </button>
        <DataInput
          section={detailSection}
          onUpdateDatapoint={onUpdateDatapoint}
          currentUser={currentUser}
          users={users}
          reportingYear={reportingYear}
          onBulkImportClick={onBulkImportClick}
        />
      </div>
    );
  }

  if (!section || datapoints.length === 0) {
    return (
      <div className="p-8 text-center text-[#6a6a6a]">
        <p>No hay indicadores para este sub-módulo.</p>
        <p className="text-sm mt-2">Añade datapoints en la sección {bigTopic.sectionCode}.</p>
      </div>
    );
  }

  // Huella Carbono embebida: sub-módulo Emisiones GHG (E1-6)
  if (subModule.id === 'e1-emissions') {
    return (
      <div className="space-y-6">
        <CarbonFootprintModule sections={sections} reportingYear={reportingYear} />
        <div className="border-t border-[#2a2a2a] pt-6">
          <h3 className="text-sm font-semibold text-white mb-3">Indicadores detallados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-2 text-[#6a6a6a] font-medium">Código</th>
                  <th className="text-left px-4 py-2 text-[#6a6a6a] font-medium">Indicador</th>
                  <th className="text-left px-4 py-2 text-[#6a6a6a] font-medium">Valor</th>
                  <th className="text-left px-4 py-2 text-[#6a6a6a] font-medium">Estado</th>
                  <th className="text-left px-4 py-2 text-[#6a6a6a] font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(row => (
                  <tr key={row.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="px-4 py-2 font-mono text-[#6a6a6a]">{row.code}</td>
                    <td className="px-4 py-2 text-white">{row.name}</td>
                    <td className="px-4 py-2 text-white">{row.value !== null && row.value !== undefined ? `${row.value} ${row.unit || ''}` : '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        row.status === WorkflowStatus.APPROVED ? 'bg-green-500/20 text-green-400' :
                        row.status === WorkflowStatus.REVIEW ? 'bg-amber-500/20 text-amber-400' : 'bg-[#2a2a2a] text-[#6a6a6a]'
                      }`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => setDetailDatapointId(row.id)} className="text-[#0066ff] hover:underline text-xs">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setDetailDatapointId(datapoints[0]?.id || null)}
            className="mt-4 px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg text-sm font-medium"
          >
            Editar datos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera con KPIs */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[#6a6a6a] hover:text-white text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              {bigTopic.name}
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold text-white mb-4">{subModule.name}</h2>
        <p className="text-sm text-[#6a6a6a] mb-4">{subModule.description}</p>
        <div className="flex flex-wrap gap-4">
          <div className="px-4 py-2 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
            <span className="text-xs text-[#6a6a6a] block">Indicadores</span>
            <span className="text-lg font-bold text-white">{kpis.total}</span>
          </div>
          <div className="px-4 py-2 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
            <span className="text-xs text-[#6a6a6a] block">Con datos</span>
            <span className="text-lg font-bold text-green-500">{kpis.withData}</span>
          </div>
          <div className="px-4 py-2 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
            <span className="text-xs text-[#6a6a6a] block">Aprobados</span>
            <span className="text-lg font-bold text-white">{kpis.approved}</span>
          </div>
          {kpis.totalCO2 > 0 && (
            <div className="px-4 py-2 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
              <span className="text-xs text-[#6a6a6a] block">Total tCO2e</span>
              <span className="text-lg font-bold text-white">{kpis.totalCO2.toLocaleString('es-ES')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-[#6a6a6a]">Filtros:</span>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-white"
        >
          {[reportingYear, reportingYear - 1, reportingYear - 2].map(y => (
            <option key={y} value={y.toString()}>{y}</option>
          ))}
        </select>
      </div>

      {/* Gráficos */}
      {chartData.length > 0 && chartData.some(d => Object.keys(d).length > 1) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {subModule.chartType === 'area' ? (
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Evolución temporal</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="year" stroke="#6a6a6a" fontSize={11} />
                    <YAxis stroke="#6a6a6a" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    {Object.keys(chartData[0] || {}).filter(k => k !== 'year').map((key, i) => (
                      <Area key={key} type="monotone" dataKey={key} stackId="1" fill={`hsl(${200 + i * 40}, 70%, 40%)`} stroke={`hsl(${200 + i * 40}, 70%, 50%)`} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Por indicador</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis type="number" stroke="#6a6a6a" fontSize={11} />
                    <YAxis type="category" dataKey="year" stroke="#6a6a6a" fontSize={11} width={30} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a' }}
                    />
                    {Object.keys(chartData[0] || {}).filter(k => k !== 'year').map((key, i) => (
                      <Bar key={key} dataKey={key} fill={`hsl(${210 + i * 60}, 70%, 45%)`} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
          <h3 className="font-semibold text-white">Listado de indicadores</h3>
          <button
            onClick={() => setDetailDatapointId(datapoints[0]?.id || null)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Editar datos
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[#6a6a6a] font-medium">Código</th>
                <th className="text-left px-4 py-3 text-[#6a6a6a] font-medium">Indicador</th>
                <th className="text-left px-4 py-3 text-[#6a6a6a] font-medium">Valor {selectedYear}</th>
                <th className="text-left px-4 py-3 text-[#6a6a6a] font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-[#6a6a6a] font-medium">Evidencia</th>
                <th className="text-left px-4 py-3 text-[#6a6a6a] font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="px-4 py-2 font-mono text-[#6a6a6a]">{row.code}</td>
                  <td className="px-4 py-2 text-white">{row.name}</td>
                  <td className="px-4 py-2 text-white">
                    {row.value !== null && row.value !== undefined ? `${row.value} ${row.unit || ''}` : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      row.status === WorkflowStatus.APPROVED ? 'bg-green-500/20 text-green-400' :
                      row.status === WorkflowStatus.REVIEW ? 'bg-amber-500/20 text-amber-400' :
                      'bg-[#2a2a2a] text-[#6a6a6a]'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {row.hasEvidence ? (
                      <FileText className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="text-[#6a6a6a]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setDetailDatapointId(row.id)}
                      className="text-[#0066ff] hover:underline text-xs"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataSubModuleView;
