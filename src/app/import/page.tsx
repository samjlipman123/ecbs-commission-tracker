'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Upload, GitCompare, CheckCircle, Eye, Loader, ArrowLeft } from 'lucide-react';
import FileUpload from '@/components/import/FileUpload';
import ColumnMapper from '@/components/import/ColumnMapper';
import ValidationResults from '@/components/import/ValidationResults';
import ImportPreview from '@/components/import/ImportPreview';
import type {
  ParsedData,
  ColumnMapping,
  ValidationResult,
  ImportStep,
  ImportResponse,
} from '@/types/import';
import { validateAllRows } from '@/lib/import-validator';

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Step configuration
  const steps = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'mapping', label: 'Map Columns', icon: GitCompare },
    { key: 'validation', label: 'Validate', icon: CheckCircle },
    { key: 'review', label: 'Review', icon: Eye },
  ] as const;

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // Get valid results for import
  const validResults = useMemo(
    () => validationResults.filter((r) => r.isValid),
    [validationResults]
  );

  // Handle file upload completion
  const handleFileSelected = (file: File, data: ParsedData) => {
    setParsedData(data);
    setColumnMapping(null);
    setValidationResults([]);
    setImportResults(null);
    setImportError(null);
    setStep('mapping');
  };

  // Handle column mapping completion
  const handleMappingComplete = (mapping: ColumnMapping) => {
    setColumnMapping(mapping);

    // Run validation
    if (parsedData) {
      const results = validateAllRows(parsedData.rows, mapping);
      setValidationResults(results);
    }

    setStep('validation');
  };

  // Handle validation proceed
  const handleValidationProceed = (importValidOnly: boolean) => {
    setStep('review');
  };

  // Handle import confirmation
  const handleImportConfirm = async () => {
    if (validResults.length === 0) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const contracts = validResults
        .map((r) => r.transformedData)
        .filter((c): c is NonNullable<typeof c> => c !== undefined);

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts }),
      });

      const result: ImportResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.[0]?.error || 'Import failed');
      }

      setImportResults(result);
      setStep('complete');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Reset and start over
  const handleReset = () => {
    setStep('upload');
    setParsedData(null);
    setColumnMapping(null);
    setValidationResults([]);
    setImportResults(null);
    setImportError(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/contracts"
            className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import Contracts</h1>
          <p className="text-gray-500">
            Upload a CSV or Excel file to import multiple contracts at once
          </p>
        </div>

        {/* Step Indicator */}
        {step !== 'complete' && (
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => {
                const Icon = s.icon;
                const isActive = s.key === step;
                const isCompleted = index < currentStepIndex;
                const isClickable = index < currentStepIndex;

                return (
                  <div key={s.key} className="flex items-center flex-1">
                    <button
                      onClick={() => isClickable && setStep(s.key)}
                      disabled={!isClickable}
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-full transition-all
                        ${
                          isActive
                            ? 'bg-[var(--ecbs-teal)] text-white'
                            : isCompleted
                            ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                            : 'bg-gray-200 text-gray-500'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </button>
                    <span
                      className={`ml-3 text-sm font-medium hidden sm:block ${
                        isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {s.label}
                    </span>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            <p className="font-medium">Import Error</p>
            <p className="text-sm">{importError}</p>
          </div>
        )}

        {/* Step Content */}
        {step === 'upload' && (
          <FileUpload
            onFileSelected={handleFileSelected}
            acceptedTypes={['.csv', '.xlsx', '.xls']}
            maxSizeMB={5}
          />
        )}

        {step === 'mapping' && parsedData && (
          <ColumnMapper
            parsedData={parsedData}
            onMappingComplete={handleMappingComplete}
            onBack={() => setStep('upload')}
          />
        )}

        {step === 'validation' && validationResults.length > 0 && (
          <ValidationResults
            results={validationResults}
            onProceed={handleValidationProceed}
            onBack={() => setStep('mapping')}
          />
        )}

        {step === 'review' && validResults.length > 0 && (
          <ImportPreview
            validResults={validResults}
            onConfirm={handleImportConfirm}
            onBack={() => setStep('validation')}
            isImporting={isImporting}
          />
        )}

        {step === 'complete' && importResults && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h2>
            <p className="text-gray-500 mb-6">
              Successfully imported {importResults.imported} contract
              {importResults.imported !== 1 ? 's' : ''}
              {importResults.failed > 0 && (
                <span className="text-red-500">
                  {' '}
                  ({importResults.failed} failed)
                </span>
              )}
            </p>

            {importResults.failed > 0 && importResults.errors.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left max-w-md mx-auto">
                <p className="font-medium text-amber-700 mb-2">Failed imports:</p>
                <ul className="text-sm text-amber-600 space-y-1">
                  {importResults.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>
                      Row {err.rowNumber}: {err.error}
                    </li>
                  ))}
                  {importResults.errors.length > 5 && (
                    <li>...and {importResults.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Link href="/contracts" className="btn-primary">
                View Contracts
              </Link>
              <button onClick={handleReset} className="btn-outline">
                Import More
              </button>
            </div>
          </div>
        )}

        {/* Importing state */}
        {step === 'importing' && (
          <div className="card text-center py-12">
            <Loader className="w-12 h-12 text-[var(--ecbs-teal)] animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Importing Contracts...</h2>
            <p className="text-gray-500">
              Please wait while we create your contracts and calculate payment projections.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
