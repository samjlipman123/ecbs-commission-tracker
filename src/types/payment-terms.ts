// Structured payment terms types for supplier configuration

export type PaymentTrigger = 'lock_in' | 'csd' | 'ced';
export type PaymentTiming = 'at' | 'before' | 'after';

export interface PaymentSplit {
  percentage: number;           // 0-100
  trigger: PaymentTrigger;      // What event triggers this payment
  timing: PaymentTiming;        // Before, at, or after the trigger
  monthsOffset: number;         // Number of months offset (0 = at trigger)
  paymentType: 'signature' | 'live' | 'reconciliation' | 'arrears';
}

export interface ConditionalRule {
  condition: 'months_to_csd' | 'contract_length' | 'uplift_rate';
  operator: 'lte' | 'gt' | 'gte' | 'lt';  // <=, >, >=, <
  value: number;                           // Threshold value (months or rate)
  payments: PaymentSplit[];                // Payment splits when condition is true
}

export interface StructuredPaymentTerms {
  // Default payment splits (when no conditions match or no conditions exist)
  defaultPayments: PaymentSplit[];

  // Conditional rules (evaluated in order, first match wins)
  conditionalRules?: ConditionalRule[];

  // Uplift cap (p/kWh) - anything over this paid in arrears
  upliftCap?: number;

  // For contracts over certain length, special handling
  maxContractMonths?: number;

  // Description for display
  description?: string;
}

// Helper to create default 80/20 live payment terms
export const defaultPaymentTerms: StructuredPaymentTerms = {
  defaultPayments: [
    {
      percentage: 80,
      trigger: 'csd',
      timing: 'after',
      monthsOffset: 1,
      paymentType: 'live'
    },
    {
      percentage: 20,
      trigger: 'ced',
      timing: 'after',
      monthsOffset: 2,
      paymentType: 'reconciliation'
    }
  ],
  description: '80% on live (1 month after CSD), 20% reconciliation (2 months after CED)'
};

// Common payment term presets
export const paymentTermPresets: Record<string, StructuredPaymentTerms> = {
  'standard_80_20_live': {
    defaultPayments: [
      { percentage: 80, trigger: 'csd', timing: 'after', monthsOffset: 1, paymentType: 'live' },
      { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
    ],
    description: '80% live (CSD+1), 20% reconciliation (CED+2)'
  },
  'standard_80_20_signature': {
    defaultPayments: [
      { percentage: 80, trigger: 'lock_in', timing: 'after', monthsOffset: 1, paymentType: 'signature' },
      { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
    ],
    description: '80% signature (Lock-in+1), 20% reconciliation (CED+2)'
  },
  'standard_70_30_live': {
    defaultPayments: [
      { percentage: 70, trigger: 'csd', timing: 'after', monthsOffset: 1, paymentType: 'live' },
      { percentage: 30, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
    ],
    description: '70% live (CSD+1), 30% reconciliation (CED+2)'
  },
  'standard_50_30_20': {
    defaultPayments: [
      { percentage: 50, trigger: 'lock_in', timing: 'after', monthsOffset: 1, paymentType: 'signature' },
      { percentage: 30, trigger: 'csd', timing: 'at', monthsOffset: 0, paymentType: 'live' },
      { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
    ],
    description: '50% signature (Lock-in+1), 30% live (CSD), 20% reconciliation (CED+2)'
  },
  'standard_40_40_20': {
    defaultPayments: [
      { percentage: 40, trigger: 'lock_in', timing: 'at', monthsOffset: 0, paymentType: 'signature' },
      { percentage: 40, trigger: 'csd', timing: 'at', monthsOffset: 0, paymentType: 'live' },
      { percentage: 20, trigger: 'ced', timing: 'at', monthsOffset: 0, paymentType: 'reconciliation' }
    ],
    description: '40% signature (Lock-in), 40% live (CSD), 20% reconciliation (CED)'
  },
  'standard_20_60_20': {
    defaultPayments: [
      { percentage: 20, trigger: 'lock_in', timing: 'at', monthsOffset: 0, paymentType: 'signature' },
      { percentage: 60, trigger: 'csd', timing: 'at', monthsOffset: 0, paymentType: 'live' },
      { percentage: 20, trigger: 'ced', timing: 'after', monthsOffset: 2, paymentType: 'reconciliation' }
    ],
    description: '20% signature (Lock-in), 60% live (CSD), 20% reconciliation (CED+2)'
  }
};

// Helper function to convert trigger to display text
export function triggerToText(trigger: PaymentTrigger): string {
  switch (trigger) {
    case 'lock_in': return 'Lock-in Date';
    case 'csd': return 'Contract Start Date (CSD)';
    case 'ced': return 'Contract End Date (CED)';
  }
}

// Helper function to format payment split for display
export function formatPaymentSplit(split: PaymentSplit): string {
  const triggerText = triggerToText(split.trigger);
  let timingText = '';

  if (split.monthsOffset === 0) {
    timingText = `at ${triggerText}`;
  } else if (split.timing === 'before') {
    timingText = `${split.monthsOffset} month${split.monthsOffset > 1 ? 's' : ''} before ${triggerText}`;
  } else {
    timingText = `${split.monthsOffset} month${split.monthsOffset > 1 ? 's' : ''} after ${triggerText}`;
  }

  return `${split.percentage}% ${split.paymentType} (${timingText})`;
}
