'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, X, ArrowRight, AlertCircle } from 'lucide-react';
import type { ColumnMapping, ParsedData } from '@/types/import';
import {
  TARGET_FIELDS,
  autoMapColumns,
  getMappingStatus,
  getUnmappedRequiredFields,
} from '@/lib/column-mapper';

interface ColumnMapperProps {
  parsedData: ParsedData;
  onMappingComplete: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

export default function ColumnMapper({
  parsedData,
  onMappingComplete,
  onBack,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    autoMapColumns(parsedData.headers)
  );

  const mappingStatus = useMemo(() => getMappingStatus(mapping), [mapping]);
  const unmappedRequired = useMemo(() => getUnmappedRequiredFields(mapping), [mapping]);

  // Get sample values for a column (first 3 non-empty values)
  const getSampleValues = (column: string): string[] => {
    const values: string[] = [];
    for (const row of parsedData.rows) {
      const val = row[column]?.trim();
      if (val && !values.includes(val)) {
        values.push(val);
        if (values.length >= 3) break;
      }
    }
    return values;
  };

  const handleMappingChange = (targetKey: keyof ColumnMapping, sourceColumn: string | null) => {
    setMapping((prev) => ({
      ...prev,
      [targetKey]: sourceColumn,
    }));
  };

  const handleContinue = () => {
    if (mappingStatus.isComplete) {
      onMappingComplete(mapping);
    }
  };

  // Get which source columns are already used
  const usedColumns = useMemo(() => {
    return new Set(Object.values(mapping).filter((v): v is string => v !== null));
  }, [mapping]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Map Columns</h2>
          <p className="text-gray-500 text-sm">
            Match your file columns to the required fields
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {mappingStatus.mapped} of {mappingStatus.total} fields mapped
          </p>
          <p
            className={`text-sm font-medium ${
              mappingStatus.isComplete ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {mappingStatus.requiredMapped} of {mappingStatus.requiredTotal} required
          </p>
        </div>
      </div>

      {/* File info */}
      <div className="mb-6 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{parsedData.fileName}</p>
          <p className="text-xs text-gray-500">
            {parsedData.totalRows} rows, {parsedData.headers.length} columns
          </p>
        </div>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          Change file
        </button>
      </div>

      {/* Unmapped required warning */}
      {unmappedRequired.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-700 text-sm font-medium">Required fields not mapped:</p>
            <p className="text-amber-600 text-sm">
              {unmappedRequired.map((f) => f.label).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="table-container mb-6">
        <table>
          <thead>
            <tr>
              <th className="w-1/3">Target Field</th>
              <th className="w-1/3">Your Column</th>
              <th>Sample Values</th>
              <th className="w-12">Status</th>
            </tr>
          </thead>
          <tbody>
            {TARGET_FIELDS.map((field) => {
              const selectedColumn = mapping[field.key];
              const samples = selectedColumn ? getSampleValues(selectedColumn) : [];
              const isMapped = selectedColumn !== null;

              return (
                <tr key={field.key}>
                  <td>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      {field.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{field.type}</span>
                  </td>
                  <td>
                    <select
                      value={selectedColumn || ''}
                      onChange={(e) =>
                        handleMappingChange(field.key, e.target.value || null)
                      }
                      className={`input w-full ${
                        !isMapped && field.required ? 'border-amber-300' : ''
                      }`}
                    >
                      <option value="">-- Select column --</option>
                      {parsedData.headers.map((header) => (
                        <option
                          key={header}
                          value={header}
                          disabled={usedColumns.has(header) && selectedColumn !== header}
                        >
                          {header}
                          {usedColumns.has(header) && selectedColumn !== header && ' (used)'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {samples.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {samples.map((val, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 max-w-[150px] truncate"
                            title={val}
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td>
                    {isMapped ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : field.required ? (
                      <X className="w-5 h-5 text-red-400" />
                    ) : (
                      <span className="w-5 h-5 block bg-gray-200 rounded-full" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mb-6 flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span className="text-red-500">*</span>
          <span>Required field</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>Mapped</span>
        </div>
        <div className="flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          <span>Required, not mapped</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button onClick={onBack} className="btn-outline">
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!mappingStatus.isComplete}
          className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Validation
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
