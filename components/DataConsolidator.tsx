import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Users, Plus, Trash2, Edit2, Save, X, TrendingUp, PieChart as PieChartIcon,
  BarChart3, MapPin, Building2, Factory, CheckCircle, AlertCircle, FileCheck
} from 'lucide-react';
import { ConsolidatedDatapoint, ConsolidationSource, ConsolidationConfig, User } from '../types';
import {
  consolidateValues,
  validateConsolidationSources,
  generateConsolidationSummary
} from '../services/consolidationService';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMobile } from '../hooks/useMobile';
import SourceEvidenceManager from './SourceEvidenceManager';

interface DataConsolidatorProps {
  datapoint: ConsolidatedDatapoint;
  reportingYear: number;
  users: User[];
  onUpdateDatapoint: (datapointId: string, updates: Partial<ConsolidatedDatapoint>) => void;
}

const CONSOLIDATION_METHODS = [
  { value: 'sum', label: 'Suma', description: 'Suma todos los valores' },
  { value: 'average', label: 'Promedio', description: 'Promedio aritmético' },
  { value: 'weighted_average', label: 'Promedio Ponderado', description: 'Promedio con pesos' },
  { value: 'max', label: 'Máximo', description: 'Valor más alto' },
  { value: 'min', label: 'Mínimo', description: 'Valor más bajo' }
] as const;

const SOURCE_TYPES = [
  { value: 'geography', label: 'Geografía', icon: MapPin },
  { value: 'business_unit', label: 'Unidad de Negocio', icon: Building2 },
  { value: 'subsidiary', label: 'Subsidiaria', icon: Building2 },
  { value: 'facility', label: 'Instalación', icon: Factory }
] as const;

const COLORS = ['#0066ff', '#00d4ff', '#00ff88', '#ffaa00', '#ff4444', '#aa44ff', '#44ffaa'];

