import { ConsolidatedDatapoint, ConsolidationSource, ConsolidationBreakdown, ConsolidationConfig, ConsolidatedValue, SourceValue } from '../types';
import { convertToBaseUnit, getMetricType, normalizeSourceValues } from './unitConversionService';

/**
 * Consolidates values from multiple sources based on the consolidation method
 */
export const consolidateValues = (
  sources: ConsolidationSource[],
  config: ConsolidationConfig,
  reportingYear: number
): {
  consolidatedValue: string | number | null;
  breakdowns: ConsolidationBreakdown[];
  metadata?: {
    includedSourceIds: string[];
    excludedSourceIds: string[];
    exclusionReasons: Record<string, string>;
    unitConversions: Record<string, any>;
  };
} => {
  // Validate inputs
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return {
      consolidatedValue: null,
      breakdowns: []
    };
  }

  if (!config || !config.method) {
    throw new Error('Invalid consolidation config: method is required');
  }

  if (typeof reportingYear !== 'number' || reportingYear < 1900 || reportingYear > 2100) {
    throw new Error(`Invalid reporting year: ${reportingYear}`);
  }

  const yearKey = reportingYear.toString();
  const datapoint = config.datapointId ? { code: config.datapointId, unit: undefined } : { code: '', unit: undefined };
  
  // Extract values with unit conversion support
  const values = sources
    .map(s => {
      if (!s || !s.id || !s.name) {
        return null;
      }
      
      const rawValue = s.values?.[yearKey];
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return null;
      }
      
      // Handle SourceValue format or simple value
      let value: string | number | null;
      let unit: string | undefined;
      
      if (typeof rawValue === 'object' && 'value' in rawValue) {
        const sourceValue = rawValue as SourceValue;
        value = sourceValue.value;
        unit = sourceValue.unit;
      } else {
        value = rawValue;
        unit = undefined; // Will use datapoint base unit
      }
      
      return { source: s, value, unit };
    })
    .filter((v): v is { source: ConsolidationSource; value: string | number | null; unit?: string } => 
      v !== null && v.value !== null && v.value !== undefined && v.value !== ''
    );

  if (values.length === 0) {
    return {
      consolidatedValue: null,
      breakdowns: []
    };
  }

  let consolidatedValue: string | number | null = null;
  const breakdowns: ConsolidationBreakdown[] = [];
  const unitConversions: Record<string, any> = {};
  const includedSourceIds: string[] = [];
  const excludedSourceIds: string[] = [];
  const exclusionReasons: Record<string, string> = {};

  // Convert all values to numbers with unit conversion if enabled
  const numericValues = values.map(v => {
    const num = typeof v.value === 'number' ? v.value : parseFloat(String(v.value));
    
    if (isNaN(num) || !isFinite(num)) {
      excludedSourceIds.push(v.source.id);
      exclusionReasons[v.source.id] = 'Valor no numérico o inválido';
      return null;
    }
    
    // Unit conversion if enabled and unit differs
    let finalValue = num;
    if (config.unitConversionEnabled && v.unit && datapoint.unit && v.unit !== datapoint.unit) {
      const metricType = getMetricType(datapoint.code, datapoint.unit);
      const conversion = convertToBaseUnit(num, v.unit, metricType);
      
      if (conversion.conversion) {
        finalValue = conversion.convertedValue;
        unitConversions[v.source.id] = conversion.conversion;
      } else {
        // Conversion not found, but value is valid - use as is
        console.warn(`Unit conversion not available for ${v.unit} to ${datapoint.unit}`);
      }
    }
    
    includedSourceIds.push(v.source.id);
    return {
      source: v.source,
      value: finalValue,
      originalValue: num,
      unit: v.unit
    };
  }).filter((v): v is { source: ConsolidationSource; value: number; originalValue: number; unit?: string } => 
    v !== null
  );

  if (numericValues.length === 0) {
    return {
      consolidatedValue: null,
      breakdowns: []
    };
  }

  switch (config.method) {
    case 'sum':
      consolidatedValue = numericValues.reduce((sum, v) => sum + v.value, 0);
      break;

    case 'average':
      const sum = numericValues.reduce((s, v) => s + v.value, 0);
      consolidatedValue = numericValues.length > 0 ? sum / numericValues.length : 0;
      break;

    case 'weighted_average':
      if (config.weights && Object.keys(config.weights).length > 0) {
        const totalWeight = numericValues.reduce((sum, v) => {
          const weight = Math.max(0, config.weights![v.source.id] || 1);
          return sum + weight;
        }, 0);
        
        if (totalWeight > 0) {
          const weightedSum = numericValues.reduce((sum, v) => {
            const weight = Math.max(0, config.weights![v.source.id] || 1);
            return sum + (v.value * weight);
          }, 0);
          consolidatedValue = weightedSum / totalWeight;
        } else {
          // Fallback to simple average if total weight is 0
          const sum = numericValues.reduce((s, v) => s + v.value, 0);
          consolidatedValue = numericValues.length > 0 ? sum / numericValues.length : 0;
        }
      } else {
        // Fallback to simple average if no weights
        const sum = numericValues.reduce((s, v) => s + v.value, 0);
        consolidatedValue = numericValues.length > 0 ? sum / numericValues.length : 0;
      }
      break;

    case 'max':
      consolidatedValue = Math.max(...numericValues.map(v => v.value));
      break;

    case 'min':
      consolidatedValue = Math.min(...numericValues.map(v => v.value));
      break;

    case 'custom':
      // For custom formulas, would need a formula parser
      // For now, default to sum
      consolidatedValue = numericValues.reduce((sum, v) => sum + v.value, 0);
      break;

    default:
      consolidatedValue = numericValues[0].value;
  }

  // Validate result is finite
  if (typeof consolidatedValue === 'number' && (!isFinite(consolidatedValue) || isNaN(consolidatedValue))) {
    console.warn(`Invalid consolidated value calculated: ${consolidatedValue}. Using first valid value.`);
    consolidatedValue = numericValues[0].value;
  }

  // Generate breakdowns
  if (consolidatedValue !== null && typeof consolidatedValue === 'number' && isFinite(consolidatedValue) && consolidatedValue !== 0) {
    numericValues.forEach(({ source, value }) => {
      if (isFinite(value) && value !== null) {
        const percentage = Math.abs(consolidatedValue as number) > 0 
          ? (value / Math.abs(consolidatedValue as number)) * 100 
          : 0;
        
        // Determine dimension based on source type
        let dimension: 'geography' | 'business_unit' | 'facility' = 'geography';
        if (source.type === 'business_unit' || source.type === 'subsidiary') {
          dimension = 'business_unit';
        } else if (source.type === 'facility') {
          dimension = 'facility';
        }

        breakdowns.push({
          dimension,
          dimensionValue: source.name || 'Unknown',
          value,
          percentage: Math.round(percentage * 100) / 100,
          sourceId: source.id
        });
      }
    });
  }

  return {
    consolidatedValue,
    breakdowns,
    metadata: {
      includedSourceIds,
      excludedSourceIds,
      exclusionReasons,
      unitConversions
    }
  };
};

