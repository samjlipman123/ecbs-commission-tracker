'use client';

interface PaymentStatusGaugeProps {
  received: number;
  expected: number;
  title?: string;
}

export default function PaymentStatusGauge({
  received,
  expected,
  title = 'Payment Collection Status',
}: PaymentStatusGaugeProps) {
  const percentage = expected > 0 ? Math.min(Math.round((received / expected) * 100), 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-3xl font-bold ${getTextColor()}`}>{percentage}%</span>
          <span className="text-sm text-gray-500">collected</span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 ease-out rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-gray-500">Received</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(received)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Expected (to date)</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(expected)}</p>
        </div>
      </div>

      {/* Shortfall indicator */}
      {expected > received && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Shortfall:</span>{' '}
            {formatCurrency(expected - received)} outstanding
          </p>
        </div>
      )}
    </div>
  );
}
