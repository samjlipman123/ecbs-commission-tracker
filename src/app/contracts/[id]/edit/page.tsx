'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Supplier {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  lockInDate: string;
  companyName: string;
  meterNumber: string | null;
  previousSupplier: string | null;
  energyType: string;
  supplierId: string;
  commsSC: number;
  commsUR: number;
  contractStartDate: string;
  contractEndDate: string;
  contractValue: number;
  notes: string | null;
}

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    lockInDate: '',
    companyName: '',
    meterNumber: '',
    previousSupplier: '',
    energyType: 'Electric',
    supplierId: '',
    commsSC: '0',
    commsUR: '',
    contractStartDate: '',
    contractEndDate: '',
    contractValue: '',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
    fetchContract();
  }, [resolvedParams.id]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${resolvedParams.id}`);
      const contract: Contract = await response.json();

      setFormData({
        lockInDate: format(new Date(contract.lockInDate), 'yyyy-MM-dd'),
        companyName: contract.companyName,
        meterNumber: contract.meterNumber || '',
        previousSupplier: contract.previousSupplier || '',
        energyType: contract.energyType,
        supplierId: contract.supplierId,
        commsSC: contract.commsSC.toString(),
        commsUR: contract.commsUR.toString(),
        contractStartDate: format(new Date(contract.contractStartDate), 'yyyy-MM-dd'),
        contractEndDate: format(new Date(contract.contractEndDate), 'yyyy-MM-dd'),
        contractValue: contract.contractValue.toString(),
        notes: contract.notes || '',
      });
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      setError('Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/contracts/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update contract');
      }

      router.push(`/contracts/${resolvedParams.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/contracts/${resolvedParams.id}`}
            className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contract
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Contract</h1>
          <p className="text-gray-500">Update the contract details below</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyName" className="label">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="meterNumber" className="label">
                  Meter Number
                </label>
                <input
                  id="meterNumber"
                  name="meterNumber"
                  type="text"
                  value={formData.meterNumber}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="lockInDate" className="label">
                  Lock In Date *
                </label>
                <input
                  id="lockInDate"
                  name="lockInDate"
                  type="date"
                  value={formData.lockInDate}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="previousSupplier" className="label">
                  Previous Supplier
                </label>
                <input
                  id="previousSupplier"
                  name="previousSupplier"
                  type="text"
                  value={formData.previousSupplier}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Contract Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="supplierId" className="label">
                  Supplier *
                </label>
                <select
                  id="supplierId"
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="energyType" className="label">
                  Energy Type *
                </label>
                <select
                  id="energyType"
                  name="energyType"
                  value={formData.energyType}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="Electric">Electric</option>
                  <option value="Gas">Gas</option>
                </select>
              </div>
              <div>
                <label htmlFor="contractStartDate" className="label">
                  Contract Start Date (CSD) *
                </label>
                <input
                  id="contractStartDate"
                  name="contractStartDate"
                  type="date"
                  value={formData.contractStartDate}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="contractEndDate" className="label">
                  Contract End Date (CED) *
                </label>
                <input
                  id="contractEndDate"
                  name="contractEndDate"
                  type="date"
                  value={formData.contractEndDate}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Commission Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="commsUR" className="label">
                  Unit Rate Commission (p/kWh) *
                </label>
                <input
                  id="commsUR"
                  name="commsUR"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.commsUR}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="commsSC" className="label">
                  Standing Charge Commission
                </label>
                <input
                  id="commsSC"
                  name="commsSC"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.commsSC}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="contractValue" className="label">
                  Total Contract Value (£) *
                </label>
                <input
                  id="contractValue"
                  name="contractValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.contractValue}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="label">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Link href={`/contracts/${resolvedParams.id}`} className="btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
