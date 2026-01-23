// Column mapping utilities for auto-detecting and managing column mappings

import type { ColumnMapping, TargetField } from '@/types/import';

// Target fields configuration matching the screenshot columns
export const TARGET_FIELDS: TargetField[] = [
  { key: 'lockInDate', label: 'Date of Lock In', required: true, type: 'date' },
  { key: 'companyName', label: 'Company', required: true, type: 'string' },
  { key: 'meterNumber', label: 'Meter No', required: false, type: 'string' },
  { key: 'previousSupplier', label: 'Previous Supplier', required: false, type: 'string' },
  { key: 'energyType', label: 'Gas/Electric', required: false, type: 'enum', enumValues: ['Gas', 'Electric'] },
  { key: 'supplierName', label: 'Supplier Name', required: true, type: 'supplier' },
  { key: 'commsSC', label: 'Comms SC', required: false, type: 'number', defaultValue: 0 },
  { key: 'commsUR', label: 'Comms UR', required: true, type: 'number' },
  { key: 'contractStartDate', label: 'CSD', required: true, type: 'date' },
  { key: 'contractEndDate', label: 'CED', required: true, type: 'date' },
  { key: 'contractValue', label: 'Contract Value', required: true, type: 'number' },
];

// Column name aliases for auto-detection
const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  lockInDate: [
    'date of lock in',
    'lock in',
    'lockin',
    'lock-in',
    'lock in date',
    'lockin date',
    'locked in',
  ],
  companyName: [
    'company',
    'company name',
    'business',
    'business name',
    'client',
    'customer',
    'client name',
    'customer name',
  ],
  meterNumber: [
    'meter no',
    'meter',
    'meter number',
    'mpan',
    'mprn',
    'meter ref',
    'meter reference',
  ],
  previousSupplier: [
    'previous supplier',
    'prev supplier',
    'old supplier',
    'current supplier',
    'existing supplier',
  ],
  energyType: [
    'gas/electric',
    'gas / electric',
    'energy type',
    'energy',
    'fuel',
    'fuel type',
    'type',
    'utility',
    'utility type',
  ],
  supplierName: [
    'supplier name',
    'supplier',
    'new supplier',
    'chosen supplier',
    'selected supplier',
  ],
  commsSC: [
    'comms sc',
    'sc',
    'standing charge',
    'standing charge commission',
    'sc commission',
    'commission sc',
  ],
  commsUR: [
    'comms ur',
    'ur',
    'unit rate',
    'uplift',
    'unit rate commission',
    'ur commission',
    'commission ur',
  ],
  contractStartDate: [
    'csd',
    'contract start',
    'start date',
    'contract start date',
    'start',
    'supply start',
  ],
  contractEndDate: [
    'ced',
    'contract end',
    'end date',
    'contract end date',
    'end',
    'supply end',
  ],
  contractValue: [
    'contract value',
    'value',
    'total value',
    'commission value',
    'total',
    'total commission',
    'commission',
  ],
};

/**
 * Get empty column mapping
 */
export function getEmptyMapping(): ColumnMapping {
  return {
    lockInDate: null,
    companyName: null,
    meterNumber: null,
    previousSupplier: null,
    energyType: null,
    supplierName: null,
    commsSC: null,
    commsUR: null,
    contractStartDate: null,
    contractEndDate: null,
    contractValue: null,
  };
}

/**
 * Auto-detect column mappings based on column name similarity
 * @param sourceColumns - Column headers from the uploaded file
 * @returns Partial column mapping with detected matches
 */
export function autoMapColumns(sourceColumns: string[]): ColumnMapping {
  const mapping = getEmptyMapping();
  const usedColumns = new Set<string>();

  // Filter out null/undefined columns
  const validColumns = sourceColumns.filter((col) => col != null && typeof col === 'string');

  // First pass: exact matches
  for (const column of validColumns) {
    const normalized = column.toLowerCase().trim();

    for (const [targetKey, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (mapping[targetKey as keyof ColumnMapping] !== null) continue;

      // Check for exact alias match
      if (aliases.includes(normalized)) {
        mapping[targetKey as keyof ColumnMapping] = column;
        usedColumns.add(column);
        break;
      }
    }
  }

  // Second pass: partial matches for unmapped columns
  for (const column of validColumns) {
    if (usedColumns.has(column)) continue;

    const normalized = column.toLowerCase().trim();

    for (const [targetKey, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (mapping[targetKey as keyof ColumnMapping] !== null) continue;

      // Check if column contains any alias or vice versa
      const hasMatch = aliases.some(
        (alias) => normalized.includes(alias) || alias.includes(normalized)
      );

      if (hasMatch) {
        mapping[targetKey as keyof ColumnMapping] = column;
        usedColumns.add(column);
        break;
      }
    }
  }

  return mapping;
}

/**
 * Get mapping status - how many required fields are mapped
 */
export function getMappingStatus(mapping: ColumnMapping): {
  total: number;
  mapped: number;
  requiredTotal: number;
  requiredMapped: number;
  isComplete: boolean;
} {
  const total = TARGET_FIELDS.length;
  const mapped = Object.values(mapping).filter((v) => v !== null).length;

  const requiredFields = TARGET_FIELDS.filter((f) => f.required);
  const requiredTotal = requiredFields.length;
  const requiredMapped = requiredFields.filter((f) => mapping[f.key] !== null).length;

  return {
    total,
    mapped,
    requiredTotal,
    requiredMapped,
    isComplete: requiredMapped === requiredTotal,
  };
}

/**
 * Get unmapped required fields
 */
export function getUnmappedRequiredFields(mapping: ColumnMapping): TargetField[] {
  return TARGET_FIELDS.filter((f) => f.required && mapping[f.key] === null);
}

/**
 * Get unmapped source columns
 */
export function getUnmappedSourceColumns(
  sourceColumns: string[],
  mapping: ColumnMapping
): string[] {
  const mappedColumns = new Set(Object.values(mapping).filter((v) => v !== null));
  return sourceColumns.filter((col) => !mappedColumns.has(col));
}
