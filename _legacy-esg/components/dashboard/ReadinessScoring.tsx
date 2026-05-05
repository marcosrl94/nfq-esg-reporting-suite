/**
 * Readiness Scoring Component - Por función y ESRS
 */
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ReadinessScore {
  dimension: 'function' | 'esrs';
  dimensionValue: string;
  score: number; // 0-100
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
}

interface ReadinessScoringProps {
  scores: ReadinessScore[];
  type: 'function' | 'esrs';
  onCellClick?: (dimension: string, value: string) => void;
}

export const ReadinessScoring: React.FC<ReadinessScoringProps> = ({
  scores,
  type,
  onCellClick
}) => {
  const data = scores.map(score => ({
    name: score.dimensionValue,
    score: Math.round(score.score),
    total: score.total,
    completed: score.completed,
    inProgress: score.inProgress,
    blocked: score.blocked
  }));
  
  const getColor = (score: number) => {
    if (score >= 90) return '#00ff88';
    if (score >= 70) return '#ffaa00';
    if (score >= 50) return '#ff6600';
    return '#ff4444';
  };
  
  const handleBarClick = (data: any) => {
    if (onCellClick) {
      onCellClick(type, data.name);
    }
    // Si no hay callback, simplemente no hacer nada
    // La navegación se manejará desde el componente padre si es necesario
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.name}</p>
          <p className="text-sm text-[#cccccc]">
            <span className="text-[#00ff88]">{data.completed}</span> completados
          </p>
          <p className="text-sm text-[#cccccc]">
            <span className="text-[#ffaa00]">{data.inProgress}</span> en progreso
          </p>
          <p className="text-sm text-[#cccccc]">
            <span className="text-[#ff4444]">{data.blocked}</span> bloqueados
          </p>
          <p className="text-sm text-[#0066ff] font-bold mt-2">
            {data.score}% readiness
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a]">
      <h3 className="text-base lg:text-lg font-bold text-white mb-4">
        Readiness by {type === 'function' ? 'Function' : 'ESRS Standard'}
      </h3>
      <div className="h-64 sm:h-72 lg:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              stroke="#6a6a6a"
              tick={{ fill: '#aaaaaa', fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={120}
              tick={{ fill: '#aaaaaa', fontSize: 11 }} 
              stroke="#6a6a6a"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="score"
              fill="#0066ff"
              radius={[0, 4, 4, 0]}
              onClick={handleBarClick}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
