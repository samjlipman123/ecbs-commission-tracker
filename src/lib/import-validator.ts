// Validation utilities for import data

import { parse, isValid } from 'date-fns';
import type { ColumnMapping, ValidationResult, ValidationError, ValidationWarning, ImportContract } from '@/types/import';
import { findSupplierMatch, getSuggestedSuppliers, findSupplierMatchDynamic, getSuggestedSuppliersDynamic } from './supplier-list';
import { TARGET_FIELDS } from './column-mapper';

// Supported date formats for parsing
const DATE_FORMATS = [
  'dd/MM/yyyy',
  'd/M/yyyy',
  'dd-MM-yyyy',
  'd-M-yyyy',
  'yyyy-MM-dd',
  'dd.MM.yyyy',
  'd.M.yyyy',
  'MM/dd/yyyy',
  'M/d/yyyy',
];

/**
 * Parse a date string in various formats
 */
export function parseDate(value: string): Date | null {
  if (!value || !value.trim()) return null;

  const trimmed = value.trim();

  // Try each format
  for (const format of DATE_FORMATS) {
    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  // Try native Date parsing as fallback
  const nativeDate = new Date(trimmed);
  if (isValid(nativeDate)) {
    return nativeDate;
  }

  return null;
}

/**
 * Parse a number from string, handling currency symbols and formatting
 */
export function parseNumber(value: string): number {
  if (!value || !value.trim()) return NaN;

  // Strip everything except digits, decimal point, and minus sign
  const cleaned = value.trim().replace(/[^0-9.\-]/g, '');

  const num = parseFloat(cleaned);
  return num;
}

/**
 * Normalize energy type value
 */
export function normalizeEnergyType(value: string): 'Gas' | 'Electric' | null {
  const normalized = value.toLowerCase().trim();

  if (['gas', 'g'].includes(normalized)) {
    return 'Gas';
  }

  if (['electric', 'electricity', 'elec', 'e'].includes(normalized)) {
    return 'Electric';
  }

  return null;
}

/**
 * Validate a single row of data
 */
export function validateRow(
  row: Record<string, string>,
  rowNumber: number,
  mapping: ColumnMapping,
  dbSupplierNames?: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required fields are mapped and have values
  for (const field of TARGET_FIELDS) {
    const sourceColumn = mapping[field.key];

    if (field.required) {
      if (!sourceColumn) {
        errors.push({
          field: field.key,
          message: `${field.label} is not mapped`,
          value: null,
        });
        continue;
      }

      const value = row[sourceColumn]?.trim();
      if (!value) {
        errors.push({
          field: field.key,
          message: `${field.label} is required`,
          value: null,
        });
      }
    }
  }

  // Validate supplier name against database suppliers (or hardcoded list as fallback)
  const supplierColumn = mapping.supplierName;
  if (supplierColumn && row[supplierColumn]) {
    const supplierValue = row[supplierColumn].trim();
    const matchedSupplier = dbSupplierNames
      ? findSupplierMatchDynamic(supplierValue, dbSupplierNames)
      : findSupplierMatch(supplierValue);

    if (!matchedSupplier) {
      const suggestions = dbSupplierNames
        ? getSuggestedSuppliersDynamic(supplierValue, dbSupplierNames)
        : getSuggestedSuppliers(supplierValue);
      errors.push({
        field: 'supplierName',
        message: `Supplier "${supplierValue}" not found in valid supplier list`,
        value: supplierValue,
      });

      if (suggestions.length > 0) {
        warnings.push({
          field: 'supplierName',
          message: 'Did you mean one of these?',
          suggestion: suggestions.join(', '),
        });
      }
    } else if (matchedSupplier !== supplierValue) {
      warnings.push({
        field: 'supplierName',
        message: `Supplier name will be normalized to "${matchedSupplier}"`,
        suggestion: matchedSupplier,
      });
    }
  }

  // Validate date fields
  const dateFields: (keyof ColumnMapping)[] = ['lockInDate', 'contractStartDate', 'contractEndDate'];
  for (const dateField of dateFields) {
    const column = mapping[dateField];
    if (column && row[column]) {
      const value = row[column].trim();
      const parsed = parseDate(value);
      if (!parsed) {
        errors.push({
          field: dateField,
          message: `Invalid date format for ${TARGET_FIELDS.find((f) => f.key === dateField)?.label}`,
          value: value,
        });
      }
    }
  }

  // Validate numeric fields
  const numericFields: (keyof ColumnMapping)[] = ['commsUR', 'commsSC', 'contractValue'];
  for (const numField of numericFields) {
    const column = mapping[numField];
    if (column && row[column]) {
      const value = row[column].trim();
      const parsed = parseNumber(value);
      if (isNaN(parsed)) {
        errors.push({
          field: numField,
          message: `Invalid number for ${TARGET_FIELDS.find((f) => f.key === numField)?.label}`,
          value: value,
        });
      } else if (parsed < 0) {
        errors.push({
          field: numField,
          message: `${TARGET_FIELDS.find((f) => f.key === numField)?.label} cannot be negative`,
          value: value,
        });
      }
    }
  }

  // Validate energy type
  const energyColumn = mapping.energyType;
  if (energyColumn && row[energyColumn]) {
    const value = row[energyColumn].trim();
    const normalized = normalizeEnergyType(value);
    if (!normalized) {
      errors.push({
        field: 'energyType',
        message: 'Energy type must be "Gas" or "Electric"',
        value: value,
      });
    }
  }

  // Validate date logic (CSD should be before CED)
  const csdColumn = mapping.contractStartDate;
  const cedColumn = mapping.contractEndDate;
  if (csdColumn && cedColumn && row[csdColumn] && row[cedColumn]) {
    const csd = parseDate(row[csdColumn]);
    const ced = parseDate(row[cedColumn]);
    if (csd && ced && csd >= ced) {
      errors.push({
        field: 'contractEndDate',
        message: 'Contract End Date must be after Contract Start Date',
        value: row[cedColumn],
      });
    }
  }

  // Build transformed data if valid
  let transformedData: ImportContract | undefined;
  if (errors.length === 0) {
    transformedData = transformRowToContract(row, mapping);
  }

  return {
    rowNumber,
    isValid: errors.length === 0,
    data: row,
    transformedData,
    errors,
    warnings,
  };
}

/**
 * Transform a row to ImportContract format
 */
export function transformRowToContract(
  row: Record<string, string>,
  mapping: ColumnMapping,
  dbSupplierNames?: string[]
): ImportContract {
  const getValue = (key: keyof ColumnMapping): string => {
    const column = mapping[key];
    return column ? (row[column]?.trim() || '') : '';
  };

  const supplierValue = getValue('supplierName');
  const matchedSupplier = (dbSupplierNames
    ? findSupplierMatchDynamic(supplierValue, dbSupplierNames)
    : findSupplierMatch(supplierValue)) || supplierValue;

  const lockInDate = parseDate(getValue('lockInDate'));
  const csd = parseDate(getValue('contractStartDate'));
  const ced = parseDate(getValue('contractEndDate'));

  return {
    lockInDate: lockInDate?.toISOString() || '',
    companyName: getValue('companyName'),
    meterNumber: getValue('meterNumber') || undefined,
    previousSupplier: getValue('previousSupplier') || undefined,
    energyType: normalizeEnergyType(getValue('energyType')) || 'Electric',
    supplierName: matchedSupplier,
    commsSC: parseNumber(getValue('commsSC')) || 0,
    commsUR: parseNumber(getValue('commsUR')) || 0,
    contractStartDate: csd?.toISOString() || '',
    contractEndDate: ced?.toISOString() || '',
    contractValue: parseNumber(getValue('contractValue')) || 0,
  };
}

/**
 * Validate all rows and return results
 */
export function validateAllRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  dbSupplierNames?: string[]
): ValidationResult[] {
  return rows.map((row, index) => validateRow(row, index + 1, mapping, dbSupplierNames));
}

/**
 * Get validation summary
 */
export function getValidationSummary(results: ValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
} {
  return {
    total: results.length,
    valid: results.filter((r) => r.isValid).length,
    invalid: results.filter((r) => !r.isValid).length,
    warnings: results.filter((r) => r.warnings.length > 0).length,
  };
}

/**
 * Generate CSV content for error report
 */
export function generateErrorReportCSV(results: ValidationResult[]): string {
  const errorRows = results.filter((r) => !r.isValid);

  const headers = ['Row', 'Field', 'Error', 'Value'];
  const rows = errorRows.flatMap((r) =>
    r.errors.map((e) => [
      r.rowNumber.toString(),
      e.field,
      e.message,
      String(e.value || ''),
    ])
  );

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  return csvContent;
}
