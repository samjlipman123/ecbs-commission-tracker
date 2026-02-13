'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Save, X, Building2 } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  paymentTerms: string;
  upliftCap: number | null;
  isActive: boolean;
}

interface PaymentSplit {
  percentage: number;
  trigger: 'lock_in' | 'csd' | 'ced';
  timing: 'at' | 'before' | 'after';
  monthsOffset: number;
  paymentType: 'signature' | 'live' | 'reconciliation' | 'arrears';
}

interface ConditionalRule {
  condition: 'months_to_csd' | 'contract_length';
  operator: 'lte' | 'gt';
  value: number;
  payments: PaymentSplit[];
}

interface StructuredPaymentTerms {
  defaultPayments: PaymentSplit[];
  conditionalRules?: ConditionalRule[];
  upliftCap?: number;
  description?: string;
}

const emptyPaymentSplit: PaymentSplit = {
  percentage: 80,
  trigger: 'csd',
  timing: 'after',
  monthsOffset: 1,
  paymentType: 'live'
};

const presets: Record<string, { name: string; terms: StructuredPaymentTerms }> = {
  standard_80_20_live: {
    name: '80/20 Live (Standard)',
    terms: {
      defaultPayments: [
        { percentage: 80, trigger: 'csd', timing: 'after', monthsOffset: 1, paymentType: 'live' },
        { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
      ],
      description: '80% live (CSD+1), 20% reconciliation (CED+2)'
    }
  },
  standard_80_20_live_at_csd: {
    name: '80/20 Live at CSD',
    terms: {
      defaultPayments: [
        { percentage: 80, trigger: 'csd', timing: 'at', monthsOffset: 0, paymentType: 'live' },
        { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
      ],
      description: '80% live (at CSD), 20% reconciliation (CED+2)'
    }
  },
  standard_80_20_signature: {
    name: '80/20 Signature',
    terms: {
      defaultPayments: [
        { percentage: 80, trigger: 'lock_in', timing: 'after', monthsOffset: 1, paymentType: 'signature' },
        { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
      ],
      description: '80% signature (Lock-in+1), 20% reconciliation (CED+2)'
    }
  },
  standard_80_20_signature_at_lockin: {
    name: '80/20 Signature at Lock-in',
    terms: {
      defaultPayments: [
        { percentage: 80, trigger: 'lock_in', timing: 'at', monthsOffset: 0, paymentType: 'signature' },
        { percentage: 20, trigger: 'ced', timing: 'at', monthsOffset: 0, paymentType: 'reconciliation' }
      ],
      description: '80% signature (at Lock-in), 20% reconciliation (at CED)'
    }
  },
  standard_70_30_live: {
    name: '70/30 Live',
    terms: {
      defaultPayments: [
        { percentage: 70, trigger: 'csd', timing: 'after', monthsOffset: 1, paymentType: 'live' },
        { percentage: 30, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
      ],
      description: '70% live (CSD+1), 30% reconciliation (CED+2)'
    }
  },
  standard_70_30_signature: {
    name: '70/30 Signature',
    terms: {
      defaultPayments: [
        { percentage: 70, trigger: 'lock_in', timing: 'after', monthsOffset: 1, paymentType: 'signature' },
        { percentage: 30, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
      ],
      description: '70% signature (Lock-in+1), 30% reconciliation (CED+2)'
    }
  },
  standard_50_30_20: {
    name: '50/30/20 Split',
    terms: {
      defaultPayments: [
        { percentage: 50, trigger: 'lock_in', timing: 'after', monthsOffset: 1, paymentType: 'signature' },
        { percentage: 30, trigger: 'csd', timing: 'at', monthsOffset: 0, paymentType: 'live' },
        { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
      ],
      description: '50% signature, 30% live, 20% reconciliation'
    }
  },
  standard_40_40_20: {
    name: '40/40/20 Split',
    terms: {
      defaultPayments: [
        { percentage: 40, trigger: 'lock_in', timing: 'at', monthsOffset: 0, paymentType: 'signature' },
        { percentage: 40, trigger: 'csd', timing: 'at', monthsOffset: 0, paymentType: 'live' },
        { percentage: 20, trigger: 'ced', timing: 'at', monthsOffset: 0, paymentType: 'reconciliation' }
      ],
      description: '40% signature, 40% live, 20% reconciliation'
    }
  },
  standard_20_60_20: {
    name: '20/60/20 Split',
    terms: {
      defaultPayments: [
        { percentage: 20, trigger: 'lock_in', timing: 'at', monthsOffset: 0, paymentType: 'signature' },
        { percentage: 60, trigger: 'csd', timing: 'at', monthsOffset: 0, paymentType: 'live' },
        { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
      ],
      description: '20% signature, 60% live, 20% reconciliation'
    }
  },
  custom: {
    name: 'Custom',
    terms: {
      defaultPayments: [{ ...emptyPaymentSplit }],
      description: ''
    }
  }
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    preset: 'standard_80_20_live',
    paymentTerms: presets.standard_80_20_live.terms,
    upliftCap: '',
    hasConditionalRules: false,
    conditionalRules: [] as ConditionalRule[]
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?includeAll=true');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (presetKey: string) => {
    setFormData(prev => ({
      ...prev,
      preset: presetKey,
      paymentTerms: JSON.parse(JSON.stringify(presets[presetKey].terms))
    }));
  };

  const updatePaymentSplit = (index: number, field: keyof PaymentSplit, value: string | number) => {
    setFormData(prev => {
      const newPayments = [...prev.paymentTerms.defaultPayments];
      newPayments[index] = { ...newPayments[index], [field]: value };

      // Auto-set monthsOffset to 0 when timing is 'at'
      if (field === 'timing' && value === 'at') {
        newPayments[index].monthsOffset = 0;
      }

      return {
        ...prev,
        preset: 'custom',
        paymentTerms: { ...prev.paymentTerms, defaultPayments: newPayments }
      };
    });
  };

  const addPaymentSplit = () => {
    setFormData(prev => ({
      ...prev,
      preset: 'custom',
      paymentTerms: {
        ...prev.paymentTerms,
        defaultPayments: [...prev.paymentTerms.defaultPayments, { ...emptyPaymentSplit, percentage: 0 }]
      }
    }));
  };

  const removePaymentSplit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preset: 'custom',
      paymentTerms: {
        ...prev.paymentTerms,
        defaultPayments: prev.paymentTerms.defaultPayments.filter((_, i) => i !== index)
      }
    }));
  };

  // Conditional rules management
  const addConditionalRule = () => {
    setFormData(prev => ({
      ...prev,
      hasConditionalRules: true,
      conditionalRules: [
        ...prev.conditionalRules,
        {
          condition: 'months_to_csd',
          operator: 'lte',
          value: 24,
          payments: [{ ...emptyPaymentSplit }]
        }
      ]
    }));
  };

  const updateConditionalRule = (ruleIndex: number, field: keyof ConditionalRule, value: unknown) => {
    setFormData(prev => {
      const newRules = [...prev.conditionalRules];
      newRules[ruleIndex] = { ...newRules[ruleIndex], [field]: value };
      return { ...prev, conditionalRules: newRules };
    });
  };

  const updateConditionalPaymentSplit = (
    ruleIndex: number,
    splitIndex: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setFormData(prev => {
      const newRules = [...prev.conditionalRules];
      const newPayments = [...newRules[ruleIndex].payments];
      newPayments[splitIndex] = { ...newPayments[splitIndex], [field]: value };
      if (field === 'timing' && value === 'at') {
        newPayments[splitIndex].monthsOffset = 0;
      }
      newRules[ruleIndex].payments = newPayments;
      return { ...prev, conditionalRules: newRules };
    });
  };

  const addConditionalPaymentSplit = (ruleIndex: number) => {
    setFormData(prev => {
      const newRules = [...prev.conditionalRules];
      newRules[ruleIndex].payments.push({ ...emptyPaymentSplit, percentage: 0 });
      return { ...prev, conditionalRules: newRules };
    });
  };

  const removeConditionalPaymentSplit = (ruleIndex: number, splitIndex: number) => {
    setFormData(prev => {
      const newRules = [...prev.conditionalRules];
      newRules[ruleIndex].payments = newRules[ruleIndex].payments.filter((_, i) => i !== splitIndex);
      return { ...prev, conditionalRules: newRules };
    });
  };

  const removeConditionalRule = (ruleIndex: number) => {
    setFormData(prev => {
      const newRules = prev.conditionalRules.filter((_, i) => i !== ruleIndex);
      return {
        ...prev,
        conditionalRules: newRules,
        hasConditionalRules: newRules.length > 0
      };
    });
  };

  const generateDescription = (payments: PaymentSplit[]): string => {
    return payments.map(p => {
      const triggerMap: Record<string, string> = {
        lock_in: 'Lock-in',
        csd: 'CSD',
        ced: 'CED'
      };
      const offset = p.monthsOffset === 0 ? '' : (p.timing === 'after' ? `+${p.monthsOffset}` : `-${p.monthsOffset}`);
      return `${p.percentage}% ${p.paymentType} (${triggerMap[p.trigger]}${offset})`;
    }).join(', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const totalPercentage = formData.paymentTerms.defaultPayments.reduce((sum, p) => sum + p.percentage, 0);
    if (totalPercentage !== 100) {
      setError(`Payment percentages must total 100%. Current total: ${totalPercentage}%`);
      return;
    }

    // Validate conditional rules
    for (let i = 0; i < formData.conditionalRules.length; i++) {
      const rule = formData.conditionalRules[i];
      const ruleTotal = rule.payments.reduce((sum, p) => sum + p.percentage, 0);
      if (ruleTotal !== 100) {
        setError(`Conditional rule ${i + 1} percentages must total 100%. Current total: ${ruleTotal}%`);
        return;
      }
    }

    setSaving(true);

    try {
      const description = generateDescription(formData.paymentTerms.defaultPayments);
      const termsWithDescription: StructuredPaymentTerms = {
        ...formData.paymentTerms,
        description,
        conditionalRules: formData.conditionalRules.length > 0 ? formData.conditionalRules : undefined,
        upliftCap: formData.upliftCap ? parseFloat(formData.upliftCap) : undefined
      };

      const response = await fetch(editingSupplier ? `/api/suppliers/${editingSupplier}` : '/api/suppliers', {
        method: editingSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          paymentTerms: JSON.stringify(termsWithDescription),
          upliftCap: formData.upliftCap ? parseFloat(formData.upliftCap) : null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save supplier');
      }

      await fetchSuppliers();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      preset: 'standard_80_20_live',
      paymentTerms: JSON.parse(JSON.stringify(presets.standard_80_20_live.terms)),
      upliftCap: '',
      hasConditionalRules: false,
      conditionalRules: []
    });
    setEditingSupplier(null);
    setShowNewForm(false);
    setError('');
  };

  const startEditing = (supplier: Supplier) => {
    let parsedTerms: StructuredPaymentTerms;
    let conditionalRules: ConditionalRule[] = [];

    try {
      parsedTerms = JSON.parse(supplier.paymentTerms);
      conditionalRules = parsedTerms.conditionalRules || [];
    } catch {
      // Legacy text-based terms - use default
      parsedTerms = JSON.parse(JSON.stringify(presets.standard_80_20_live.terms));
    }

    setFormData({
      name: supplier.name,
      preset: 'custom',
      paymentTerms: parsedTerms,
      upliftCap: supplier.upliftCap?.toString() || '',
      hasConditionalRules: conditionalRules.length > 0,
      conditionalRules
    });
    setEditingSupplier(supplier.id);
    setShowNewForm(true);
    setError('');
  };

  const handleDelete = async (supplier: Supplier) => {
    const confirmMessage = `Are you sure you want to delete "${supplier.name}"?\n\nIf this supplier has existing contracts, it will be marked as inactive instead of deleted.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(supplier.id);
    setError('');

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete supplier');
      }

      await fetchSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete supplier');
    } finally {
      setDeleting(null);
    }
  };

  const formatPaymentTermsDisplay = (termsJson: string): string => {
    try {
      const terms: StructuredPaymentTerms = JSON.parse(termsJson);
      return terms.description || generateDescription(terms.defaultPayments);
    } catch {
      // Legacy text-based terms
      return termsJson;
    }
  };

  const PaymentSplitRow = ({
    split,
    index,
    onUpdate,
    onRemove,
    canRemove
  }: {
    split: PaymentSplit;
    index: number;
    onUpdate: (index: number, field: keyof PaymentSplit, value: string | number) => void;
    onRemove: (index: number) => void;
    canRemove: boolean;
  }) => (
    <div className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* Percentage */}
        <div>
          <label className="text-xs text-gray-500">Percentage</label>
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              value={split.percentage}
              onChange={(e) => onUpdate(index, 'percentage', parseInt(e.target.value) || 0)}
              className="input py-1 text-sm"
            />
            <span className="ml-1 text-gray-500">%</span>
          </div>
        </div>

        {/* Payment Type */}
        <div>
          <label className="text-xs text-gray-500">Type</label>
          <select
            value={split.paymentType}
            onChange={(e) => onUpdate(index, 'paymentType', e.target.value)}
            className="input py-1 text-sm"
          >
            <option value="signature">Signature</option>
            <option value="live">Live</option>
            <option value="reconciliation">Reconciliation</option>
            <option value="arrears">Arrears</option>
          </select>
        </div>

        {/* Trigger */}
        <div>
          <label className="text-xs text-gray-500">Trigger</label>
          <select
            value={split.trigger}
            onChange={(e) => onUpdate(index, 'trigger', e.target.value)}
            className="input py-1 text-sm"
          >
            <option value="lock_in">Lock-in Date</option>
            <option value="csd">CSD</option>
            <option value="ced">CED</option>
          </select>
        </div>

        {/* Timing */}
        <div>
          <label className="text-xs text-gray-500">Timing</label>
          <select
            value={split.timing}
            onChange={(e) => onUpdate(index, 'timing', e.target.value)}
            className="input py-1 text-sm"
          >
            <option value="at">At</option>
            <option value="before">Before</option>
            <option value="after">After</option>
          </select>
        </div>

        {/* Months Offset */}
        <div>
          <label className="text-xs text-gray-500">Months</label>
          <input
            type="number"
            min="0"
            max="24"
            value={split.monthsOffset}
            onChange={(e) => onUpdate(index, 'monthsOffset', parseInt(e.target.value) || 0)}
            className="input py-1 text-sm"
            disabled={split.timing === 'at'}
          />
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 mt-5"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
            <p className="text-gray-500">Configure suppliers and their payment terms</p>
          </div>
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </button>
          )}
        </div>

        {/* New/Edit Supplier Form */}
        {showNewForm && (
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier Name */}
              <div>
                <label className="label">Supplier Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="e.g., British Gas"
                  required
                />
              </div>

              {/* Preset Selection */}
              <div>
                <label className="label">Payment Terms Preset</label>
                <select
                  value={formData.preset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="input"
                >
                  {Object.entries(presets).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.name}</option>
                  ))}
                </select>
              </div>

              {/* Default Payment Splits */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="label mb-0">Default Payment Splits</label>
                  <span className={`text-sm ${
                    formData.paymentTerms.defaultPayments.reduce((sum, p) => sum + p.percentage, 0) === 100
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    Total: {formData.paymentTerms.defaultPayments.reduce((sum, p) => sum + p.percentage, 0)}%
                  </span>
                </div>

                <div className="space-y-3">
                  {formData.paymentTerms.defaultPayments.map((split, index) => (
                    <PaymentSplitRow
                      key={index}
                      split={split}
                      index={index}
                      onUpdate={updatePaymentSplit}
                      onRemove={removePaymentSplit}
                      canRemove={formData.paymentTerms.defaultPayments.length > 1}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addPaymentSplit}
                  className="mt-3 text-sm text-primary hover:text-primary-dark flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Payment Split
                </button>
              </div>

              {/* Conditional Rules */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <label className="label mb-0">Conditional Rules (Optional)</label>
                    <p className="text-xs text-gray-500">
                      Add rules for different scenarios (e.g., based on months to CSD)
                    </p>
                  </div>
                  {!formData.hasConditionalRules && (
                    <button
                      type="button"
                      onClick={addConditionalRule}
                      className="text-sm text-primary hover:text-primary-dark flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Rule
                    </button>
                  )}
                </div>

                {formData.conditionalRules.map((rule, ruleIndex) => (
                  <div key={ruleIndex} className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-blue-800">Rule {ruleIndex + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeConditionalRule(ruleIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Condition */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-600">Condition</label>
                        <select
                          value={rule.condition}
                          onChange={(e) => updateConditionalRule(ruleIndex, 'condition', e.target.value)}
                          className="input py-1 text-sm"
                        >
                          <option value="months_to_csd">Months to CSD</option>
                          <option value="contract_length">Contract Length</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Operator</label>
                        <select
                          value={rule.operator}
                          onChange={(e) => updateConditionalRule(ruleIndex, 'operator', e.target.value)}
                          className="input py-1 text-sm"
                        >
                          <option value="lte">≤ (Less than or equal)</option>
                          <option value="gt">&gt; (Greater than)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Value (months)</label>
                        <input
                          type="number"
                          min="0"
                          value={rule.value}
                          onChange={(e) => updateConditionalRule(ruleIndex, 'value', parseInt(e.target.value) || 0)}
                          className="input py-1 text-sm"
                        />
                      </div>
                    </div>

                    {/* Conditional Payments */}
                    <div className="mb-2 flex justify-between items-center">
                      <label className="text-xs text-gray-600">Payment Splits for this rule</label>
                      <span className={`text-xs ${
                        rule.payments.reduce((sum, p) => sum + p.percentage, 0) === 100
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        Total: {rule.payments.reduce((sum, p) => sum + p.percentage, 0)}%
                      </span>
                    </div>

                    <div className="space-y-2 bg-white rounded p-2">
                      {rule.payments.map((split, splitIndex) => (
                        <PaymentSplitRow
                          key={splitIndex}
                          split={split}
                          index={splitIndex}
                          onUpdate={(idx, field, value) =>
                            updateConditionalPaymentSplit(ruleIndex, idx, field, value)
                          }
                          onRemove={(idx) => removeConditionalPaymentSplit(ruleIndex, idx)}
                          canRemove={rule.payments.length > 1}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addConditionalPaymentSplit(ruleIndex)}
                      className="mt-2 text-xs text-primary hover:text-primary-dark flex items-center"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Split
                    </button>
                  </div>
                ))}

                {formData.hasConditionalRules && (
                  <button
                    type="button"
                    onClick={addConditionalRule}
                    className="text-sm text-primary hover:text-primary-dark flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Another Rule
                  </button>
                )}
              </div>

              {/* Uplift Cap */}
              <div>
                <label className="label">Uplift Cap (p/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.upliftCap}
                  onChange={(e) => setFormData(prev => ({ ...prev, upliftCap: e.target.value }))}
                  className="input w-48"
                  placeholder="e.g., 1.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank if no cap. Amounts over cap are paid in monthly arrears.
                </p>
              </div>

              {/* Preview */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <label className="text-xs text-blue-700 font-medium">Payment Terms Preview</label>
                <p className="text-sm text-blue-900 mt-1">
                  {generateDescription(formData.paymentTerms.defaultPayments)}
                </p>
                {formData.conditionalRules.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-700">Conditional rules:</p>
                    {formData.conditionalRules.map((rule, i) => (
                      <p key={i} className="text-xs text-blue-800 mt-1">
                        If {rule.condition.replace('_', ' ')} {rule.operator === 'lte' ? '≤' : '>'} {rule.value} months:
                        {' '}{generateDescription(rule.payments)}
                      </p>
                    ))}
                  </div>
                )}
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
                  {saving ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Add Supplier')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Suppliers List */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Suppliers ({suppliers.length})</h2>

          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">No suppliers configured yet.</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-primary"
              >
                Add Your First Supplier
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedSupplier(
                      expandedSupplier === supplier.id ? null : supplier.id
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{supplier.name}</span>
                        {!supplier.isActive && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            Inactive
                          </span>
                        )}
                        {supplier.upliftCap && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                            Cap: {supplier.upliftCap}p/kWh
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatPaymentTermsDisplay(supplier.paymentTerms)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(supplier);
                        }}
                        className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded"
                        title="Edit supplier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(supplier);
                        }}
                        disabled={deleting === supplier.id}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Delete supplier"
                      >
                        <Trash2 className={`w-4 h-4 ${deleting === supplier.id ? 'animate-pulse' : ''}`} />
                      </button>
                      {expandedSupplier === supplier.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedSupplier === supplier.id && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                      <div className="text-sm">
                        <h4 className="font-medium text-gray-700 mb-2">Payment Schedule</h4>
                        {(() => {
                          try {
                            const terms: StructuredPaymentTerms = JSON.parse(supplier.paymentTerms);
                            return (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500 font-medium">Default payments:</p>
                                  {terms.defaultPayments.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <span className="w-16 font-medium text-primary">{p.percentage}%</span>
                                      <span className="px-2 py-0.5 bg-white rounded text-xs capitalize">
                                        {p.paymentType}
                                      </span>
                                      <span className="text-gray-600">
                                        {p.timing === 'at' ? 'at' : `${p.monthsOffset} month${p.monthsOffset !== 1 ? 's' : ''} ${p.timing}`}
                                        {' '}
                                        {p.trigger === 'lock_in' ? 'Lock-in' : p.trigger.toUpperCase()}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {terms.conditionalRules && terms.conditionalRules.length > 0 && (
                                  <div className="pt-2 border-t">
                                    <p className="text-xs text-gray-500 font-medium mb-2">Conditional rules:</p>
                                    {terms.conditionalRules.map((rule, ri) => (
                                      <div key={ri} className="mb-2 p-2 bg-white rounded">
                                        <p className="text-xs text-gray-600 mb-1">
                                          If {rule.condition.replace('_', ' ')} {rule.operator === 'lte' ? '≤' : '>'} {rule.value} months:
                                        </p>
                                        {rule.payments.map((p, pi) => (
                                          <div key={pi} className="flex items-center gap-2 ml-2">
                                            <span className="w-12 font-medium text-primary text-xs">{p.percentage}%</span>
                                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs capitalize">
                                              {p.paymentType}
                                            </span>
                                            <span className="text-gray-600 text-xs">
                                              {p.timing === 'at' ? 'at' : `${p.monthsOffset}m ${p.timing}`}
                                              {' '}
                                              {p.trigger === 'lock_in' ? 'Lock-in' : p.trigger.toUpperCase()}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          } catch {
                            return (
                              <p className="text-gray-600 italic">
                                Legacy terms: {supplier.paymentTerms}
                              </p>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
