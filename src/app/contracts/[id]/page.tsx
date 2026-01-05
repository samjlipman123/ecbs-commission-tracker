'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Calendar, PoundSterling, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentProjection {
  id: string;
  month: string;
  amount: number;
  paymentType: string;
}

interface Contract {
  id: string;
  lockInDate: string;
  companyName: string;
  meterNumber: string | null;
  previousSupplier: string | null;
  energyType: string;
  supplier: { id: string; name: string };
  commsSC: number;
  commsUR: number;
  contractStartDate: string;
  contractEndDate: string;
  contractValue: number;
  notes: string | null;
  paymentProjections: PaymentProjection[];
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [resolvedParams.id]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${resolvedParams.id}`);
      const data = await response.json();
      setContract(data);
    } catch (error) {
      console.error('Failed to fetch contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'signature':
        return 'Signature Payment';
      case 'live':
        return 'Live Payment';
      case 'reconciliation':
        return 'Reconciliation';
      case 'arrears':
        return 'Arrears Payment';
      default:
        return type;
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    switch (type) {
      case 'signature':
        return 'badge-blue';
      case 'live':
        return 'badge-green';
      case 'reconciliation':
        return 'badge-amber';
      case 'arrears':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ecbs-teal)]"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contract) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Contract not found</p>
          <Link href="/contracts" className="btn-primary">
            Back to Contracts
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const totalProjected = contract.paymentProjections.reduce(
    (sum, p) => sum + p.amount,
    0
  );

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {contract.companyName}
              </h1>
              <p className="text-gray-500">{contract.supplier.name}</p>
            </div>
            <Link href={`/contracts/${contract.id}/edit`} className="btn-primary flex items-center">
              <Edit className="w-4 h-4 mr-2" />
              Edit Contract
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <PoundSterling className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Contract Value</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(contract.contractValue)}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Contract Duration</p>
                <p className="text-xl font-bold text-gray-900">
                  {format(new Date(contract.contractStartDate), 'MMM yyyy')} -{' '}
                  {format(new Date(contract.contractEndDate), 'MMM yyyy')}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Energy Type</p>
                <p className="text-xl font-bold text-gray-900">
                  {contract.energyType}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Details */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Lock In Date</p>
              <p className="font-medium">
                {format(new Date(contract.lockInDate), 'dd MMMM yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Meter Number</p>
              <p className="font-medium">{contract.meterNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Previous Supplier</p>
              <p className="font-medium">{contract.previousSupplier || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Unit Rate Commission</p>
              <p className="font-medium">{contract.commsUR.toFixed(2)}p/kWh</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Standing Charge Commission</p>
              <p className="font-medium">{contract.commsSC.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contract Start Date</p>
              <p className="font-medium">
                {format(new Date(contract.contractStartDate), 'dd MMMM yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contract End Date</p>
              <p className="font-medium">
                {format(new Date(contract.contractEndDate), 'dd MMMM yyyy')}
              </p>
            </div>
          </div>
          {contract.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="font-medium">{contract.notes}</p>
            </div>
          )}
        </div>

        {/* Payment Projections */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Schedule</h3>
            <div className="text-sm text-gray-500">
              Total Projected: <span className="font-semibold text-gray-900">{formatCurrency(totalProjected)}</span>
            </div>
          </div>
          {contract.paymentProjections.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Payment Type</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.paymentProjections.map((projection) => (
                    <tr key={projection.id}>
                      <td>{format(new Date(projection.month), 'MMMM yyyy')}</td>
                      <td>
                        <span className={`badge ${getPaymentTypeBadge(projection.paymentType)}`}>
                          {getPaymentTypeLabel(projection.paymentType)}
                        </span>
                      </td>
                      <td className="text-right font-medium">
                        {formatCurrency(projection.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No payment projections calculated for this contract.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
