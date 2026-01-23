// Types for bulk import feature

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  fileName: string;
}

export interface ColumnMapping {
  lockInDate: string | null;
  companyName: string | null;
  meterNumber: string | null;
  previousSupplier: string | null;
  energyType: string | null;
  supplierName: string | null;
  commsSC: string | null;
  commsUR: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractValue: string | null;
}

export interface TargetField {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  type: 'date' | 'string' | 'number' | 'enum' | 'supplier';
  enumValues?: string[];
  defaultValue?: string | number;
}

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  rowNumber: number;
  isValid: boolean;
  data: Record<string, string>;
  transformedData?: ImportContract;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ImportContract {
  lockInDate: string;
  companyName: string;
  meterNumber?: string;
  previousSupplier?: string;
  energyType: 'Gas' | 'Electric';
  supplierName: string;
  commsSC: number;
  commsUR: number;
  contractStartDate: string;
  contractEndDate: string;
  contractValue: number;
}

export interface ImportRequest {
  contracts: ImportContract[];
}

export interface ImportError {
  rowNumber: number;
  error: string;
}

export interface ImportResponse {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportError[];
  contractIds: string[];
}

export type ImportStep = 'upload' | 'mapping' | 'validation' | 'review' | 'importing' | 'complete';
