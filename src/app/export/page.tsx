'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState } from 'react';
import { format, addYears, startOfMonth } from 'date-fns';
import { Download, FileText, Calendar, CheckCircle } from 'lucide-react';

export default function ExportPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addYears(new Date(), 2), 'yyyy-MM-dd'));
  const [exportType, setExportType] = useState<'projections' | 'contracts'>('projections');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExported(false);

    // Build the export URL
    const params = new URLSearchParams({
      type: exportType,
    });

    if (exportType === 'projections') {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    }

    // Trigger download
    window.location.href = `/api/export?${params.toString()}`;

    // Show success state
    setTimeout(() => {
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    }, 1000);
  };

  const presetRanges = [
    { label: 'This Year', start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'), end: format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd') },
    { label: 'Next Year', start: format(new Date(new Date().getFullYear() + 1, 0, 1), 'yyyy-MM-dd'), end: format(new Date(new Date().getFullYear() + 1, 11, 31), 'yyyy-MM-dd') },
    { label: 'Next 2 Years', start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(addYears(new Date(), 2), 'yyyy-MM-dd') },
    { label: 'Next 5 Years', start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(addYears(new Date(), 5), 'yyyy-MM-dd') },
    { label: 'All (to 2035)', start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: '2035-12-31' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
          <p className="text-gray-500">Download your contract and projection data as CSV</p>
        </div>

        {/* Export Type Selection */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What would you like to export?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setExportType('projections')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                exportType === 'projections'
                  ? 'border-[var(--ecbs-teal)] bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <Calendar className={`w-5 h-5 mr-2 ${exportType === 'projections' ? 'text-[var(--ecbs-teal)]' : 'text-gray-400'}`} />
                <span className="font-semibold">Payment Projections</span>
              </div>
              <p className="text-sm text-gray-500">
                Monthly payment forecasts with company and supplier details
              </p>
            </button>
            <button
              onClick={() => setExportType('contracts')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                exportType === 'contracts'
                  ? 'border-[var(--ecbs-teal)] bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <FileText className={`w-5 h-5 mr-2 ${exportType === 'contracts' ? 'text-[var(--ecbs-teal)]' : 'text-gray-400'}`} />
                <span className="font-semibold">All Contracts</span>
              </div>
              <p className="text-sm text-gray-500">
                Full contract details including dates, values, and commissions
              </p>
            </button>
          </div>
        </div>

        {/* Date Range (only for projections) */}
        {exportType === 'projections' && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date Range</h3>

            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {presetRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => {
                    setStartDate(range.start);
                    setEndDate(range.end);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    startDate === range.start && endDate === range.end
                      ? 'bg-[var(--ecbs-navy)] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Export Summary */}
        <div className="card mb-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Summary</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Type:</span>{' '}
              {exportType === 'projections' ? 'Payment Projections' : 'All Contracts'}
            </p>
            {exportType === 'projections' && (
              <p>
                <span className="font-medium">Date Range:</span>{' '}
                {format(new Date(startDate), 'dd MMM yyyy')} to{' '}
                {format(new Date(endDate), 'dd MMM yyyy')}
              </p>
            )}
            <p>
              <span className="font-medium">Format:</span> CSV (Excel compatible)
            </p>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full btn-primary py-3 flex items-center justify-center text-lg disabled:opacity-50"
        >
          {exporting ? (
            <span className="flex items-center">
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Preparing Export...
            </span>
          ) : exported ? (
            <span className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Download Started!
            </span>
          ) : (
            <span className="flex items-center">
              <Download className="w-5 h-5 mr-2" />
              Download CSV
            </span>
          )}
        </button>
      </div>
    </DashboardLayout>
  );
}
