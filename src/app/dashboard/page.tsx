'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import {
  TrendingUp,
  FileText,
  PoundSterling,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardStats {
  totalContracts: number;
  totalContractValue: number;
  currentMonthProjection: number;
  currentYearProjection: number;
  monthlyProjections: { month: string; amount: number }[];
  recentContracts: {
    id: string;
    companyName: string;
    supplierName: string;
    contractValue: number;
    contractStartDate: string;
  }[];
  supplierBreakdown: { name: string; value: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      const response = await fetch('/api/seed-contracts?force=true');
      const data = await response.json();
      if (response.ok) {
        setSeedMessage(`Success! Created ${data.totalCreated} mock contracts.`);
        // Refresh dashboard stats
        await fetchDashboardStats();
      } else {
        setSeedMessage(`Error: ${data.error || 'Failed to create contracts'}`);
      }
    } catch (error) {
      setSeedMessage('Error: Failed to connect to server');
      console.error('Seed error:', error);
    } finally {
      setSeeding(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  // Use placeholder data if no stats yet
  const displayStats = stats || {
    totalContracts: 0,
    totalContractValue: 0,
    currentMonthProjection: 0,
    currentYearProjection: 0,
    monthlyProjections: [],
    recentContracts: [],
    supplierBreakdown: [],
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of your commission projections</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Contracts</p>
                <p className="text-3xl font-bold text-gray-900">
                  {displayStats.totalContracts}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">Active contracts</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Contract Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(displayStats.totalContractValue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <PoundSterling className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Lifetime value</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">This Month</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(displayStats.currentMonthProjection)}
                </p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Projected income</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">This Year</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(displayStats.currentYearProjection)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Projected income</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Projections Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Projections (Next 12 Months)
            </h3>
            {displayStats.monthlyProjections.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayStats.monthlyProjections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Projected']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={{ fill: '#0d9488', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No projection data available. Add contracts to see projections.</p>
              </div>
            )}
          </div>

          {/* Supplier Breakdown */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Commission by Supplier
            </h3>
            {displayStats.supplierBreakdown.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayStats.supplierBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#6b7280"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Value']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#1a365d" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No supplier data available. Add contracts to see breakdown.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Contracts Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Contracts</h3>
            <a
              href="/contracts"
              className="text-sm text-[var(--ecbs-teal)] hover:underline"
            >
              View all
            </a>
          </div>
          {displayStats.recentContracts.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Supplier</th>
                    <th>Contract Value</th>
                    <th>Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStats.recentContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td className="font-medium">{contract.companyName}</td>
                      <td>{contract.supplierName}</td>
                      <td>{formatCurrency(contract.contractValue)}</td>
                      <td>
                        {new Date(contract.contractStartDate).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No contracts yet. Add your first contract to get started.</p>
              <div className="flex justify-center gap-3 mt-4">
                <a href="/contracts/new" className="btn-primary inline-block">
                  Add Contract
                </a>
                <button
                  onClick={generateDemoData}
                  disabled={seeding}
                  className="btn-outline disabled:opacity-50"
                >
                  {seeding ? 'Generating...' : 'Generate Demo Data'}
                </button>
              </div>
              {seedMessage && (
                <p className={`mt-3 text-sm ${seedMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {seedMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
