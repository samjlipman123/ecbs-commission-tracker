'use client';

import { useMemo } from 'react';
import { CheckCircle, ArrowRight, FileText } from 'lucide-react';
import type { ValidationResult } from '@/types/import';
import { format } from 'date-fns';

interface ImportPreviewProps {
  validResults: ValidationResult[];
  onConfirm: () => void;
  onBack: () => void;
  isImporting: boolean;
}

export default function ImportPreview({
  validResults,
  onConfirm,
  onBack,
  isImporting,
}: ImportPreviewProps) {
  // Calculate summary stats
  const stats = useMemo(() => {
    let totalValue = 0;
    const suppliers = new Set<string>();
    const energyTypes = { Gas: 0, Electric: 0 };

    for (const result of validResults) {
      if (result.transformedData) {
        totalValue += result.transformedData.contractValue || 0;
        suppliers.add(result.transformedData.supplierName);
        if (result.transformedData.energyType === 'Gas') {
          energyTypes.Gas++;
        } else {
          energyTypes.Electric++;
        }
      }
    }

    return {
      totalValue,
      uniqueSuppliers: suppliers.size,
      energyTypes,
    };
  }, [validResults]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Review Import</h2>
          <p className="text-gray-500 text-sm">
            Confirm the contracts to be imported
          </p>
        </div>
        <div className="flex items-center text-green-600">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="font-medium">{validResults.length} contracts ready</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Total Contracts</p>
          <p className="text-2xl font-bold text-gray-900">{validResults.length}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Unique Suppliers</p>
          <p className="text-2xl font-bold text-gray-900">{stats.uniqueSuppliers}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Energy Types</p>
          <div className="flex gap-2">
            <span className="badge badge-amber">{stats.energyTypes.Electric} Electric</span>
            <span className="badge badge-blue">{stats.energyTypes.Gas} Gas</span>
          </div>
        </div>
      </div>

      {/* Preview table */}
      <div className="table-container mb-6 max-h-80 overflow-y-auto">
        <table>
          <thead className="sticky top-0 bg-white">
            <tr>
              <th>Company</th>
              <th>Supplier</th>
              <th>Type</th>
              <th>CSD</th>
              <th>CED</th>
              <th className="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {validResults.map((result) => {
              const data = result.transformedData;
              if (!data) return null;

              return (
                <tr key={result.rowNumber}>
                  <td className="font-medium">{data.companyName}</td>
                  <td className="max-w-[200px] truncate" title={data.supplierName}>
                    {data.supplierName}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        data.energyType === 'Electric' ? 'badge-amber' : 'badge-blue'
                      }`}
                    >
                      {data.energyType}
                    </span>
                  </td>
                  <td>{formatDate(data.contractStartDate)}</td>
                  <td>{formatDate(data.contractEndDate)}</td>
                  <td className="text-right font-medium">
                    {formatCurrency(data.contractValue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <FileText className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-700 text-sm font-medium">What happens next?</p>
            <ul className="text-blue-600 text-sm mt-1 list-disc list-inside">
              <li>All {validResults.length} contracts will be created in the system</li>
              <li>Payment projections will be automatically calculated for each contract</li>
              <li>You can view and manage contracts from the Contracts page</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={isImporting}
          className="btn-outline disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isImporting}
          className="btn-primary flex items-center disabled:opacity-50"
        >
          {isImporting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Importing...
            </>
          ) : (
            <>
              Import {validResults.length} Contracts
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
