import React, { useState, useMemo } from 'react';
import { Datapoint, StandardSection, WorkflowStatus, User, Comment, ConsolidatedDatapoint } from '../types';
import { CheckCircle2, AlertCircle, FileText, Paperclip, MessageSquare, History, Send, TrendingUp, TrendingDown, Minus, Sparkles, ScanEye, UploadCloud, Check, X, FileCheck, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { verifyEvidence } from '../services/geminiService';
import BulkImportModal from './BulkImportModal';
import EvidenceManager from './EvidenceManager';
import DataConsolidatorWrapper from './DataConsolidatorWrapper';
import { useMobile } from '../hooks/useMobile';
import { getSplitLayout } from '../utils/responsive';
import { getStatusColorClasses } from '../utils/palantirThemeClasses';

interface DataInputProps {
  section: StandardSection;
  onUpdateDatapoint: (datapointId: string, updates: Partial<Datapoint>) => void;
  currentUser: User;
  users: User[];
  reportingYear: number;
  /** Si se proporciona, el botón Bulk Import llama a este callback en lugar de abrir el modal interno */
  onBulkImportClick?: () => void;
}

const DataInput: React.FC<DataInputProps> = ({ section, onUpdateDatapoint, currentUser, users, reportingYear, onBulkImportClick }) => {
  const { isMobile, isTablet } = useMobile();
  const [activeDatapointId, setActiveDatapointId] = useState<string | null>(section.datapoints[0]?.id || null);
  const [newComment, setNewComment] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'evidence' | 'consolidation'>('data');
  const splitLayout = getSplitLayout(true);

  // Find active datapoint from section, ensuring we get the latest version
  const activeDatapoint = section.datapoints.find(d => d.id === activeDatapointId);
  const activeOwner = users.find(u => u.id === activeDatapoint?.ownerId);
  
  // Create consolidated datapoint with proper defaults, preserving existing values
  const consolidatedDatapoint: ConsolidatedDatapoint = useMemo(() => {
    if (!activeDatapoint) {
      return null as any;
    }
    return {
      ...activeDatapoint,
      consolidationEnabled: (activeDatapoint as any).consolidationEnabled ?? false,
      sources: (activeDatapoint as any).sources ?? [],
      consolidationMethod: (activeDatapoint as any).consolidationMethod ?? 'sum',
      consolidatedValue: (activeDatapoint as any).consolidatedValue,
      breakdowns: (activeDatapoint as any).breakdowns,
      lastConsolidated: (activeDatapoint as any).lastConsolidated
    } as ConsolidatedDatapoint;
  }, [activeDatapoint]);

  // Derive years: Current, N-1, N-2
  const reportingYears = [reportingYear, reportingYear - 1, reportingYear - 2];

  const handleStatusChange = (newStatus: WorkflowStatus) => {
    if (!activeDatapoint) return;
    onUpdateDatapoint(activeDatapoint.id, { 
      status: newStatus,
      lastModified: new Date().toISOString()
    });
  };

  const handleValueChange = (year: number, newValue: string) => {
    if (!activeDatapoint) return;
    const updatedValues = { ...activeDatapoint.values, [year.toString()]: newValue };
    // Reset verification if value changes
    onUpdateDatapoint(activeDatapoint.id, { 
       values: updatedValues,
       aiVerification: undefined 
    });
  };

  const handlePostComment = () => {
     if (!activeDatapoint || !newComment.trim()) return;
     
     const comment: Comment = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        text: newComment,
        timestamp: new Date().toISOString()
     };

     const updatedComments = [...(activeDatapoint.comments || []), comment];
     onUpdateDatapoint(activeDatapoint.id, { comments: updatedComments });
     setNewComment('');
  };

  const handleRunAiVerification = async () => {
    if (!activeDatapoint || !activeDatapoint.evidence?.[0]) return;
    
    setIsVerifying(true);
    try {
       const currentValue = activeDatapoint.values[reportingYear];
       if (!currentValue) return;

       const result = await verifyEvidence(
          activeDatapoint.name,
          currentValue,
          activeDatapoint.evidence[0],
          activeDatapoint.unit
       );

       onUpdateDatapoint(activeDatapoint.id, {
          aiVerification: {
             status: result.status,
             extractedValue: result.extractedValue,
             confidence: result.confidence,
             reasoning: result.reasoning,
             lastChecked: new Date().toISOString()
          }
       });
    } catch (e) {
       console.error(e);
    } finally {
       setIsVerifying(false);
    }
  };

  const getStatusColor = (status: WorkflowStatus) => {
    return getStatusColorClasses(status);
  };

  // Helper to calculate delta
  const calculateDelta = (curr: number | null, prev: number | null) => {
     if (curr === null || prev === null || prev === 0) return null;
     return ((curr - prev) / prev) * 100;
  };

  // Prepare chart data for quantitative items
  const chartData = activeDatapoint?.type === 'quantitative' 
    ? reportingYears.slice().reverse().map(year => ({
        year: year.toString(),
        value: activeDatapoint.values[year] ? Number(activeDatapoint.values[year]) : 0
      }))
    : [];

  if (!activeDatapoint) {
    return (
      <div className="p-6 text-center text-[#6a6a6a]">
        <p>Selecciona un datapoint para comenzar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 sm:gap-4 lg:gap-6 min-w-0">
      {/* List of Datapoints */}
      <div className={`${splitLayout.left} bg-[#1e1e1e] border border-[#2a2a2a] rounded flex flex-col overflow-hidden min-h-0 lg:min-h-full`}>
        <div className="p-3 sm:p-4 border-b border-[#2a2a2a] bg-[#1a1a1a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm sm:text-base truncate">{section.code}: {section.title}</h3>
            <p className="text-xs text-[#6a6a6a] mt-1 hidden sm:block">Select a datapoint to edit</p>
          </div>
          <button 
            onClick={onBulkImportClick || (() => setIsBulkImportOpen(true))}
            className="text-xs text-[#0066ff] font-medium flex items-center gap-1 hover:bg-[#1a1a1a] px-2 py-1 rounded transition-colors whitespace-nowrap"
          >
            <UploadCloud className="w-3 h-3" /> Bulk Import
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {section.datapoints.map(dp => {
             const currentValue = dp.values[reportingYear];
             const isFilled = currentValue !== null && currentValue !== '' && currentValue !== undefined;
             
             return (
               <button
                 key={dp.id}
                 onClick={() => setActiveDatapointId(dp.id)}
                 className={`w-full text-left p-3 sm:p-4 border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors flex items-start gap-2 sm:gap-3 min-w-0 ${
                   activeDatapointId === dp.id ? 'bg-[#1a1a1a] border-l-4 border-l-[#0066ff]' : 'border-l-4 border-l-transparent'
                 }`}
               >
                 <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isFilled ? 'bg-[#00ff88]' : 'bg-[#6a6a6a]'}`} />
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <span className="text-[10px] sm:text-xs font-mono font-bold text-[#6a6a6a] truncate">{dp.code}</span>
                        <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 rounded-full border ${getStatusColor(dp.status)} flex-shrink-0`}>{dp.status}</span>
                      </div>
                      {dp.aiVerification?.status === 'verified' && (
                         <Sparkles className="w-3 h-3 text-[#00d4ff] flex-shrink-0" />
                      )}
                   </div>
                   <p className="text-xs sm:text-sm font-medium text-white mt-1 line-clamp-2 break-words">{dp.name}</p>
                   <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] sm:text-[10px] text-[#6a6a6a] uppercase truncate">{dp.department}</span>
                   </div>
                 </div>
               </button>
             );
          })}
        </div>
      </div>

      {/* Editor Panel */}
      <div className={`${splitLayout.right} bg-[#1e1e1e] border border-[#2a2a2a] rounded flex flex-col min-h-0 lg:min-h-full`}>
        {activeDatapoint ? (
          <>
            <div className="p-3 sm:p-4 lg:p-6 border-b border-[#2a2a2a] flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                 <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <span className="text-xs sm:text-sm font-mono text-[#6a6a6a] bg-[#1a1a1a] px-2 py-0.5 rounded">{activeDatapoint.code}</span>
                    <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#6a6a6a]">{activeDatapoint.type}</span>
                    <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#0066ff] bg-[#1a1a1a] px-1.5 py-0.5 rounded">{activeDatapoint.department}</span>
                 </div>
                 <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white break-words">{activeDatapoint.name}</h2>
                 <p className="text-xs sm:text-sm text-[#aaaaaa] mt-2 break-words">{activeDatapoint.description}</p>
              </div>
              
              {/* Owner Badge */}
              <div className="flex items-center gap-2 bg-[#1a1a1a] px-2 sm:px-3 py-1.5 rounded-full border border-[#2a2a2a] flex-shrink-0">
                 <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0066ff] to-[#00d4ff] flex items-center justify-center text-[10px] font-bold text-white">
                    {activeOwner ? activeOwner.avatar : '?'}
                 </div>
                 <div className="flex flex-col hidden sm:flex">
                     <span className="text-[10px] text-[#6a6a6a] uppercase leading-none">Owner</span>
                     <span className="text-xs font-medium text-white leading-none truncate max-w-[100px]">{activeOwner ? activeOwner.name : 'Unassigned'}</span>
                 </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-6 lg:space-y-8">
              
              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-[#2a2a2a]">
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'data'
                      ? 'border-[#0066ff] text-white'
                      : 'border-transparent text-[#6a6a6a] hover:text-white'
                  }`}
                >
                  Datos
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
                  Evidencias
                </button>
                <button
                  onClick={() => setActiveTab('consolidation')}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'consolidation'
                      ? 'border-[#0066ff] text-white'
                      : 'border-transparent text-[#6a6a6a] hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  Consolidación
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'data' && activeDatapoint && (
                <>
              {/* === INPUT SECTION === */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                   <label className="block text-xs sm:text-sm font-medium text-white">
                     Reported Data {activeDatapoint.unit && <span className="text-[#6a6a6a] font-normal">({activeDatapoint.unit})</span>}
                   </label>
                   {activeDatapoint.type === 'quantitative' && (
                     <span className="text-[10px] sm:text-xs text-[#6a6a6a]">Scale: Units (unless specified)</span>
                   )}
                </div>
                
                {activeDatapoint.type === 'quantitative' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                    {/* INPUTS FOR 3 YEARS */}
                    <div className="lg:col-span-3 space-y-3 sm:space-y-4">
                       {reportingYears.map((year, index) => {
                          const val = activeDatapoint.values[year];
                          const prevVal = activeDatapoint.values[year - 1];
                          const delta = calculateDelta(val ? Number(val) : null, prevVal ? Number(prevVal) : null);
                          const isCurrentYear = year === reportingYear;

                          return (
                             <div key={year} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 relative">
                                <span className="w-12 text-xs sm:text-sm font-bold text-[#6a6a6a] flex-shrink-0">{year}</span>
                                <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
                                  <input
                                    type="number"
                                    value={val !== null && val !== undefined ? val : ''}
                                    onChange={(e) => handleValueChange(year, e.target.value)}
                                    disabled={activeDatapoint.status === WorkflowStatus.LOCKED}
                                    className={`flex-1 rounded border bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-[#6a6a6a] text-sm sm:text-base p-2 sm:p-2.5 focus:outline-none focus:border-[#00d4ff] transition-colors ${isCurrentYear ? 'ring-2 ring-[#0066ff]/30 border-[#0066ff]' : ''}`}
                                    placeholder="0.00"
                                  />
                                  <div className="w-16 sm:w-20 text-right flex-shrink-0">
                                     {delta !== null && (
                                        <div className={`text-[10px] sm:text-xs font-medium flex items-center justify-end gap-1 ${delta > 0 ? 'text-[#ff4444]' : delta < 0 ? 'text-[#00ff88]' : 'text-[#6a6a6a]'}`}>
                                           {Math.abs(delta) >= 20 && <AlertCircle className="w-3 h-3 flex-shrink-0" title="Variación significativa - revisar" />}
                                           {delta > 0 ? <TrendingUp className="w-3 h-3"/> : delta < 0 ? <TrendingDown className="w-3 h-3"/> : <Minus className="w-3 h-3"/>}
                                           {Math.abs(delta).toFixed(1)}%
                                        </div>
                                     )}
                                  </div>
                                </div>
                                {isCurrentYear && activeDatapoint.aiVerification && (
                                   <div className="absolute right-0 top-0 sm:right-[-24px] sm:top-3">
                                      {activeDatapoint.aiVerification.status === 'verified' ? (
                                         <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#00ff88]" />
                                      ) : activeDatapoint.aiVerification.status === 'mismatch' ? (
                                         <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff4444]" />
                                      ) : null}
                                   </div>
                                )}
                             </div>
                          );
                       })}
                    </div>
                    {/* VISUALIZATION */}
                    <div className="lg:col-span-2 bg-[#1a1a1a] rounded-lg p-2 border border-[#2a2a2a] flex items-center justify-center relative min-h-[120px] sm:min-h-[150px]">
                       <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                          <BarChart data={chartData}>
                             <XAxis dataKey="year" hide />
                             <Tooltip 
                               cursor={{fill: 'transparent'}} 
                               contentStyle={{ 
                                 backgroundColor: '#1e1e1e', 
                                 border: '1px solid #2a2a2a',
                                 borderRadius: '4px',
                                 color: '#ffffff',
                                 fontSize: '12px'
                               }}
                             />
                             <Bar dataKey="value" fill="#0066ff" radius={[4, 4, 0, 0]} barSize={20} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  // QUALITATIVE INPUT (Focused on Current Year)
                  <textarea
                    rows={6}
                    value={activeDatapoint.values[reportingYear]?.toString() || ''}
                    onChange={(e) => handleValueChange(reportingYear, e.target.value)}
                    disabled={activeDatapoint.status === WorkflowStatus.LOCKED}
                    className="block w-full rounded border bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-[#6a6a6a] text-sm sm:text-base p-3 focus:outline-none focus:border-[#00d4ff] transition-colors resize-y"
                    placeholder={`Enter qualitative disclosure for ${reportingYear}...`}
                  />
                )}
              </div>

              {/* === AI VERIFICATION PANEL === */}
              {activeDatapoint.evidence && activeDatapoint.evidence.length > 0 && activeDatapoint.values[reportingYear] && (
                 <div className={`rounded-lg border p-3 sm:p-4 transition-all ${
                    activeDatapoint.aiVerification 
                      ? activeDatapoint.aiVerification.status === 'verified' ? 'bg-[#1a1a1a] border-[#00ff88]' : 'bg-[#1a1a1a] border-[#ff4444]'
                      : 'bg-gradient-to-r from-[#1a1a1a] to-[#1e1e1e] border-[#0066ff]'
                 }`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                       <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-white">
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-[#00d4ff]" /> AI Evidence Verification
                       </h4>
                       {!activeDatapoint.aiVerification && (
                          <button 
                             onClick={handleRunAiVerification}
                             disabled={isVerifying}
                             className="text-[10px] sm:text-xs bg-[#0066ff] border border-[#0066ff] text-white px-2 sm:px-3 py-1 rounded-full hover:bg-[#0052cc] flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                             {isVerifying ? <ScanEye className="w-3 h-3 animate-spin" /> : <ScanEye className="w-3 h-3" />}
                             {isVerifying ? 'Scanning...' : 'Verify Data'}
                          </button>
                       )}
                    </div>
                    
                    {activeDatapoint.aiVerification ? (
                       <div className="text-[10px] sm:text-xs">
                          <p className={`font-semibold mb-1 ${activeDatapoint.aiVerification.status === 'verified' ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                             {activeDatapoint.aiVerification.status === 'verified' ? 'Verified Match' : 'Discrepancy Detected'}
                          </p>
                          <p className="text-[#aaaaaa] leading-relaxed break-words">
                             {activeDatapoint.aiVerification.reasoning}
                          </p>
                          {activeDatapoint.aiVerification.extractedValue && (
                             <p className="mt-2 text-[#6a6a6a] font-mono bg-[#0a0a0a] inline-block px-1 rounded text-[10px]">
                                Evidence Source Value: {activeDatapoint.aiVerification.extractedValue}
                             </p>
                          )}
                          <div className="mt-2 flex gap-2">
                             <button onClick={handleRunAiVerification} className="underline text-[#6a6a6a] hover:text-white transition-colors">Re-run</button>
                          </div>
                       </div>
                    ) : (
                       <p className="text-[10px] sm:text-xs text-[#aaaaaa] opacity-70 break-words">
                          Click to automatically compare the reported value ({activeDatapoint.values[reportingYear]}) against "{activeDatapoint.evidence[0]}".
                       </p>
                    )}
                 </div>
              )}

              {/* Evidence & Collaboration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 min-h-[200px] sm:min-h-[256px]">
                 
                 {/* Evidence Column */}
                 <div className="space-y-2 sm:space-y-3 flex flex-col min-h-0">
                    <label className="block text-xs sm:text-sm font-medium text-white flex items-center gap-2">
                       <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" /> Evidence & Files
                    </label>
                    <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg p-3 sm:p-4 text-center hover:bg-[#1a1a1a] hover:border-[#0066ff] transition-colors cursor-pointer flex-1 flex flex-col items-center justify-center group min-h-[120px]">
                       <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8 text-[#6a6a6a] group-hover:text-[#0066ff] mb-2 transition-colors" />
                       <p className="text-xs sm:text-sm text-[#aaaaaa]">Drag files here</p>
                       <p className="text-[10px] sm:text-xs text-[#6a6a6a] mt-1">Supports PDF, Excel</p>
                    </div>
                    {activeDatapoint.evidence && activeDatapoint.evidence.length > 0 && (
                        <div className="space-y-1">
                            {activeDatapoint.evidence.map((file, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 text-xs sm:text-sm text-white bg-[#1a1a1a] border border-[#2a2a2a] p-2 rounded">
                                    <div className="flex items-center gap-2 truncate min-w-0">
                                      <FileText className="w-3 h-3 text-[#0066ff] flex-shrink-0"/> <span className="truncate">{file}</span>
                                    </div>
                                    <button className="text-[#6a6a6a] hover:text-[#ff4444] flex-shrink-0"><X className="w-3 h-3"/></button>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>

                 {/* Collaboration/Chat Column */}
                 <div className="space-y-2 sm:space-y-3 flex flex-col min-h-0">
                    <label className="block text-xs sm:text-sm font-medium text-white flex items-center gap-2">
                       <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" /> Collaboration Thread
                    </label>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg flex flex-col flex-1 overflow-hidden min-h-[120px]">
                       <div className="flex-1 p-2 sm:p-3 overflow-y-auto space-y-2 sm:space-y-3">
                          {activeDatapoint.comments && activeDatapoint.comments.length > 0 ? (
                             activeDatapoint.comments.map(comment => (
                                <div key={comment.id} className={`flex flex-col ${comment.userId === currentUser.id ? 'items-end' : 'items-start'}`}>
                                   <div className={`max-w-[85%] rounded-lg p-2 text-[10px] sm:text-xs break-words ${comment.userId === currentUser.id ? 'bg-[#0066ff] text-white' : 'bg-[#1e1e1e] border border-[#2a2a2a] text-white'}`}>
                                      <p className="font-bold mb-0.5 text-[9px] opacity-75">{comment.userName}</p>
                                      {comment.text}
                                   </div>
                                   <span className="text-[9px] text-[#6a6a6a] mt-1">
                                      {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </span>
                                </div>
                             ))
                          ) : (
                             <div className="h-full flex flex-col items-center justify-center text-[#6a6a6a] text-xs">
                                <p>No comments yet.</p>
                                <p className="text-[10px]">Start a discussion</p>
                             </div>
                          )}
                       </div>
                       <div className="p-2 border-t border-[#2a2a2a] bg-[#0a0a0a] flex gap-2">
                          <input 
                             type="text" 
                             value={newComment}
                             onChange={(e) => setNewComment(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                             placeholder="Type a comment..."
                             className="flex-1 text-xs sm:text-sm border-none focus:ring-0 bg-transparent text-white placeholder:text-[#6a6a6a] outline-none"
                          />
                          <button onClick={handlePostComment} disabled={!newComment.trim()} className="p-1.5 bg-[#0066ff] text-white rounded hover:bg-[#0052cc] disabled:opacity-50 transition-colors">
                             <Send className="w-3 h-3" />
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
                </>
              )}

              {activeTab === 'evidence' && activeDatapoint && (
                <EvidenceManager
                  datapoint={activeDatapoint}
                  reportingYear={reportingYear}
                  currentUserId={currentUser.id}
                  onEvidenceUpdate={(evidenceFiles) => {
                    // Convert EvidenceFile[] to string[] for compatibility
                    const evidenceStrings = evidenceFiles.map(ef => ef.fileName);
                    onUpdateDatapoint(activeDatapoint.id, { evidence: evidenceStrings });
                  }}
                />
              )}

              {activeTab === 'consolidation' && consolidatedDatapoint && (
                <DataConsolidatorWrapper
                  datapoint={consolidatedDatapoint}
                  reportingYear={reportingYear}
                  users={users}
                  onUpdateDatapoint={(datapointId, updates) => {
                    onUpdateDatapoint(datapointId, updates);
                  }}
                />
              )}
            </div>

            {/* Governance Toolbar */}
            <div className="p-3 sm:p-4 bg-[#1a1a1a] border-t border-[#2a2a2a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#6a6a6a]">
                <History className="w-3 h-3 sm:w-4 sm:h-4" /> 
                <span className="hidden sm:inline">Last modified: </span>
                <span>{activeDatapoint.lastModified ? new Date(activeDatapoint.lastModified).toLocaleDateString() : 'Never'}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                 {activeDatapoint.status === WorkflowStatus.DRAFT && (
                    <button 
                       onClick={() => handleStatusChange(WorkflowStatus.REVIEW)}
                       className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#0066ff] text-white rounded text-xs sm:text-sm font-medium hover:bg-[#0052cc] transition-colors"
                    >
                       Submit for Review
                    </button>
                 )}
                 {activeDatapoint.status === WorkflowStatus.REVIEW && (
                    <>
                    <button 
                       onClick={() => handleStatusChange(WorkflowStatus.DRAFT)}
                       className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-transparent border border-[#2a2a2a] text-white rounded text-xs sm:text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                    >
                       Reject
                    </button>
                    <button 
                       onClick={() => handleStatusChange(WorkflowStatus.APPROVED)}
                       className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#00ff88] text-black rounded text-xs sm:text-sm font-medium hover:bg-[#00cc6a] transition-colors"
                    >
                       Approve
                    </button>
                    </>
                 )}
                 {activeDatapoint.status === WorkflowStatus.APPROVED && (
                    <button 
                       onClick={() => handleStatusChange(WorkflowStatus.DRAFT)}
                       className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-transparent border border-[#2a2a2a] text-white rounded text-xs sm:text-sm font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
                    >
                       <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" /> Re-open
                    </button>
                 )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#6a6a6a] p-6">
             <p className="text-sm sm:text-base">Select a datapoint to view details</p>
          </div>
        )}
      </div>

      {/* Bulk Import Modal (solo cuando no se usa callback externo) */}
      {!onBulkImportClick && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          section={section}
          reportingYear={reportingYear}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
        />
      )}
    </div>
  );
};

export default DataInput;
