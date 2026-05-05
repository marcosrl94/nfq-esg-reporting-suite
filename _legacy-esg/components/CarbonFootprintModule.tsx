/**
 * CarbonFootprintModule - Huella de carbono (Sygris Módulo 10)
 * Factores de emisión, alcances 1/2/3, estructura DEFRA
 */
import React, { useMemo } from 'react';
import { Leaf, Factory, Zap, Truck, Info } from 'lucide-react';
import { StandardSection, WorkflowStatus } from '../types';

interface CarbonFootprintModuleProps {
  sections: StandardSection[];
  reportingYear: number;
}

const SCOPE_LABELS = {
  scope1: { name: 'Alcance 1', desc: 'Emisiones directas (combustión, procesos)', icon: Factory, color: 'text-amber-400' },
  scope2: { name: 'Alcance 2', desc: 'Emisiones indirectas por energía (electricidad, calor)', icon: Zap, color: 'text-blue-400' },
  scope3: { name: 'Alcance 3', desc: 'Otras emisiones indirectas (cadena de valor)', icon: Truck, color: 'text-green-400' }
};

const DEFRA_FACTORS_2024 = {
  electricity: { kgCO2e: 0.207, unit: 'kWh', source: 'DEFRA 2024' },
  naturalGas: { kgCO2e: 0.203, unit: 'kWh', source: 'DEFRA 2024' },
  diesel: { kgCO2e: 2.68, unit: 'litro', source: 'DEFRA 2024' },
  petrol: { kgCO2e: 2.31, unit: 'litro', source: 'DEFRA 2024' }
};

export const CarbonFootprintModule: React.FC<CarbonFootprintModuleProps> = ({
  sections,
  reportingYear
}) => {
  const e1Section = useMemo(() => sections.find(s => s.code === 'ESRS E1'), [sections]);

  const scopeDatapoints = useMemo(() => {
    if (!e1Section) return { scope1: null, scope2: null, scope3: null };
    const dp1 = e1Section.datapoints.find(d => d.code === 'E1-6-01');
    const dp2 = e1Section.datapoints.find(d => d.code === 'E1-6-02');
    const dp3 = e1Section.datapoints.find(d => d.code === 'E1-6-03');
    return {
      scope1: dp1 ? { dp: dp1, value: dp1.values[reportingYear.toString()], status: dp1.status } : null,
      scope2: dp2 ? { dp: dp2, value: dp2.values[reportingYear.toString()], status: dp2.status } : null,
      scope3: dp3 ? { dp: dp3, value: dp3.values[reportingYear.toString()], status: dp3.status } : null
    };
  }, [e1Section, reportingYear]);

  const totalEmissions = useMemo(() => {
    let total = 0;
    Object.values(scopeDatapoints).forEach(s => {
      if (s && typeof s.value === 'number' && !isNaN(s.value)) total += s.value;
    });
    return total;
  }, [scopeDatapoints]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900/30 to-green-800/10 border border-green-500/40 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <Leaf className="w-8 h-8 text-green-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">Huella de Carbono</h1>
            <p className="text-sm text-[#cccccc]">
              Alcances 1, 2 y 3 según GHG Protocol. Factores DEFRA 2024. Vinculado a ESRS E1-6.
            </p>
          </div>
        </div>
      </div>

      {/* Resumen por alcance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Total tCO2e</p>
          <p className="text-2xl font-bold text-white">
            {totalEmissions > 0 ? totalEmissions.toLocaleString('es-ES') : '—'}
          </p>
          <p className="text-xs text-[#6a6a6a] mt-1">FY {reportingYear}</p>
        </div>
        {(['scope1', 'scope2', 'scope3'] as const).map(key => {
          const s = scopeDatapoints[key];
          const meta = SCOPE_LABELS[key];
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <span className="text-xs text-[#6a6a6a]">{meta.name}</span>
              </div>
              <p className="text-xl font-bold text-white">
                {s && typeof s.value === 'number' ? s.value.toLocaleString('es-ES') : '—'}
              </p>
              <p className="text-xs text-[#6a6a6a]">tCO2e</p>
            </div>
          );
        })}
      </div>

      {/* Detalle por alcance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['scope1', 'scope2', 'scope3'] as const).map(key => {
          const s = scopeDatapoints[key];
          const meta = SCOPE_LABELS[key];
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${meta.color}`} />
                <h3 className="font-semibold text-white">{meta.name}</h3>
              </div>
              <p className="text-xs text-[#6a6a6a] mb-3">{meta.desc}</p>
              {s ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6a6a6a]">Valor reportado</span>
                    <span className="text-white font-medium">
                      {typeof s.value === 'number' ? `${s.value.toLocaleString('es-ES')} tCO2e` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6a6a6a]">Código ESRS</span>
                    <span className="text-green-400/80">{s.dp.code}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6a6a6a]">Estado</span>
                    <span className={
                      s.status === WorkflowStatus.APPROVED ? 'text-green-500' :
                      s.status === WorkflowStatus.REVIEW ? 'text-amber-500' : 'text-[#6a6a6a]'
                    }>
                      {s.status}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6a6a6a]">
                  No hay datapoint E1-6-0x configurado para este alcance.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Factores de emisión DEFRA */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-[#0066ff]" />
          <h3 className="font-semibold text-white">Factores de Emisión (DEFRA 2024)</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(DEFRA_FACTORS_2024).map(([key, factor]) => (
            <div
              key={key}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3"
            >
              <p className="text-xs text-[#6a6a6a] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-lg font-bold text-white">{factor.kgCO2e} kgCO2e/{factor.unit}</p>
              <p className="text-xs text-[#6a6a6a]">{factor.source}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarbonFootprintModule;
