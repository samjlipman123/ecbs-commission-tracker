'use client';

import DashboardLayout from '@/components/DashboardLayout';
import React, { useEffect, useState } from 'react';
import { format, addYears, startOfMonth } from 'date-fns';
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
import { Calendar, TrendingUp, Download, RefreshCw } from 'lucide-react';

interface MonthlyProjection {
  month: string;
  monthKey: string;
  amount: number;
}

interface GroupedData {
  name: string;
  amount: number;
}

export default function ProjectionsPage() {
  const [projections, setProjections] = useState<MonthlyProjection[]>([]);
  const [supplierData, setSupplierData] = useState<GroupedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addYears(new Date(), 2), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState('');

  useEffect(() => {
    fetchProjections();
  }, [startDate, endDate]);

  const fetchProjections = async () => {
    setLoading(true);
    try {
      const [monthlyResponse, supplierResponse] = await Promise.all([
        fetch(`/api/projections?startDate=${startDate}&endDate=${endDate}&groupBy=month`),
        fetch(`/api/projections?startDate=${startDate}&endDate=${endDate}&groupBy=supplier`),
      ]);

      const monthlyData = await monthlyResponse.json();
      const supplierDataResult = await supplierResponse.json();

      setProjections(monthlyData);
      setSupplierData(supplierDataResult);
    } catch (error) {
      console.error('Failed to fetch projections:', error);
    } finally {
      setLoading(false);
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

  const totalProjected = projections.reduce((sum, p) => sum + p.amount, 0);

  const handleExport = () => {
    window.location.href = `/api/export?startDate=${startDate}&endDate=${endDate}&type=projections`;
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenerateMessage('');
    try {
      const response = await fetch('/api/projections/regenerate', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setRegenerateMessage(`Regenerated projections for ${data.regenerated}/${data.total} contracts.`);
        fetchProjections();
      } else {
        setRegenerateMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setRegenerateMessage('Failed to regenerate projections.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Projections</h1>
            <p className="text-gray-500">Forecast your commission income through 2035</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-outline flex items-center disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating...' : 'Regenerate Projections'}
            </button>
            <button onClick={handleExport} className="btn-primary flex items-center">
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Regenerate Message */}
        {regenerateMessage && (
          <div className={`p-4 rounded-lg text-sm ${
            regenerateMessage.startsWith('Error') || regenerateMessage.startsWith('Failed')
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-green-50 border border-green-200 text-green-600'
          }`}>
            {regenerateMessage}
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">View Mode</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'chart' | 'table')}
                className="input"
              >
                <option value="chart">Chart View</option>
                <option value="table">Table View</option>
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                  setEndDate(format(addYears(new Date(), 10), 'yyyy-MM-dd'));
                }}
                className="btn-outline"
              >
                Show All (to 2035)
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Projected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalProjected)}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Months Shown</p>
                <p className="text-2xl font-bold text-gray-900">{projections.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Average</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(projections.length > 0 ? totalProjected / projections.length : 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ecbs-teal)]"></div>
          </div>
        ) : viewMode === 'chart' ? (
          <>
            {/* Monthly Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Projections</h3>
              {projections.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projections}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        stroke="#6b7280"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={Math.floor(projections.length / 12)}
                      />
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
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  No projection data for the selected period.
                </div>
              )}
            </div>

            {/* Supplier Breakdown */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Supplier</h3>
              {supplierData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierData} layout="vertical">
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
                        width={120}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), 'Projected']}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="amount" fill="#1a365d" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No supplier data for the selected period.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Table View */
          <div className="card p-0">
            {projections.length > 0 ? (
              <div className="table-container max-h-[600px] overflow-y-auto">
                <table>
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th>Month</th>
                      <th className="text-right">Projected Amount</th>
                      <th className="text-right">Cumulative Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.reduce((acc: { rows: React.ReactElement[]; cumulative: number }, projection) => {
                      const newCumulative = acc.cumulative + projection.amount;
                      acc.rows.push(
                        <tr key={projection.monthKey}>
                          <td className="font-medium">{projection.month}</td>
                          <td className="text-right">{formatCurrency(projection.amount)}</td>
                          <td className="text-right text-gray-500">
                            {formatCurrency(newCumulative)}
                          </td>
                        </tr>
                      );
                      acc.cumulative = newCumulative;
                      return acc;
                    }, { rows: [], cumulative: 0 }).rows}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No projection data for the selected period.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
