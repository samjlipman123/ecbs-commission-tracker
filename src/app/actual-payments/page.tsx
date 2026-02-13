'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Wallet, Search, Filter } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  companyName: string;
  supplier: Supplier;
  contractValue: number;
}

interface PaymentProjection {
  id: string;
  month: string;
  amount: number;
  paymentType: string;
}

interface ActualPayment {
  id: string;
  contractId: string;
  contract: Contract;
  paymentProjectionId: string | null;
  paymentProjection: PaymentProjection | null;
  amount: number;
  dateReceived: string;
  referenceNumber: string | null;
  paymentType: string;
  notes: string | null;
  createdAt: string;
}

interface FormData {
  contractId: string;
  paymentProjectionId: string;
  amount: string;
  dateReceived: string;
  referenceNumber: string;
  paymentType: string;
  notes: string;
}

const emptyFormData: FormData = {
  contractId: '',
  paymentProjectionId: '',
  amount: '',
  dateReceived: new Date().toISOString().split('T')[0],
  referenceNumber: '',
  paymentType: 'live',
  notes: '',
};

export default function ActualPaymentsPage() {
  const [payments, setPayments] = useState<ActualPayment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projections, setProjections] = useState<PaymentProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>(emptyFormData);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Summary
  const [summary, setSummary] = useState({ totalAmount: 0 });

  useEffect(() => {
    fetchPayments();
    fetchContracts();
  }, []);

  useEffect(() => {
    if (formData.contractId) {
      fetchProjectionsForContract(formData.contractId);
    } else {
      setProjections([]);
    }
  }, [formData.contractId]);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/actual-payments');
      const data = await response.json();
      if (data.payments) {
        setPayments(data.payments);
        setSummary(data.summary || { totalAmount: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts?limit=1000');
      const data = await response.json();
      if (data.contracts) {
        setContracts(data.contracts);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    }
  };

  const fetchProjectionsForContract = async (contractId: string) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}`);
      const data = await response.json();
      if (data.paymentProjections) {
        // Filter out projections that already have actual payments (unless editing)
        const availableProjections = data.paymentProjections.filter(
          (p: PaymentProjection & { actualPayment?: ActualPayment }) =>
            !p.actualPayment || (editingId && payments.find(pay => pay.id === editingId)?.paymentProjectionId === p.id)
        );
        setProjections(availableProjections);
      }
    } catch (error) {
      console.error('Failed to fetch projections:', error);
      setProjections([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.contractId || !formData.amount || !formData.dateReceived || !formData.paymentType) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const url = editingId ? `/api/actual-payments/${editingId}` : '/api/actual-payments';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: formData.contractId,
          paymentProjectionId: formData.paymentProjectionId || null,
          amount: formData.amount,
          dateReceived: formData.dateReceived,
          referenceNumber: formData.referenceNumber || null,
          paymentType: formData.paymentType,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save payment');
      }

      await fetchPayments();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (payment: ActualPayment) => {
    if (!confirm(`Are you sure you want to delete this payment of ${formatCurrency(payment.amount)}?`)) {
      return;
    }

    setDeleting(payment.id);

    try {
      const response = await fetch(`/api/actual-payments/${payment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete payment');
      }

      await fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    } finally {
      setDeleting(null);
    }
  };

  const startEditing = (payment: ActualPayment) => {
    setFormData({
      contractId: payment.contractId,
      paymentProjectionId: payment.paymentProjectionId || '',
      amount: payment.amount.toString(),
      dateReceived: payment.dateReceived.split('T')[0],
      referenceNumber: payment.referenceNumber || '',
      paymentType: payment.paymentType,
      notes: payment.notes || '',
    });
    setEditingId(payment.id);
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingId(null);
    setShowForm(false);
    setError('');
    setProjections([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPaymentTypeBadgeClass = (type: string) => {
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

  // Get unique suppliers for filter
  const uniqueSuppliers = Array.from(
    new Map(payments.map(p => [p.contract.supplier.id, p.contract.supplier])).values()
  );

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    if (filterSupplier && payment.contract.supplier.id !== filterSupplier) return false;
    if (filterPaymentType && payment.paymentType !== filterPaymentType) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !payment.contract.companyName.toLowerCase().includes(search) &&
        !payment.contract.supplier.name.toLowerCase().includes(search) &&
        !(payment.referenceNumber?.toLowerCase().includes(search))
      ) {
        return false;
      }
    }
    return true;
  });

  // Calculate filtered summary
  const filteredTotal = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Actual Payments</h1>
            <p className="text-gray-500">Record and track payments received from suppliers</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Received</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <Filter className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Filtered Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredTotal)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Payment Count</p>
                <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Edit Payment' : 'Add New Payment'}
              </h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contract Selection */}
                <div>
                  <label className="label">Contract *</label>
                  <select
                    value={formData.contractId}
                    onChange={(e) => setFormData(prev => ({ ...prev, contractId: e.target.value, paymentProjectionId: '' }))}
                    className="input"
                    required
                  >
                    <option value="">Select a contract</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.companyName} - {contract.supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Link to Projection (optional) */}
                <div>
                  <label className="label">Link to Projection (Optional)</label>
                  <select
                    value={formData.paymentProjectionId}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentProjectionId: e.target.value }))}
                    className="input"
                    disabled={!formData.contractId}
                  >
                    <option value="">No link - standalone payment</option>
                    {projections.map((projection) => (
                      <option key={projection.id} value={projection.id}>
                        {formatDate(projection.month)} - {projection.paymentType} - {formatCurrency(projection.amount)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="label">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Date Received */}
                <div>
                  <label className="label">Date Received *</label>
                  <input
                    type="date"
                    value={formData.dateReceived}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateReceived: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                {/* Payment Type */}
                <div>
                  <label className="label">Payment Type *</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value }))}
                    className="input"
                    required
                  >
                    <option value="signature">Signature</option>
                    <option value="live">Live</option>
                    <option value="reconciliation">Reconciliation</option>
                    <option value="arrears">Arrears</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="label">Reference Number</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    className="input"
                    placeholder="Invoice or reference number"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="Any additional notes about this payment"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} className="btn-outline">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : (editingId ? 'Update Payment' : 'Add Payment')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by company, supplier, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Supplier Filter */}
            <div className="w-48">
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="input"
              >
                <option value="">All Suppliers</option>
                {uniqueSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Type Filter */}
            <div className="w-40">
              <select
                value={filterPaymentType}
                onChange={(e) => setFilterPaymentType(e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="signature">Signature</option>
                <option value="live">Live</option>
                <option value="reconciliation">Reconciliation</option>
                <option value="arrears">Arrears</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            Payments ({filteredPayments.length})
          </h2>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">
                {payments.length === 0 ? 'No payments recorded yet.' : 'No payments match your filters.'}
              </p>
              {payments.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary"
                >
                  Record Your First Payment
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(payment.dateReceived)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {payment.contract.companyName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {payment.contract.supplier.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getPaymentTypeBadgeClass(payment.paymentType)}`}>
                          {payment.paymentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {payment.referenceNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEditing(payment)}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded"
                            title="Edit payment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(payment)}
                            disabled={deleting === payment.id}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Delete payment"
                          >
                            <Trash2 className={`w-4 h-4 ${deleting === payment.id ? 'animate-pulse' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
