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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
      if (response.ok && Array.isArray(data)) {
        setSuppliers(data);
      }
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
      if (response.ok && data.contracts && data.pagination) {
        setContracts(data.contracts);
        setTotalPages(data.pagination.totalPages);
        setSelectedIds((prev) => {
          const existing = new Set<string>();
          const visibleIds = new Set<string>(
            (data.contracts as Contract[]).map((c) => c.id)
          );
          prev.forEach((id) => {
            if (visibleIds.has(id)) existing.add(id);
          });
          return existing;
        });
      }
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setBulkDeleting(true);
    try {
      const response = await fetch('/api/contracts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!response.ok) {
        throw new Error('Bulk delete failed');
      }
      setSelectedIds(new Set());
      setBulkDeleteModalOpen(false);
      fetchContracts();
    } catch (error) {
      console.error('Failed to bulk delete contracts:', error);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allSelected = contracts.length > 0 && contracts.every((c) => prev.has(c.id));
      if (allSelected) {
        const next = new Set(prev);
        contracts.forEach((c) => next.delete(c.id));
        return next;
      }
      const next = new Set(prev);
      contracts.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const allVisibleSelected =
    contracts.length > 0 && contracts.every((c) => selectedIds.has(c.id));
  const someVisibleSelected =
    !allVisibleSelected && contracts.some((c) => selectedIds.has(c.id));

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

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-[var(--ecbs-teal)]/40 bg-teal-50/40">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{selectedIds.size}</span>{' '}
              {selectedIds.size === 1 ? 'contract' : 'contracts'} selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="btn-outline"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete selected
              </button>
            </div>
          </div>
        )}

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
                      <th className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all contracts on this page"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someVisibleSelected;
                          }}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-[var(--ecbs-teal)] focus:ring-[var(--ecbs-teal)] cursor-pointer"
                        />
                      </th>
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
                      <tr
                        key={contract.id}
                        className={selectedIds.has(contract.id) ? 'bg-teal-50/40' : undefined}
                      >
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select contract for ${contract.companyName}`}
                            checked={selectedIds.has(contract.id)}
                            onChange={() => toggleSelected(contract.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[var(--ecbs-teal)] focus:ring-[var(--ecbs-teal)] cursor-pointer"
                          />
                        </td>
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

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete {selectedIds.size} {selectedIds.size === 1 ? 'Contract' : 'Contracts'}
            </h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete {selectedIds.size === 1 ? 'this contract' : `these ${selectedIds.size} contracts`}?
              This action cannot be undone and will also delete all associated payment projections.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={bulkDeleting}
                className="btn-outline disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
