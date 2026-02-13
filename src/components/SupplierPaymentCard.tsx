'use client';

import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SupplierPaymentCardProps {
  supplierName: string;
  paid: number;
  outstanding: number;
  outstandingCount: number;
  upcoming: number;
  upcomingCount: number;
}

export default function SupplierPaymentCard({
  supplierName,
  paid,
  outstanding,
  outstandingCount,
  upcoming,
  upcomingCount,
}: SupplierPaymentCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasOutstanding = outstanding > 0;

  return (
    <div className={`card border-l-4 ${hasOutstanding ? 'border-l-amber-500' : 'border-l-green-500'}`}>
      {/* Supplier Name */}
      <h4 className="font-semibold text-gray-900 mb-3 truncate" title={supplierName}>
        {supplierName}
      </h4>

      {/* Payment Status Grid */}
      <div className="space-y-2">
        {/* Paid */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">Paid</span>
          </div>
          <span className="font-medium text-green-600">{formatCurrency(paid)}</span>
        </div>

        {/* Outstanding (needs chasing) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-amber-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">Outstanding</span>
            {outstandingCount > 0 && (
              <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                {outstandingCount}
              </span>
            )}
          </div>
          <span className={`font-medium ${outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {formatCurrency(outstanding)}
          </span>
        </div>

        {/* Upcoming */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-500">
            <Clock className="w-4 h-4 mr-2" />
            <span className="text-sm">Upcoming</span>
            {upcomingCount > 0 && (
              <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {upcomingCount}
              </span>
            )}
          </div>
          <span className="font-medium text-gray-500">{formatCurrency(upcoming)}</span>
        </div>
      </div>

      {/* Alert for outstanding */}
      {hasOutstanding && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-amber-700 font-medium">
            Needs chasing - {outstandingCount} payment{outstandingCount !== 1 ? 's' : ''} overdue
          </p>
        </div>
      )}
    </div>
  );
}