/**
 * Enhanced consolidation with full traceability
 * Returns ConsolidatedValue with complete metadata
 */
export const consolidateValuesWithTraceability = (
  sources: ConsolidationSource[],
  config: ConsolidationConfig,
  reportingYear: number,
  datapoint: ConsolidatedDatapoint,
  userId: string
): ConsolidatedValue => {
  const yearKey = reportingYear.toString();
  const calculationId = `consolidation_${datapoint.id}_${yearKey}_${Date.now()}`;
  
  // Use existing consolidateValues function
  const result = consolidateValues(sources, config, reportingYear);
  
  // Calculate coverage
  const totalSources = sources.length;
  const sourcesWithData = result.metadata?.includedSourceIds.length || 0;
  const coveragePercentage = totalSources > 0 
    ? Math.round((sourcesWithData / totalSources) * 100) 
    : 0;
  
  // Calculate quality score (average of source quality scores if available)
  const qualityScores = sources
    .filter(s => result.metadata?.includedSourceIds.includes(s.id))
    .map(s => {
      // Try to get quality score from source value metadata
      const yearValue = s.values[yearKey];
      if (typeof yearValue === 'object' && yearValue !== null && 'metadata' in yearValue) {
        const sourceValue = yearValue as SourceValue;
        return sourceValue.metadata?.qualityScore || 70; // Default 70 if not available
      }
      return 70; // Default quality score
    });
  
  const averageQualityScore = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : 70;
  
  return {
    value: result.consolidatedValue,
    unit: datapoint.unit || 'units',
    method: config.method,
    sourcesCount: sourcesWithData,
    coveragePercentage,
    calculationDetails: {
      includedSourceIds: result.metadata?.includedSourceIds || [],
      excludedSourceIds: result.metadata?.excludedSourceIds || [],
      exclusionReasons: result.metadata?.exclusionReasons || {},
      unitConversions: result.metadata?.unitConversions || {}
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      calculatedBy: userId,
      calculationId,
      qualityScore: Math.round(averageQualityScore)
    }
  };
};

/**
 * Validates consolidation sources for consistency
 */
