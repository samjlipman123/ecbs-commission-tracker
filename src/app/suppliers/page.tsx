'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { Plus, Building2 } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  paymentTerms: string;
  upliftCap: number | null;
  isActive: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierTerms, setNewSupplierTerms] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName,
          paymentTerms: newSupplierTerms,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewSupplierName('');
        setNewSupplierTerms('');
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Failed to add supplier:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-500">Manage energy suppliers and their payment terms</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Supplier
          </button>
        </div>

        {/* Suppliers Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ecbs-teal)]"></div>
          </div>
        ) : suppliers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="card">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-[var(--ecbs-navy)] rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {supplier.name}
                    </h3>
                    {supplier.paymentTerms && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                        {supplier.paymentTerms}
                      </p>
                    )}
                    {supplier.upliftCap && (
                      <p className="text-xs text-gray-400 mt-2">
                        Uplift Cap: {supplier.upliftCap}p/kWh
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No suppliers added yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add Your First Supplier
            </button>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New Supplier
            </h3>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="label">Supplier Name *</label>
                <input
                  type="text"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="input"
                  placeholder="e.g., British Gas"
                  required
                />
              </div>
              <div>
                <label className="label">Payment Terms</label>
                <textarea
                  value={newSupplierTerms}
                  onChange={(e) => setNewSupplierTerms(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="e.g., 70% on live, 30% reconciliation 2 months after CED"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewSupplierName('');
                    setNewSupplierTerms('');
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !newSupplierName}
                  className="btn-primary disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
