/**
 * DataConnectionsPanel - Conexiones a ERP y software especializado
 * RRHH, Medio Ambiente, Compras y otros sistemas centralizados
 */
import React, { useState } from 'react';
import {
  Plug,
  Users,
  Leaf,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw
} from 'lucide-react';

export type ConnectionType = 'erp_hr' | 'erp_environment' | 'procurement' | 'other';

export interface ConnectionConfig {
  id: string;
  type: ConnectionType;
  name: string;
  description: string;
  enabled: boolean;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
}

const CONNECTION_TYPES: Record<ConnectionType, { label: string; icon: React.ElementType; description: string }> = {
  erp_hr: {
    label: 'ERP RRHH',
    icon: Users,
    description: 'SAP SuccessFactors, Workday, Oracle HCM u otros. Plantilla, absentismo, formación, diversidad.'
  },
  erp_environment: {
    label: 'ERP Medio Ambiente',
    icon: Leaf,
    description: 'SAP EHS, Enablon, Sphera u otros. Consumos, emisiones, residuos, vertidos.'
  },
  procurement: {
    label: 'Software Compras',
    icon: ShoppingCart,
    description: 'SAP Ariba, Coupa, Ivalua u otros. Proveedores, cadena de suministro, criterios ESG.'
  },
  other: {
    label: 'Otros sistemas',
    icon: Plug,
    description: 'Software especializado gestionado de forma centralizada.'
  }
};

const MOCK_CONNECTIONS: ConnectionConfig[] = [
  {
    id: 'c1',
    type: 'erp_hr',
    name: 'SAP SuccessFactors',
    description: 'Datos de plantilla y formación',
    enabled: false,
    status: 'pending'
  },
  {
    id: 'c2',
    type: 'erp_environment',
    name: 'SAP EHS',
    description: 'Consumos energéticos y emisiones',
    enabled: false,
    status: 'pending'
  },
  {
    id: 'c3',
    type: 'procurement',
    name: 'SAP Ariba',
    description: 'Proveedores y criterios de compra',
    enabled: false,
    status: 'pending'
  }
];

export const DataConnectionsPanel: React.FC = () => {
  const [connections] = useState<ConnectionConfig[]>(MOCK_CONNECTIONS);
  const [expandedType, setExpandedType] = useState<ConnectionType | null>(null);

  const getStatusIcon = (status: ConnectionConfig['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-[#6a6a6a]" />;
    }
  };

  const getStatusLabel = (status: ConnectionConfig['status']) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'disconnected': return 'Desconectado';
      case 'pending': return 'Pendiente de configurar';
      case 'error': return 'Error';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-[#0066ff]/20 rounded-lg">
            <Plug className="w-8 h-8 text-[#0066ff]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Conexiones a sistemas fuente</h2>
            <p className="text-sm text-[#6a6a6a]">
              Conecta ERP (RRHH, Medio Ambiente) y software de compras para importar datos ESG
              de forma automática desde sistemas centralizados.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(CONNECTION_TYPES).map(([type, meta]) => {
            const Icon = meta.icon;
            const conn = connections.find(c => c.type === type);
            const isExpanded = expandedType === type;

            return (
              <div
                key={type}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1a1a1a] rounded">
                      <Icon className="w-5 h-5 text-[#0066ff]" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{meta.label}</p>
                      <p className="text-xs text-[#6a6a6a]">{meta.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {conn ? (
                      <>
                        {getStatusIcon(conn.status)}
                        <span className="text-xs text-[#6a6a6a]">{getStatusLabel(conn.status)}</span>
                      </>
                    ) : (
                      <span className="text-xs text-[#6a6a6a]">Pendiente</span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-[#2a2a2a]">
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-[#6a6a6a] mb-1">Sistema / Proveedor</label>
                          <input
                            type="text"
                            placeholder="Ej: SAP SuccessFactors, Workday, Enablon..."
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-white placeholder-[#6a6a6a]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6a6a6a] mb-1">Endpoint / API</label>
                          <input
                            type="text"
                            placeholder="https://api.ejemplo.com/v1"
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-white placeholder-[#6a6a6a]"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-[#cccccc]">Sincronización automática</span>
                        </label>
                        <span className="text-xs text-[#6a6a6a]">·</span>
                        <select className="px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-white">
                          <option>Diaria</option>
                          <option>Semanal</option>
                          <option>Mensual</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded text-sm font-medium flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          Probar conexión
                        </button>
                        <button className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded text-sm font-medium">
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Integración en desarrollo</p>
            <p className="text-xs text-amber-300/80 mt-1">
              Las conexiones ERP y de compras requieren configuración de API, OAuth o conectores
              específicos. Contacta con tu administrador para activar las integraciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataConnectionsPanel;