export const validateConsolidationSources = (
  sources: ConsolidationSource[],
  datapoint: ConsolidatedDatapoint
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!sources || !Array.isArray(sources)) {
    errors.push('Sources must be an array');
    return { valid: false, errors, warnings };
  }

  if (sources.length === 0) {
    errors.push('At least one consolidation source is required');
    return { valid: false, errors, warnings };
  }

  if (!datapoint || !datapoint.id) {
    errors.push('Invalid datapoint provided');
    return { valid: false, errors, warnings };
  }

  // Validate each source
  sources.forEach((source, index) => {
    if (!source || !source.id) {
      errors.push(`Source at index ${index} is missing required id`);
    }
    if (!source || !source.name || source.name.trim() === '') {
      errors.push(`Source at index ${index} is missing required name`);
    }
    if (!source || !source.responsibleUserId) {
      warnings.push(`Source "${source?.name || `at index ${index}`}" is missing responsible user`);
    }
    if (!source || !source.type) {
      warnings.push(`Source "${source?.name || `at index ${index}`}" is missing type`);
    }
  });

  // Check for duplicate source names
  const sourceNames = sources.map(s => s?.name).filter(Boolean);
  const duplicates = sourceNames.filter((name, index) => sourceNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate source names found: ${[...new Set(duplicates)].join(', ')}`);
  }

  // Check for duplicate source IDs
  const sourceIds = sources.map(s => s?.id).filter(Boolean);
  const duplicateIds = sourceIds.filter((id, index) => sourceIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate source IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
  }

  // Check that all sources have values for the same years
  if (sources.length > 1) {
    const years = new Set<string>();
    sources.forEach(s => {
      Object.keys(s.values).forEach(year => years.add(year));
    });
    
    sources.forEach(source => {
      const sourceYears = Object.keys(source.values);
      const missingYears = Array.from(years).filter(y => !sourceYears.includes(y));
      if (missingYears.length > 0) {
        warnings.push(`Source "${source.name}" is missing values for years: ${missingYears.join(', ')}`);
      }
    });
  }

  // Validate values match datapoint type
  sources.forEach(source => {
    if (!source || !source.values) return;
    
    Object.entries(source.values).forEach(([year, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (datapoint.type === 'quantitative') {
          const num = typeof value === 'number' ? value : parseFloat(String(value));
          if (isNaN(num) || !isFinite(num)) {
            errors.push(`Source "${source.name || 'Unknown'}" has invalid numeric value for year ${year}: ${value}`);
          }
        }
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Generates consolidation summary statistics
 */
export const generateConsolidationSummary = (
  consolidatedDatapoint: ConsolidatedDatapoint,
  reportingYear: number
): {
  totalSources: number;
  sourcesWithData: number;
  coveragePercentage: number;
  valueRange: { min: number | null; max: number | null };
  averageValue: number | null;
  breakdownByDimension: Record<string, Array<{ name: string; value: number; percentage: number }>>;
} => {
  // Validate inputs
  if (!consolidatedDatapoint || !consolidatedDatapoint.sources || !Array.isArray(consolidatedDatapoint.sources)) {
    return {
      totalSources: 0,
      sourcesWithData: 0,
      coveragePercentage: 0,
      valueRange: { min: null, max: null },
      averageValue: null,
      breakdownByDimension: {}
    };
  }

  if (typeof reportingYear !== 'number' || reportingYear < 1900 || reportingYear > 2100) {
    return {
      totalSources: consolidatedDatapoint.sources.length,
      sourcesWithData: 0,
      coveragePercentage: 0,
      valueRange: { min: null, max: null },
      averageValue: null,
      breakdownByDimension: {}
    };
  }

  const yearKey = reportingYear.toString();
  const sourcesWithData = consolidatedDatapoint.sources.filter(s => 
    s && s.values && s.values[yearKey] !== null && s.values[yearKey] !== undefined && s.values[yearKey] !== ''
  );

  const numericValues = sourcesWithData
    .map(s => {
      const val = s.values[yearKey];
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return isNaN(num) || !isFinite(num) ? null : num;
    })
    .filter((v): v is number => v !== null);

  const breakdownByDimension: Record<string, Array<{ name: string; value: number; percentage: number }>> = {};
  
  if (consolidatedDatapoint.breakdowns && Array.isArray(consolidatedDatapoint.breakdowns)) {
    consolidatedDatapoint.breakdowns.forEach(breakdown => {
      if (!breakdown || !breakdown.dimension || !breakdown.dimensionValue) return;
      
      if (!breakdownByDimension[breakdown.dimension]) {
        breakdownByDimension[breakdown.dimension] = [];
      }
      
      const numValue = typeof breakdown.value === 'number' ? breakdown.value : parseFloat(String(breakdown.value));
      if (isFinite(numValue)) {
        breakdownByDimension[breakdown.dimension].push({
          name: breakdown.dimensionValue,
          value: numValue,
          percentage: typeof breakdown.percentage === 'number' && isFinite(breakdown.percentage) 
            ? Math.max(0, Math.min(100, breakdown.percentage)) 
            : 0
        });
      }
    });
  }

  return {
    totalSources: consolidatedDatapoint.sources.length,
    sourcesWithData: sourcesWithData.length,
    coveragePercentage: consolidatedDatapoint.sources.length > 0 
      ? Math.round((sourcesWithData.length / consolidatedDatapoint.sources.length) * 100)
      : 0,
    valueRange: {
      min: numericValues.length > 0 ? Math.min(...numericValues) : null,
      max: numericValues.length > 0 ? Math.max(...numericValues) : null
    },
    averageValue: numericValues.length > 0 
      ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length 
      : null,
    breakdownByDimension
  };
};
