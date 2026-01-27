import React, { useState } from 'react';
import { StandardSection, StandardType, Datapoint, WorkflowStatus } from '../types';
import { BookOpen, CheckCircle, ExternalLink, Download } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';
import { getSplitLayout } from '../utils/responsive';
import { getStatusColorClasses } from '../utils/palantirThemeClasses';

interface IndexComposerProps {
  sections: StandardSection[];
}

const IndexComposer: React.FC<IndexComposerProps> = ({ sections }) => {
  const { isMobile } = useMobile();
  const splitLayout = getSplitLayout(true);
  const [activeStandard, setActiveStandard] = useState<StandardType>(StandardType.GRI);

  // Flatten datapoints
  const allDatapoints = sections.flatMap(s => s.datapoints);

  // Filter based on active standard mapping
  const mappedDatapoints = allDatapoints.filter(dp => 
    dp.mappings && dp.mappings[activeStandard as keyof typeof dp.mappings]
  );

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 sm:gap-4 lg:gap-6 min-w-0">
      {/* Sidebar: Standards Selection */}
      <div className={`${splitLayout.left} bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 space-y-2 overflow-y-auto`}>
        <h3 className="text-xs sm:text-sm font-bold text-[#6a6a6a] uppercase tracking-wider mb-3 sm:mb-4 px-2">Reporting Frameworks</h3>
        
        {[StandardType.GRI, StandardType.SASB, StandardType.TCFD, StandardType.ESRS].map((std) => (
          <button
            key={std}
            onClick={() => setActiveStandard(std)}
            className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded flex items-center justify-between transition-colors text-xs sm:text-sm ${
              activeStandard === std 
                ? 'bg-[#0066ff] text-white' 
                : 'hover:bg-[#1a1a1a] text-[#cccccc]'
            }`}
          >
            <span className="font-medium truncate">{std} Content Index</span>
            {activeStandard === std && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-[#00ff88] flex-shrink-0" />}
          </button>
        ))}

        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-[#1a1a1a] rounded-lg border border-[#0066ff]">
           <h4 className="text-[#0066ff] font-bold text-xs sm:text-sm mb-2 flex items-center gap-2">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" /> Integrated Reporting
           </h4>
           <p className="text-[10px] sm:text-xs text-[#aaaaaa] leading-relaxed">
              This module automatically cross-references your ESRS datapoints to other global standards (GRI, SASB, TCFD) to generate the "Anexo" tables required for the Integrated Annual Report.
           </p>
        </div>
      </div>

      {/* Main Content: Index Table */}
      <div className={`${splitLayout.right} bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg flex flex-col min-h-0`}>
        <div className="p-3 sm:p-4 lg:p-6 border-b border-[#2a2a2a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#1a1a1a] rounded-t-lg">
          <div className="min-w-0 flex-1">
             <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">{activeStandard} Reference Table</h2>
             <p className="text-xs sm:text-sm text-[#aaaaaa] mt-1">
                {mappedDatapoints.length} mapped disclosures found in the current dataset.
             </p>
          </div>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-transparent border border-[#2a2a2a] text-white rounded text-xs sm:text-sm font-medium hover:bg-[#1a1a1a] transition-colors whitespace-nowrap">
             <Download className="w-3 h-3 sm:w-4 sm:h-4" /> Export Table
          </button>
        </div>

        <div className="flex-1 overflow-auto p-0 min-h-0">
          {mappedDatapoints.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left min-w-[600px]">
                <thead className="bg-[#1a1a1a] text-[#aaaaaa] font-medium sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 border-b border-[#2a2a2a]">{activeStandard} Ref</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 border-b border-[#2a2a2a]">ESRS Code</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 border-b border-[#2a2a2a]">Description</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 border-b border-[#2a2a2a]">Status</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 border-b border-[#2a2a2a]">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {mappedDatapoints.map((dp) => (
                    <tr key={dp.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono font-bold text-[#0066ff] bg-[#1a1a1a]">
                        {dp.mappings?.[activeStandard as keyof typeof dp.mappings] || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-[#6a6a6a]">{dp.code}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-white min-w-0">
                        <div className="font-medium break-words">{dp.name}</div>
                        <div className="text-[10px] sm:text-xs text-[#6a6a6a] mt-1 line-clamp-2">{dp.description}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] border ${getStatusColorClasses(dp.status)}`}>
                            {dp.status}
                         </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                         {dp.values && dp.values["2024"] ? (
                            <span className="font-medium text-white">
                               {dp.values["2024"]} <span className="text-[#6a6a6a] text-[10px] sm:text-xs font-normal">{dp.unit}</span>
                            </span>
                         ) : (
                            <span className="text-[#6a6a6a] italic">Empty</span>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#6a6a6a] p-6">
               <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mb-4 text-[#2a2a2a]" />
               <p className="text-sm sm:text-base text-white">No mappings found for {activeStandard} in the current dataset.</p>
               <p className="text-xs sm:text-sm mt-1 text-[#aaaaaa]">Try selecting a different standard or adding mappings to your datapoints.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndexComposer;
