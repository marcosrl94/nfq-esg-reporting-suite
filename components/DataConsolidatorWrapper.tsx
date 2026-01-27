import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import DataConsolidator from './DataConsolidator';
import { ConsolidatedDatapoint, User } from '../types';

interface Props {
  datapoint: ConsolidatedDatapoint;
  reportingYear: number;
  users: User[];
  onUpdateDatapoint: (datapointId: string, updates: Partial<ConsolidatedDatapoint>) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class DataConsolidatorWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DataConsolidator Error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="bg-[#1a1a1a] border border-red-500/50 rounded-lg p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Error en Consolidación</h3>
              <p className="text-xs text-[#6a6a6a] mb-2">
                Ha ocurrido un error al renderizar la sección de consolidación.
              </p>
              <p className="text-xs text-red-400 font-mono mb-3">
                {this.state.error?.message || 'Error desconocido'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3 py-1.5 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs rounded transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <DataConsolidator
        datapoint={this.props.datapoint}
        reportingYear={this.props.reportingYear}
        users={this.props.users}
        onUpdateDatapoint={this.props.onUpdateDatapoint}
      />
    );
  }
}

export default DataConsolidatorWrapper;
