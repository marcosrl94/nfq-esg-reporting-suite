import { UnitConversion, UnitConversionApplied } from '../types';

/**
 * Unit conversion service for ESG metrics
 * Handles automatic conversion to base units for consolidation
 */

// Common unit conversions by metric type
const UNIT_CONVERSIONS: Record<string, UnitConversion[]> = {
  // GHG Emissions (Scope 1, 2, 3)
  'ghg_emissions': [
    { unit: 'tCO2e', conversionFactor: 1, isStandard: true },
    { unit: 'kgCO2e', conversionFactor: 0.001, isStandard: false },
    { unit: 'MtCO2e', conversionFactor: 1000, isStandard: false },
    { unit: 'GgCO2e', conversionFactor: 1, isStandard: false }, // Gigagram = metric ton
    { unit: 'ktCO2e', conversionFactor: 1, isStandard: false }, // Kiloton = 1000 tons
  ],
  
  // Energy Consumption
  'energy': [
    { unit: 'MWh', conversionFactor: 1, isStandard: true },
    { unit: 'kWh', conversionFactor: 0.001, isStandard: false },
    { unit: 'GWh', conversionFactor: 1000, isStandard: false },
    { unit: 'TJ', conversionFactor: 3.6, isStandard: false }, // Terajoule
    { unit: 'GJ', conversionFactor: 0.0036, isStandard: false },
    { unit: 'MMBtu', conversionFactor: 0.293071, isStandard: false },
  ],
  
  // Water Consumption
  'water': [
    { unit: 'm³', conversionFactor: 1, isStandard: true },
    { unit: 'L', conversionFactor: 0.001, isStandard: false },
    { unit: 'kL', conversionFactor: 1, isStandard: false }, // Kiloliter = m³
    { unit: 'ML', conversionFactor: 1000, isStandard: false }, // Megaliter
    { unit: 'gal', conversionFactor: 0.00378541, isStandard: false }, // US gallon
    { unit: 'Mgal', conversionFactor: 3785.41, isStandard: false }, // Million gallons
  ],
  
  // Waste
  'waste': [
    { unit: 't', conversionFactor: 1, isStandard: true },
    { unit: 'kg', conversionFactor: 0.001, isStandard: false },
    { unit: 'Mt', conversionFactor: 1000, isStandard: false },
    { unit: 'lb', conversionFactor: 0.000453592, isStandard: false },
  ],
  
  // Percentage (no conversion needed)
  'percentage': [
    { unit: '%', conversionFactor: 1, isStandard: true },
  ],
  
  // Count (no conversion needed)
  'count': [
    { unit: 'units', conversionFactor: 1, isStandard: true },
    { unit: 'employees', conversionFactor: 1, isStandard: false },
    { unit: 'facilities', conversionFactor: 1, isStandard: false },
  ],
};

/**
 * Determines the metric type from datapoint code or unit
 */
export const getMetricType = (datapointCode: string, unit?: string): string => {
  // Check code patterns
  if (datapointCode.includes('E1-6') || datapointCode.includes('GHG') || datapointCode.includes('emissions')) {
    return 'ghg_emissions';
  }
  if (datapointCode.includes('energy') || datapointCode.includes('consumption')) {
    return 'energy';
  }
  if (datapointCode.includes('water') || datapointCode.includes('W')) {
    return 'water';
  }
  if (datapointCode.includes('waste') || datapointCode.includes('W')) {
    return 'waste';
  }
  
  // Check unit patterns
  if (unit) {
    const unitLower = unit.toLowerCase();
    if (unitLower.includes('co2') || unitLower.includes('ghg')) {
      return 'ghg_emissions';
    }
    if (unitLower.includes('wh') || unitLower.includes('joule') || unitLower.includes('btu')) {
      return 'energy';
    }
    if (unitLower.includes('m³') || unitLower.includes('liter') || unitLower.includes('gallon')) {
      return 'water';
    }
    if (unitLower.includes('%')) {
      return 'percentage';
    }
  }
  
  return 'count'; // Default
};

/**
 * Gets base unit for a metric type
 */
export const getBaseUnit = (metricType: string): string => {
  const conversions = UNIT_CONVERSIONS[metricType];
  if (!conversions || conversions.length === 0) {
    return 'units';
  }
  const standard = conversions.find(c => c.isStandard);
  return standard ? standard.unit : conversions[0].unit;
};

/**
 * Gets allowed unit conversions for a metric type
 */
export const getAllowedConversions = (metricType: string): UnitConversion[] => {
  return UNIT_CONVERSIONS[metricType] || [];
};

/**
 * Converts a value from one unit to another
 */
export const convertUnit = (
  value: number,
  fromUnit: string,
  toUnit: string,
  metricType: string
): UnitConversionApplied | null => {
  const conversions = UNIT_CONVERSIONS[metricType];
  if (!conversions || conversions.length === 0) {
    return null;
  }
  
  const fromConversion = conversions.find(c => c.unit === fromUnit);
  const toConversion = conversions.find(c => c.unit === toUnit);
  
  if (!fromConversion || !toConversion) {
    return null;
  }
  
  // Convert to base unit first, then to target unit
  const baseValue = value * fromConversion.conversionFactor;
  const convertedValue = baseValue / toConversion.conversionFactor;
  
  return {
    fromUnit,
    toUnit,
    originalValue: value,
    convertedValue,
    conversionFactor: fromConversion.conversionFactor / toConversion.conversionFactor
  };
};

/**
 * Converts a value to base unit
 */
export const convertToBaseUnit = (
  value: number,
  unit: string,
  metricType: string
): { convertedValue: number; conversion: UnitConversionApplied | null } => {
  const baseUnit = getBaseUnit(metricType);
  
  if (unit === baseUnit) {
    return {
      convertedValue: value,
      conversion: null
    };
  }
  
  const conversion = convertUnit(value, unit, baseUnit, metricType);
  
  if (!conversion) {
    // If conversion not found, assume value is already in base unit
    console.warn(`Unit conversion not found for ${unit} in ${metricType}. Assuming base unit.`);
    return {
      convertedValue: value,
      conversion: null
    };
  }
  
  return {
    convertedValue: conversion.convertedValue,
    conversion
  };
};

/**
 * Validates if a unit is valid for a metric type
 */
export const isValidUnit = (unit: string, metricType: string): boolean => {
  const conversions = UNIT_CONVERSIONS[metricType];
  if (!conversions) {
    return false;
  }
  return conversions.some(c => c.unit === unit);
};

/**
 * Normalizes all source values to base unit for consolidation
 */
export const normalizeSourceValues = (
  sources: Array<{ id: string; values: Record<string, any>; unit?: string }>,
  datapointCode: string,
  baseUnit: string
): Record<string, { convertedValue: number; conversion: UnitConversionApplied | null }> => {
  const metricType = getMetricType(datapointCode, baseUnit);
  const normalized: Record<string, { convertedValue: number; conversion: UnitConversionApplied | null }> = {};
  
  sources.forEach(source => {
    Object.entries(source.values).forEach(([year, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numValue) || !isFinite(numValue)) {
        return;
      }
      
      const sourceUnit = source.unit || baseUnit;
      const result = convertToBaseUnit(numValue, sourceUnit, metricType);
      
      normalized[`${source.id}_${year}`] = result;
    });
  });
  
  return normalized;
};
