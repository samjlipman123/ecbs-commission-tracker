// File parsing utilities for CSV and Excel files

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData } from '@/types/import';

/**
 * Parse a CSV or Excel file and return structured data
 * @param file - The file to parse
 * @returns Parsed data with headers and rows
 */
export async function parseFile(file: File): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (['xlsx', 'xls'].includes(extension || '')) {
    return parseExcel(file);
  }

  throw new Error(`Unsupported file type: .${extension}. Please upload a CSV or Excel file.`);
}

/**
 * Parse a CSV file using Papa Parse
 */
async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        // Clean up row values
        const cleanedRows = rows.map((row) => {
          const cleanedRow: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            cleanedRow[key] = typeof value === 'string' ? value.trim() : String(value || '');
          }
          return cleanedRow;
        });

        resolve({
          headers,
          rows: cleanedRows,
          totalRows: cleanedRows.length,
          fileName: file.name,
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Parse an Excel file using SheetJS
 */
async function parseExcel(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel file contains no sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    dateNF: 'dd/mm/yyyy',
  });

  if (jsonData.length === 0) {
    throw new Error('Excel sheet is empty');
  }

  // First row is headers
  const headerRow = jsonData[0];
  const headers = Array.isArray(headerRow)
    ? headerRow.map((h) => String(h || '').trim())
    : [];

  // Remaining rows are data
  const rows = jsonData.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    const rowArray = Array.isArray(row) ? row : [];
    headers.forEach((header, i) => {
      const value = rowArray[i];
      obj[header] = value !== undefined && value !== null ? String(value).trim() : '';
    });
    return obj;
  });

  // Filter out completely empty rows
  const nonEmptyRows = rows.filter((row) => Object.values(row).some((v) => v !== ''));

  return {
    headers,
    rows: nonEmptyRows,
    totalRows: nonEmptyRows.length,
    fileName: file.name,
  };
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ['csv', 'xlsx', 'xls'].includes(extension || '');
}

/**
 * Check if file size is within limit
 */
export function isWithinSizeLimit(file: File, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}
