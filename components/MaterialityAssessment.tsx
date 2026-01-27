import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Target, RefreshCw, Info, ArrowRight, X, Plus, FileText, Upload } from 'lucide-react';
import { generateMaterialityMatrix } from '../services/geminiService';
import { MaterialityTopic } from '../types';
import { useMobile } from '../hooks/useMobile';
import { getSplitLayout } from '../utils/responsive';

const AVAILABLE_SECTORS = [
  'Construction & Engineering', 
  'Toll Roads', 
  'Airports', 
  'Energy Infrastructure', 
  'Mining Services',
  'Water Treatment',
  'Waste Management',
  'Data Centers',
  'Mobility Services'
];

const AVAILABLE_COUNTRIES = [
  'Spain', 
  'USA', 
  'United Kingdom', 
  'Poland', 
  'Canada', 
  'Chile', 
  'India', 
  'Australia', 
  'Colombia',
  'Saudi Arabia',
  'France'
];

const MaterialityAssessment: React.FC = () => {
  const { isMobile } = useMobile();
  const splitLayout = getSplitLayout(true);
  const [selectedSectors, setSelectedSectors] = useState<string[]>(['Construction & Engineering', 'Toll Roads']);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['USA', 'Spain', 'Poland']);
  const [userContext, setUserContext] = useState('');
  const [contextLevel, setContextLevel] = useState('Group'); // Group or Subsidiary
  const [topics, setTopics] = useState<MaterialityTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      if (list.length < 5) {
        setList([...list, item]);
      }
    }
  };

  const handleAssessment = async () => {
    if (selectedSectors.length === 0 || selectedCountries.length === 0) return;
    setIsLoading(true);
    try {
      const results = await generateMaterialityMatrix(selectedSectors, selectedCountries, userContext, contextLevel);
      setTopics(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getColor = (category: string) => {
    switch (category) {
      case 'Environmental': return '#00ff88'; // PALANTIR Green
      case 'Social': return '#ffaa00'; // PALANTIR Orange
      case 'Governance': return '#0066ff'; // PALANTIR Blue
      default: return '#6a6a6a';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1e1e1e] p-3 sm:p-4 border border-[#2a2a2a] shadow-xl rounded-lg max-w-xs z-50">
          <p className="font-bold text-white text-xs sm:text-sm mb-1 break-words">{data.name}</p>
          <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full text-white mb-2 inline-block font-semibold`} style={{ backgroundColor: getColor(data.category) }}>
            {data.category}
          </span>
          <p className="text-[10px] sm:text-xs text-[#aaaaaa] mt-1 leading-relaxed border-t border-[#2a2a2a] pt-2 break-words">{data.description}</p>
          <div className="mt-3 text-[9px] sm:text-[10px] flex justify-between text-[#6a6a6a] font-mono uppercase tracking-wider">
             <span>Impact: {data.impactScore}</span>
             <span>Financial: {data.financialScore}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 sm:gap-4 lg:gap-6 min-w-0">
      {/* Control Panel */}
      <div className={`${splitLayout.left} flex flex-col gap-3 sm:gap-4 overflow-y-auto`}>
        <div className="bg-[#1e1e1e] p-4 sm:p-5 rounded-lg border border-[#2a2a2a]">
          <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff]" />
            Double Materiality Engine
          </h2>
          <p className="text-[10px] sm:text-xs text-[#aaaaaa] mb-4">
            Configure exposure and input existing analysis to generate an ESRS-compliant materiality matrix.
          </p>

          <div className="space-y-4 sm:space-y-5">
            {/* Sector Selection */}
            <div>
              <label className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider mb-2 block">
                 Top 5 Business Sectors ({selectedSectors.length}/5)
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                {selectedSectors.map(sector => (
                  <button 
                    key={sector} 
                    onClick={() => toggleSelection(sector, selectedSectors, setSelectedSectors)}
                    className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] text-[#0066ff] border border-[#0066ff] rounded text-[10px] sm:text-xs font-medium hover:bg-[#0066ff] hover:text-white transition-colors"
                  >
                    <span className="truncate max-w-[120px] sm:max-w-none">{sector}</span> <X className="w-3 h-3 flex-shrink-0" />
                  </button>
                ))}
              </div>
              <div className="relative">
                 <select 
                   className="w-full text-xs sm:text-sm border bg-[#1a1a1a] border-[#2a2a2a] text-white rounded focus:outline-none focus:border-[#00d4ff] p-2 transition-colors"
                   onChange={(e) => {
                     if(e.target.value) toggleSelection(e.target.value, selectedSectors, setSelectedSectors);
                     e.target.value = '';
                   }}
                 >
                    <option value="" className="bg-[#1a1a1a]">+ Add Sector...</option>
                    {AVAILABLE_SECTORS.filter(s => !selectedSectors.includes(s)).map(s => (
                       <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>
                    ))}
                 </select>
              </div>
            </div>

            {/* Country Selection */}
            <div>
              <label className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider mb-2 block">
                 Top 5 Key Geographies ({selectedCountries.length}/5)
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                {selectedCountries.map(country => (
                  <button 
                    key={country} 
                    onClick={() => toggleSelection(country, selectedCountries, setSelectedCountries)}
                    className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] text-[#00ff88] border border-[#00ff88] rounded text-[10px] sm:text-xs font-medium hover:bg-[#00ff88] hover:text-black transition-colors"
                  >
                    <span className="truncate max-w-[100px] sm:max-w-none">{country}</span> <X className="w-3 h-3 flex-shrink-0" />
                  </button>
                ))}
              </div>
              <div className="relative">
                 <select 
                   className="w-full text-xs sm:text-sm border bg-[#1a1a1a] border-[#2a2a2a] text-white rounded focus:outline-none focus:border-[#00d4ff] p-2 transition-colors"
                   onChange={(e) => {
                     if(e.target.value) toggleSelection(e.target.value, selectedCountries, setSelectedCountries);
                     e.target.value = '';
                   }}
                 >
                    <option value="" className="bg-[#1a1a1a]">+ Add Country...</option>
                    {AVAILABLE_COUNTRIES.filter(c => !selectedCountries.includes(c)).map(c => (
                       <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
                    ))}
                 </select>
              </div>
            </div>

            {/* User Input Section */}
            <div className="pt-3 sm:pt-4 border-t border-[#2a2a2a]">
               <label className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span>Input Existing Analysis</span>
                  <div className="flex bg-[#1a1a1a] rounded p-0.5 border border-[#2a2a2a]">
                     <button 
                        onClick={() => setContextLevel('Group')}
                        className={`px-2 py-0.5 text-[9px] sm:text-[10px] rounded transition-colors ${contextLevel === 'Group' ? 'bg-[#0066ff] text-white font-bold' : 'text-[#6a6a6a]'}`}
                     >Group</button>
                     <button 
                        onClick={() => setContextLevel('Subsidiary')}
                        className={`px-2 py-0.5 text-[9px] sm:text-[10px] rounded transition-colors ${contextLevel === 'Subsidiary' ? 'bg-[#0066ff] text-white font-bold' : 'text-[#6a6a6a]'}`}
                     >Filial</button>
                  </div>
               </label>
               <div className="relative">
                  <textarea 
                     rows={3}
                     className="w-full text-xs sm:text-sm border bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-[#6a6a6a] rounded focus:outline-none focus:border-[#00d4ff] p-2 resize-y"
                     placeholder={`Paste summary of ${contextLevel} risk assessment, audit findings, or stakeholder engagement results...`}
                     value={userContext}
                     onChange={(e) => setUserContext(e.target.value)}
                  />
                  <div className="absolute bottom-2 right-2 text-[#6a6a6a]">
                     <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
               </div>
            </div>

            <button
              onClick={handleAssessment}
              disabled={isLoading || selectedSectors.length === 0 || selectedCountries.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-2 sm:py-3 px-4 rounded text-white text-xs sm:text-sm font-medium transition-all ${
                isLoading 
                  ? 'bg-[#6a6a6a] cursor-wait' 
                  : 'bg-[#0066ff] hover:bg-[#0052cc]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {isLoading ? 'Generating Matrix...' : 'Run Assessment'}
            </button>
          </div>
        </div>

        {topics.length > 0 && (
           <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg flex-1 flex flex-col min-h-0">
              <div className="p-2 sm:p-3 bg-[#1a1a1a] border-b border-[#2a2a2a] font-bold text-[10px] sm:text-xs text-white uppercase tracking-wider">
                 Material Topics Ranked
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                 {topics.sort((a, b) => (b.impactScore + b.financialScore) - (a.impactScore + a.financialScore)).map((topic, i) => (
                    <div key={i} className="p-2 sm:p-3 border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-1 sm:gap-0 mb-1">
                          <span className="text-xs sm:text-sm font-medium text-white leading-tight break-words flex-1">{topic.name}</span>
                          <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded ml-0 sm:ml-2 whitespace-nowrap text-white flex-shrink-0`} style={{ backgroundColor: getColor(topic.category) }}>
                            {(topic.impactScore + topic.financialScore) / 2 > 80 ? 'CRITICAL' : 'MATERIAL'}
                          </span>
                       </div>
                       <div className="flex gap-3 text-[9px] sm:text-[10px] text-[#6a6a6a] font-mono mt-1">
                           <span>IMP: {topic.impactScore}</span>
                           <span>FIN: {topic.financialScore}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>

      {/* Matrix Visualization */}
      <div className={`${splitLayout.right} bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg flex flex-col p-3 sm:p-4 lg:p-6 min-h-0`}>
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-3 gap-2">
            <div>
               <h3 className="font-bold text-white text-sm sm:text-base lg:text-lg">Double Materiality Matrix</h3>
               <p className="text-[10px] sm:text-xs text-[#aaaaaa]">Mapping Impact Materiality (Y) vs Financial Materiality (X)</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-[9px] sm:text-xs font-medium">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#00ff88]"></div><span className="text-white">Environmental</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#ffaa00]"></div><span className="text-white">Social</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#0066ff]"></div><span className="text-white">Governance</span></div>
            </div>
         </div>
         
         <div className="flex-1 relative border border-[#2a2a2a] rounded-lg bg-[#0a0a0a] mt-3 sm:mt-4 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
            {/* Background Quadrants */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
               <div className="border-r border-b border-[#2a2a2a]"></div>
               <div className="border-b border-[#2a2a2a] bg-[#0066ff]/5"></div>
               <div className="border-r border-[#2a2a2a]"></div>
               <div className="bg-[#ff4444]/5"></div>
            </div>

            {topics.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                     <XAxis 
                        type="number" 
                        dataKey="financialScore" 
                        name="Financial Materiality" 
                        domain={[0, 100]} 
                        tickCount={5}
                        stroke="#6a6a6a"
                        tick={{ fill: '#aaaaaa', fontSize: 11 }}
                        label={{ value: 'Financial Materiality', position: 'bottom', offset: 5, fill: '#aaaaaa', fontSize: 11 }} 
                     />
                     <YAxis 
                        type="number" 
                        dataKey="impactScore" 
                        name="Impact Materiality" 
                        domain={[0, 100]} 
                        tickCount={5}
                        stroke="#6a6a6a"
                        tick={{ fill: '#aaaaaa', fontSize: 11 }}
                        label={{ value: 'Impact Materiality', angle: -90, position: 'left', offset: 5, fill: '#aaaaaa', fontSize: 11 }} 
                     />
                     <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                     <Scatter name="Topics" data={topics} fill="#8884d8">
                        {topics.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={getColor(entry.category)} stroke="#1e1e1e" strokeWidth={2} />
                        ))}
                     </Scatter>
                  </ScatterChart>
               </ResponsiveContainer>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-[#6a6a6a] p-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
                     <Target className="w-8 h-8 sm:w-10 sm:h-10 text-[#2a2a2a]" />
                  </div>
                  <p className="font-medium text-white text-sm sm:text-base">No Assessment Data</p>
                  <p className="text-xs sm:text-sm mt-1 max-w-xs text-center text-[#aaaaaa]">Select your sectors and geographies on the left and click "Run Assessment" to generate the matrix.</p>
               </div>
            )}
            
            {/* Threshold Labels */}
            <div className="absolute top-2 right-2 text-[9px] sm:text-[10px] font-bold text-[#0066ff] bg-[#1e1e1e] px-2 py-1 rounded border border-[#0066ff]">
               Strategic Priority
            </div>
            <div className="absolute bottom-10 sm:bottom-12 right-2 text-[9px] sm:text-[10px] font-bold text-[#6a6a6a] opacity-50 hidden sm:block">
               High Financial / Low Impact
            </div>
            <div className="absolute top-2 left-8 sm:left-12 text-[9px] sm:text-[10px] font-bold text-[#6a6a6a] opacity-50 hidden sm:block">
               High Impact / Low Financial
            </div>
         </div>
      </div>
    </div>
  );
};

export default MaterialityAssessment;