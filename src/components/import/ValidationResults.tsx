'use client';

import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Download, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { ValidationResult } from '@/types/import';
import { getValidationSummary, generateErrorReportCSV } from '@/lib/import-validator';

interface ValidationResultsProps {
  results: ValidationResult[];
  onProceed: (importValidOnly: boolean) => void;
  onBack: () => void;
}

export default function ValidationResults({
  results,
  onProceed,
  onBack,
}: ValidationResultsProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const summary = useMemo(() => getValidationSummary(results), [results]);

  const filteredResults = useMemo(() => {
    if (showOnlyErrors) {
      return results.filter((r) => !r.isValid);
    }
    return results;
  }, [results, showOnlyErrors]);

  const toggleRow = (rowNumber: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  const downloadErrors = () => {
    const csv = generateErrorReportCSV(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Validation Results</h2>
          <p className="text-gray-500 text-sm">Review validation results before importing</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-sm text-gray-500">Total Rows</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-2xl font-bold text-green-700">{summary.valid}</p>
          </div>
          <p className="text-sm text-green-600">Valid</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg text-center">
          <div className="flex items-center justify-center mb-1">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-2xl font-bold text-red-700">{summary.invalid}</p>
          </div>
          <p className="text-sm text-red-600">Errors</p>
        </div>
      </div>

      {/* Filter and actions */}
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showOnlyErrors}
            onChange={(e) => setShowOnlyErrors(e.target.checked)}
            className="mr-2 rounded border-gray-300 text-[var(--ecbs-teal)] focus:ring-[var(--ecbs-teal)]"
          />
          Show only errors
        </label>
        {summary.invalid > 0 && (
          <button
            onClick={downloadErrors}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <Download className="w-4 h-4 mr-1" />
            Download error report
          </button>
        )}
      </div>

      {/* Results table */}
      <div className="table-container mb-6 max-h-96 overflow-y-auto">
        <table>
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="w-16">Row</th>
              <th>Company</th>
              <th>Supplier</th>
              <th className="w-24">Status</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((result) => {
              const isExpanded = expandedRows.has(result.rowNumber);
              const companyName =
                result.transformedData?.companyName ||
                Object.values(result.data).find((v) => v) ||
                '-';
              const supplierName =
                result.transformedData?.supplierName ||
                Object.values(result.data).find((v) => v?.toLowerCase().includes('gas') || v?.toLowerCase().includes('energy')) ||
                '-';

              return (
                <>
                  <tr
                    key={result.rowNumber}
                    className={`cursor-pointer ${
                      result.isValid ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                    }`}
                    onClick={() => toggleRow(result.rowNumber)}
                  >
                    <td className="font-mono text-sm">{result.rowNumber}</td>
                    <td className="max-w-[200px] truncate" title={companyName}>
                      {companyName}
                    </td>
                    <td className="max-w-[200px] truncate" title={supplierName}>
                      {supplierName}
                    </td>
                    <td>
                      {result.isValid ? (
                        <span className="badge badge-green">Valid</span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#fecaca', color: '#991b1b' }}>
                          {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${result.rowNumber}-details`}>
                      <td colSpan={5} className="bg-gray-50 p-4">
                        {result.errors.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-red-700 mb-2">Errors:</p>
                            <ul className="space-y-1">
                              {result.errors.map((error, i) => (
                                <li key={i} className="text-sm text-red-600 flex items-start">
                                  <XCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                  <span>
                                    <strong>{error.field}:</strong> {error.message}
                                    {error.value !== null && (
                                      <span className="text-red-400 ml-1">
                                        (value: &quot;{String(error.value)}&quot;)
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.warnings.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-amber-700 mb-2">Warnings:</p>
                            <ul className="space-y-1">
                              {result.warnings.map((warning, i) => (
                                <li key={i} className="text-sm text-amber-600 flex items-start">
                                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                  <span>
                                    <strong>{warning.field}:</strong> {warning.message}
                                    {warning.suggestion && (
                                      <span className="text-amber-500 ml-1">
                                        ({warning.suggestion})
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.isValid && result.errors.length === 0 && result.warnings.length === 0 && (
                          <p className="text-sm text-green-600">All fields validated successfully</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button onClick={onBack} className="btn-outline">
          Back to Mapping
        </button>
        <div className="flex gap-3">
          {summary.invalid > 0 && summary.valid > 0 && (
            <button
              onClick={() => onProceed(true)}
              className="btn-outline flex items-center"
            >
              Import {summary.valid} Valid Only
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          )}
          <button
            onClick={() => onProceed(false)}
            disabled={summary.valid === 0}
            className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {summary.invalid === 0 ? (
              <>
                Import All {summary.total} Rows
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Review & Import
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
