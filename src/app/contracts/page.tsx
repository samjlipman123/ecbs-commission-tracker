'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

interface Contract {
  id: string;
  companyName: string;
  meterNumber: string | null;
  energyType: string;
  supplier: { id: string; name: string };
  commsUR: number;
  contractStartDate: string;
  contractEndDate: string;
  contractValue: number;
}

interface Supplier {
  id: string;
  name: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [page, search, selectedSupplier]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (selectedSupplier) params.set('supplierId', selectedSupplier);

      const response = await fetch(`/api/contracts?${params}`);
      const data = await response.json();
      setContracts(data.contracts);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;

    try {
      await fetch(`/api/contracts/${contractToDelete}`, { method: 'DELETE' });
      fetchContracts();
      setDeleteModalOpen(false);
      setContractToDelete(null);
    } catch (error) {
      console.error('Failed to delete contract:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
            <p className="text-gray-500">Manage your energy contracts</p>
          </div>
          <Link href="/contracts/new" className="btn-primary flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Contract
          </Link>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by company name or meter number..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="input pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedSupplier}
                onChange={(e) => {
                  setSelectedSupplier(e.target.value);
                  setPage(1);
                }}
                className="input"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ecbs-teal)]"></div>
            </div>
          ) : contracts.length > 0 ? (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Supplier</th>
                      <th>Energy</th>
                      <th>Uplift (p/kWh)</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>
                          <div>
                            <div className="font-medium">{contract.companyName}</div>
                            {contract.meterNumber && (
                              <div className="text-xs text-gray-500">
                                {contract.meterNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{contract.supplier.name}</td>
                        <td>
                          <span
                            className={`badge ${
                              contract.energyType === 'Electric'
                                ? 'badge-amber'
                                : 'badge-blue'
                            }`}
                          >
                            {contract.energyType}
                          </span>
                        </td>
                        <td>{contract.commsUR.toFixed(2)}p</td>
                        <td>
                          {new Date(contract.contractStartDate).toLocaleDateString(
                            'en-GB'
                          )}
                        </td>
                        <td>
                          {new Date(contract.contractEndDate).toLocaleDateString(
                            'en-GB'
                          )}
                        </td>
                        <td className="font-medium">
                          {formatCurrency(contract.contractValue)}
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/contracts/${contract.id}`}
                              className="p-1.5 text-gray-500 hover:text-[var(--ecbs-teal)] hover:bg-gray-100 rounded"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/contracts/${contract.id}/edit`}
                              className="p-1.5 text-gray-500 hover:text-[var(--ecbs-navy)] hover:bg-gray-100 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => {
                                setContractToDelete(contract.id);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="btn-outline p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="btn-outline p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No contracts found</p>
              <Link href="/contracts/new" className="btn-primary">
                Add Your First Contract
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Contract
            </h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this contract? This action cannot be
              undone and will also delete all associated payment projections.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setContractToDelete(null);
                }}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