const DataConsolidator: React.FC<DataConsolidatorProps> = ({
  datapoint,
  reportingYear,
  users,
  onUpdateDatapoint
}) => {
  const { isMobile } = useMobile();
  const [activeTab, setActiveTab] = useState<'sources' | 'evidence'>('sources');
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [newSource, setNewSource] = useState<Partial<ConsolidationSource> | null>(null);
  
  // Debug: Log datapoint consolidation status
  useEffect(() => {
    console.log('DataConsolidator - datapoint.consolidationEnabled:', datapoint.consolidationEnabled);
    console.log('DataConsolidator - datapoint.sources:', datapoint.sources);
    console.log('DataConsolidator - Full datapoint:', datapoint);
  }, [datapoint.consolidationEnabled, datapoint.sources, datapoint]);
  
  const [config, setConfig] = useState<ConsolidationConfig>({
    datapointId: datapoint.id,
    method: datapoint.consolidationMethod || 'sum',
    breakdownDimensions: datapoint.breakdowns?.map(b => b.dimension) || ['geography'],
    weights: {}
  });

  const yearKey = reportingYear.toString();

  // Calculate consolidated value
  const consolidationResult = useMemo(() => {
    if (!datapoint || !datapoint.consolidationEnabled || !datapoint.sources || datapoint.sources.length === 0) {
      return { consolidatedValue: null, breakdowns: [] };
    }
    try {
      return consolidateValues(datapoint.sources, config, reportingYear);
    } catch (error) {
      console.error('Error consolidating values:', error);
      return { consolidatedValue: null, breakdowns: [] };
    }
  }, [datapoint, config, reportingYear]);

  // Generate summary
  const summary = useMemo(() => {
    if (!datapoint || !datapoint.consolidationEnabled) return null;
    try {
      return generateConsolidationSummary(datapoint, reportingYear);
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  }, [datapoint, reportingYear]);

  // Validation
  const validation = useMemo(() => {
    if (!datapoint || !datapoint.consolidationEnabled || !datapoint.sources) {
      return { valid: true, errors: [], warnings: [] };
    }
    try {
      return validateConsolidationSources(datapoint.sources, datapoint);
    } catch (error) {
      console.error('Error validating sources:', error);
      return { valid: false, errors: ['Error en validación'], warnings: [] };
    }
  }, [datapoint]);

  const handleEnableConsolidation = () => {
    if (!datapoint || !datapoint.id) {
      alert('Error: Datapoint inválido');
      return;
    }
    console.log('Enabling consolidation for datapoint:', datapoint.id);
    onUpdateDatapoint(datapoint.id, {
      consolidationEnabled: true,
      consolidationMethod: config.method,
      sources: datapoint.sources || []
    });
    console.log('Consolidation enabled, waiting for update...');
  };

  const handleAddSource = () => {
    if (!users || users.length === 0) {
      alert('No hay usuarios disponibles. Por favor, agrega usuarios primero.');
      return;
    }
    setNewSource({
      id: `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      type: 'geography',
      responsibleUserId: users[0]?.id || '',
      responsibleUserName: users[0]?.name || '',
      values: {},
      lastUpdated: new Date().toISOString(),
      status: 'Draft' as any
    });
  };

  const handleSaveNewSource = () => {
    if (!newSource) return;
    
    if (!newSource.name || newSource.name.trim() === '') {
      alert('Por favor, ingresa un nombre para la fuente');
      return;
    }
    
    if (!newSource.responsibleUserId) {
      alert('Por favor, selecciona un responsable');
      return;
    }

    const source: ConsolidationSource = {
      id: newSource.id!,
      name: newSource.name,
      type: newSource.type || 'geography',
      responsibleUserId: newSource.responsibleUserId,
      responsibleUserName: users.find(u => u.id === newSource.responsibleUserId)?.name || '',
      values: newSource.values || {},
      lastUpdated: new Date().toISOString(),
      status: newSource.status || 'Draft' as any
    };

    onUpdateDatapoint(datapoint.id, {
      sources: [...(datapoint.sources || []), source]
    });

    setNewSource(null);
  };

  const handleUpdateSource = (sourceId: string, updates: Partial<ConsolidationSource>) => {
    if (!datapoint.sources) return;
    onUpdateDatapoint(datapoint.id, {
      sources: datapoint.sources.map(s =>
        s.id === sourceId ? { ...s, ...updates } : s
      )
    });
    setEditingSource(null);
  };

  const handleDeleteSource = (sourceId: string) => {
    if (!datapoint.sources) return;
    if (confirm('¿Estás seguro de eliminar esta fuente de consolidación?')) {
      onUpdateDatapoint(datapoint.id, {
        sources: datapoint.sources.filter(s => s.id !== sourceId)
      });
    }
  };

  const handleUpdateSourceValue = (sourceId: string, year: number, value: string | number | null) => {
    if (!datapoint || !datapoint.sources) return;
    
    const source = datapoint.sources.find(s => s && s.id === sourceId);
    if (!source) {
      console.error(`Source with id ${sourceId} not found`);
      return;
    }

    // Validate value for quantitative datapoints
    if (datapoint.type === 'quantitative' && value !== null && value !== '') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num) || !isFinite(num)) {
        alert('Por favor, ingresa un valor numérico válido');
        return;
      }
    }

    const updatedValues = { ...source.values, [year.toString()]: value };
    handleUpdateSource(sourceId, {
      values: updatedValues,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleUpdateConfig = (updates: Partial<ConsolidationConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onUpdateDatapoint(datapoint.id, {
      consolidationMethod: newConfig.method,
      consolidatedValue: consolidationResult.consolidatedValue !== null
        ? { [yearKey]: consolidationResult.consolidatedValue }
        : undefined,
      breakdowns: consolidationResult.breakdowns,
      lastConsolidated: new Date().toISOString()
    });
  };

  // Prepare chart data - safely
  const pieChartData = useMemo(() => {
    try {
      if (!consolidationResult?.breakdowns || !Array.isArray(consolidationResult.breakdowns)) {
        return [];
      }
      return consolidationResult.breakdowns.map((b, idx) => ({
        name: b?.dimensionValue || `Source ${idx + 1}`,
        value: typeof b?.value === 'number' ? b.value : parseFloat(String(b?.value || 0)) || 0,
        percentage: b?.percentage || 0,
        color: COLORS[idx % COLORS.length]
      }));
    } catch (error) {
      console.error('Error preparing pie chart data:', error);
      return [];
    }
  }, [consolidationResult]);

  const barChartData = useMemo(() => {
    try {
      if (!datapoint.sources || !Array.isArray(datapoint.sources)) {
        return [];
      }
      return datapoint.sources.map((s, idx) => ({
        name: s?.name ? (s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name) : `Source ${idx + 1}`,
        value: typeof s?.values?.[yearKey] === 'number' 
          ? s.values[yearKey] 
          : parseFloat(String(s?.values?.[yearKey] || 0)) || 0,
        color: COLORS[idx % COLORS.length]
      }));
    } catch (error) {
      console.error('Error preparing bar chart data:', error);
      return [];
    }
  }, [datapoint.sources, yearKey]);

  // Early return if consolidation not enabled
  if (!datapoint || !datapoint.consolidationEnabled) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff]" />
              Consolidación de Datos
            </h3>
            <p className="text-xs sm:text-sm text-[#6a6a6a]">
              Habilita la consolidación para gestionar múltiples responsables y generar métricas consolidadas.
            </p>
          </div>
          <button
            onClick={handleEnableConsolidation}
            className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs sm:text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Habilitar Consolidación
          </button>
        </div>
      </div>
    );
  }

  // Ensure all values are safe before rendering
  if (!datapoint || !datapoint.id) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
        <p className="text-sm text-[#6a6a6a]">Error: Datapoint inválido</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff]" />
              Consolidación de Datos
            </h3>
            <p className="text-xs sm:text-sm text-[#6a6a6a] mt-1">
              Gestiona múltiples responsables y genera métricas consolidadas
            </p>
          </div>
        </div>

      {/* Validation Warnings */}
      {validation && validation.warnings && validation.warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-yellow-500 mb-1">Advertencias</p>
              <ul className="text-xs text-yellow-400 space-y-1">
                {validation.warnings.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Consolidated Value Display */}
      {consolidationResult && consolidationResult.consolidatedValue !== null && (
        <div className="bg-[#1a1a1a] border border-[#0066ff] rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm text-[#6a6a6a] mb-1">Valor Consolidado ({reportingYear})</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {typeof consolidationResult.consolidatedValue === 'number'
                  ? consolidationResult.consolidatedValue.toLocaleString('es-ES', { maximumFractionDigits: 2 })
                  : consolidationResult.consolidatedValue}
                {datapoint.unit && ` ${datapoint.unit}`}
              </p>
              {summary && (
                <p className="text-xs sm:text-sm text-[#6a6a6a] mt-2">
                  {summary.sourcesWithData} de {summary.totalSources} fuentes con datos ({summary.coveragePercentage}% cobertura)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
              <span className="text-xs sm:text-sm text-green-500 font-medium">Consolidado</span>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
        <h4 className="text-xs sm:text-sm font-medium text-white mb-3 sm:mb-4">Método de Consolidación</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {CONSOLIDATION_METHODS.map((method) => (
            <button
              key={method.value}
              onClick={() => handleUpdateConfig({ method: method.value as any })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                config.method === method.value
                  ? 'border-[#0066ff] bg-[#0066ff]/10'
                  : 'border-[#2a2a2a] hover:border-[#0066ff]/50'
              }`}
            >
              <p className="text-xs sm:text-sm font-medium text-white mb-1">{method.label}</p>
              <p className="text-xs text-[#6a6a6a]">{method.description}</p>
            </button>
          ))}
        </div>

        {/* Weights for weighted average */}
        {config.method === 'weighted_average' && (datapoint.sources || []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
            <h5 className="text-xs sm:text-sm font-medium text-white mb-3">Pesos</h5>
            <div className="space-y-2">
              {(datapoint.sources || []).map((source) => (
                <div key={source.id} className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-[#6a6a6a] w-32 sm:w-40 truncate">
                    {source.name}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={config.weights?.[source.id] || 1}
                    onChange={(e) => {
                      const weights = { ...config.weights, [source.id]: parseFloat(e.target.value) || 1 };
                      handleUpdateConfig({ weights });
                    }}
                    className="flex-1 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs sm:text-sm text-white focus:border-[#0066ff] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2a2a2a]">
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'sources'
              ? 'border-[#0066ff] text-white'
              : 'border-transparent text-[#6a6a6a] hover:text-white'
          }`}
        >
          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
          Fuentes
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'evidence'
              ? 'border-[#0066ff] text-white'
              : 'border-transparent text-[#6a6a6a] hover:text-white'
          }`}
        >
          <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />
          Evidencias por Fuente
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'sources' && (
        <>
      {/* Sources List */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <h4 className="text-xs sm:text-sm font-medium text-white">
            Fuentes de Consolidación ({(datapoint.sources || []).length})
          </h4>
          <button
            onClick={handleAddSource}
            className="px-3 sm:px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs sm:text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Agregar Fuente
          </button>
        </div>

        {/* New Source Form */}
        {newSource && (
          <div className="mb-4 p-4 bg-[#0a0a0a] border border-[#0066ff] rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-[#6a6a6a] mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={newSource.name || ''}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs sm:text-sm text-white focus:border-[#0066ff] focus:outline-none"
                  placeholder="Ej: España, División Manufactura"
                />
              </div>
              <div>
                <label className="text-xs text-[#6a6a6a] mb-1 block">Tipo</label>
                <select
                  value={newSource.type || 'geography'}
                  onChange={(e) => setNewSource({ ...newSource, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs sm:text-sm text-white focus:border-[#0066ff] focus:outline-none"
                >
                  {SOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-[#6a6a6a] mb-1 block">Responsable</label>
                <select
                  value={newSource.responsibleUserId || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value);
                    setNewSource({
                      ...newSource,
                      responsibleUserId: e.target.value,
                      responsibleUserName: user?.name || ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs sm:text-sm text-white focus:border-[#0066ff] focus:outline-none"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleSaveNewSource}
                className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs sm:text-sm rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                Guardar
              </button>
              <button
                onClick={() => setNewSource(null)}
                className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs sm:text-sm rounded-lg flex items-center gap-2 transition-colors"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Sources */}
        <div className="space-y-3">
          {(datapoint.sources || []).map((source) => {
            const isEditing = editingSource === source.id;
            const SourceIcon = SOURCE_TYPES.find(t => t.value === source.type)?.icon || MapPin;

            return (
              <div
                key={source.id}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 hover:border-[#0066ff]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <SourceIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-white truncate">
                        {source.name}
                      </p>
                      <p className="text-xs text-[#6a6a6a] mt-1">
                        Responsable: {source.responsibleUserName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => setEditingSource(source.id)}
                          className="p-1.5 sm:p-2 text-[#6a6a6a] hover:text-[#0066ff] transition-colors"
                        >
                          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="p-1.5 sm:p-2 text-[#6a6a6a] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Value Input */}
                <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                  <label className="text-xs text-[#6a6a6a] mb-2 block">
                    Valor ({reportingYear})
                  </label>
                  <input
                    type={datapoint.type === 'quantitative' ? 'number' : 'text'}
                    value={source.values?.[yearKey] || ''}
                    onChange={(e) => {
                      const value = datapoint.type === 'quantitative'
                        ? (e.target.value === '' ? null : parseFloat(e.target.value))
                        : e.target.value;
                      handleUpdateSourceValue(source.id, reportingYear, value);
                    }}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs sm:text-sm text-white focus:border-[#0066ff] focus:outline-none"
                    placeholder={`Ingresa valor${datapoint.unit ? ` (${datapoint.unit})` : ''}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visualizations */}
      {consolidationResult && consolidationResult.breakdowns && consolidationResult.breakdowns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Pie Chart */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
            <h4 className="text-xs sm:text-sm font-medium text-white mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#0066ff]" />
              Desglose por {config.breakdownDimensions[0] || 'fuente'}
            </h4>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={isMobile ? "60%" : "70%"}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
            <h4 className="text-xs sm:text-sm font-medium text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0066ff]" />
              Comparación de Fuentes
            </h4>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <BarChart data={barChartData}>
                <XAxis dataKey="name" tick={{ fill: '#6a6a6a', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6a6a6a', fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0066ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && summary.totalSources !== undefined && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Total Fuentes</p>
            <p className="text-lg sm:text-xl font-bold text-white">{summary.totalSources}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Con Datos</p>
            <p className="text-lg sm:text-xl font-bold text-white">{summary.sourcesWithData}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Cobertura</p>
            <p className="text-lg sm:text-xl font-bold text-white">{summary.coveragePercentage}%</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Promedio</p>
            <p className="text-lg sm:text-xl font-bold text-white">
              {summary.averageValue !== null
                ? summary.averageValue.toLocaleString('es-ES', { maximumFractionDigits: 2 })
                : 'N/A'}
            </p>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'evidence' && (
        <SourceEvidenceManager
          datapoint={datapoint}
          sources={datapoint.sources || []}
          reportingYear={reportingYear}
          currentUserId={users[0]?.id || ''}
          onEvidenceUpdate={(sourceId, evidenceFiles) => {
            // Update source with evidence file IDs
            if (sourceId !== 'general' && datapoint.sources && Array.isArray(datapoint.sources)) {
              const updatedSources = datapoint.sources.map(s =>
                s.id === sourceId
                  ? { ...s, evidence: evidenceFiles.map(ef => ef.id) }
                  : s
              );
              onUpdateDatapoint(datapoint.id, { sources: updatedSources });
            }
          }}
        />
      )}
    </div>
  );
};

export default DataConsolidator;
