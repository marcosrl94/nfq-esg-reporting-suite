import React, { useState } from 'react';
import { Datapoint, StandardSection } from '../types';
import { generateNarrativeStream, checkConsistency } from '../services/geminiService';
import { Sparkles, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';
import { getSplitLayout } from '../utils/responsive';

interface NarrativeEngineProps {
  section: StandardSection;
  reportingYear: number;
}

const NarrativeEngine: React.FC<NarrativeEngineProps> = ({ section, reportingYear }) => {
  const { isMobile } = useMobile();
  const splitLayout = getSplitLayout(true);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState('Standard Corporate');
  const [consistencyCheck, setConsistencyCheck] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedText('');
    setConsistencyCheck(null);
    try {
      // Check if there are datapoints with data
      const datapointsWithData = section.datapoints.filter(d => {
        const val = d.values[reportingYear];
        return val !== null && val !== '' && val !== undefined;
      });

      if (datapointsWithData.length === 0) {
        setGeneratedText("Error: No hay datapoints con datos para el año de reporte. Por favor, ingresa datos antes de generar la narrativa.");
        setIsGenerating(false);
        return;
      }

      await generateNarrativeStream(datapointsWithData, section.title, tone, (chunk) => {
        setGeneratedText(prev => prev + chunk);
      });
      
      // Run consistency check in background after generation completes
      try {
        const consistencyResult = await checkConsistency(section.datapoints);
        setConsistencyCheck(consistencyResult);
      } catch (consistencyError) {
        console.warn('Consistency check failed:', consistencyError);
        // Don't fail the whole operation if consistency check fails
      }

    } catch (error) {
      console.error('Error generating narrative:', error);
      
      let errorMessage = 'Error desconocido al generar narrativa';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Parse error message to show user-friendly text
      if (errorMessage.includes('API Key') || errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('no configurada') || errorMessage.includes('no es válida')) {
        setGeneratedText(
          "❌ Error: Clave API de Google Gemini no configurada o inválida.\n\n" +
          "Para solucionarlo:\n" +
          "1. Crea un archivo .env.local en la raíz del proyecto\n" +
          "2. Agrega la línea: GEMINI_API_KEY=tu_clave_api_aqui\n" +
          "3. Reinicia el servidor de desarrollo\n\n" +
          "Puedes obtener una API key en: https://makersuite.google.com/app/apikey"
        );
      } else if (errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('conexión')) {
        setGeneratedText(
          "❌ Error: Problema de conexión.\n\n" +
          "Por favor, verifica tu conexión a internet e inténtalo de nuevo."
        );
      } else {
        // Extract clean error message (remove JSON structure if present)
        let cleanMessage = errorMessage;
        if (errorMessage.includes('{')) {
          try {
            const errorObj = JSON.parse(errorMessage);
            cleanMessage = errorObj.error?.message || errorObj.message || errorMessage;
          } catch {
            // If not valid JSON, use original message
          }
        }
        
        setGeneratedText(
          `❌ Error al generar narrativa:\n\n${cleanMessage}\n\n` +
          "Por favor, verifica tus datos y la configuración de la API key e inténtalo de nuevo."
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate stats based on current reporting year
  const filledDatapoints = section.datapoints.filter(d => {
    const val = d.values[reportingYear];
    return val !== null && val !== '' && val !== undefined;
  }).length;
  
  const totalDatapoints = section.datapoints.length;
  const progress = Math.round((filledDatapoints / totalDatapoints) * 100);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 min-w-0">
      {/* Configuration Panel */}
      <div className={`${splitLayout.left} space-y-4 sm:space-y-6 overflow-y-auto`}>
        <div className="bg-[#1e1e1e] p-4 sm:p-6 rounded-lg border border-[#2a2a2a]">
          <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#00d4ff]" />
            AI Narrative Engine
          </h2>
          <p className="text-xs sm:text-sm text-[#aaaaaa] mb-4 sm:mb-6">
            Generate ESRS-compliant disclosures based on your governed data. The AI will adhere to approved datapoints and analyze year-over-year trends.
          </p>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-1">Standard Context</label>
              <div className="p-2 sm:p-3 bg-[#1a1a1a] rounded text-xs sm:text-sm text-white font-mono border border-[#2a2a2a]">
                {section.code}: {section.title}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-1">Narrative Tone</label>
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded border bg-[#1a1a1a] border-[#2a2a2a] text-white text-xs sm:text-sm p-2 focus:outline-none focus:border-[#00d4ff] transition-colors"
              >
                <option className="bg-[#1a1a1a]">Standard Corporate</option>
                <option className="bg-[#1a1a1a]">Investor Focused (Financial Materiality)</option>
                <option className="bg-[#1a1a1a]">Stakeholder Impact (Double Materiality)</option>
                <option className="bg-[#1a1a1a]">Executive Summary</option>
              </select>
            </div>

            <div className="bg-[#1a1a1a] p-3 sm:p-4 rounded-md border border-[#0066ff]">
              <div className="flex justify-between text-xs sm:text-sm text-white mb-2">
                <span>FY {reportingYear} Data Completeness</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-[#0a0a0a] rounded-full h-2">
                <div className="bg-[#0066ff] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-[10px] sm:text-xs text-[#aaaaaa] mt-2">
                {filledDatapoints} of {totalDatapoints} datapoints available for generation.
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || progress === 0}
              className={`w-full flex items-center justify-center gap-2 py-2 sm:py-3 px-4 rounded text-white text-xs sm:text-sm font-medium transition-all ${
                isGenerating ? 'bg-[#0066ff]/50' : 'bg-[#0066ff] hover:bg-[#0052cc]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Generating...' : 'Generate Narrative'}
            </button>
          </div>
        </div>
        
        {/* Consistency Check Result */}
        {consistencyCheck && (
           <div className="bg-[#1e1e1e] p-4 sm:p-6 rounded-lg border border-[#ffaa00]">
              <h3 className="text-xs sm:text-sm font-bold text-white mb-2 flex items-center gap-2">
                 <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-[#ffaa00]" /> Consistency & Trend Check
              </h3>
              <div className="text-[10px] sm:text-xs text-[#aaaaaa] whitespace-pre-wrap break-words">
                 {consistencyCheck}
              </div>
           </div>
        )}
      </div>

      {/* Output Panel */}
      <div className={`${splitLayout.right} bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg flex flex-col min-h-0`}>
         <div className="p-3 sm:p-4 border-b border-[#2a2a2a] bg-[#1a1a1a] flex justify-between items-center flex-shrink-0">
            <h3 className="font-semibold text-white text-xs sm:text-sm">Generated Disclosure Draft (FY {reportingYear})</h3>
            <div className="flex gap-2">
               <button className="p-1.5 sm:p-2 text-[#6a6a6a] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors">
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
               </button>
            </div>
         </div>
         <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-0">
            {generatedText ? (
              <div className="whitespace-pre-wrap leading-relaxed text-white text-sm sm:text-base break-words">
                {generatedText}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#6a6a6a]">
                <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 mb-4 text-[#2a2a2a]" />
                <p className="text-xs sm:text-sm">AI-generated content will appear here.</p>
                <p className="text-[10px] sm:text-xs mt-1">Configure the engine and click Generate to start.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default NarrativeEngine;