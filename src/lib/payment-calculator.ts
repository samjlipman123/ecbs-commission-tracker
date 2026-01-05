import { addMonths, startOfMonth, endOfMonth, differenceInMonths, isSameMonth } from 'date-fns';

export interface ContractData {
  lockInDate: Date;
  contractStartDate: Date; // CSD
  contractEndDate: Date;   // CED
  contractValue: number;
  commsUR: number;         // Uplift rate p/kWh
  supplierName: string;
}

export interface PaymentProjection {
  month: Date;
  amount: number;
  paymentType: 'signature' | 'live' | 'reconciliation' | 'arrears';
}

// Helper to check if two dates are in the same month
function sameMonth(date1: Date, date2: Date): boolean {
  return isSameMonth(date1, date2);
}

// Get end of month for a date
function getEndOfMonth(date: Date): Date {
  return endOfMonth(date);
}

// Calculate payments for British Gas (Acquisition)
// 70% on live (month after CSD), 30% reconciliation 2 months after CED
function calculateBritishGas(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { contractStartDate, contractEndDate, contractValue } = contract;

  // 70% one month after CSD (live)
  const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
  projections.push({
    month: liveMonth,
    amount: contractValue * 0.7,
    paymentType: 'live'
  });

  // 30% two months after CED (reconciliation)
  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.3,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Calculate payments for British Gas Renewals
// 70% on signature (month after lock-in), 30% reconciliation 2 months after CED
function calculateBritishGasRenewals(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { lockInDate, contractEndDate, contractValue } = contract;

  // 70% one month after lock-in (signature)
  const signatureMonth = startOfMonth(addMonths(lockInDate, 1));
  projections.push({
    month: signatureMonth,
    amount: contractValue * 0.7,
    paymentType: 'signature'
  });

  // 30% two months after CED (reconciliation)
  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.3,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Calculate payments for Brook Green Supply
// 80% on live, 20% reconciliation. Anything over 1.5p/kWh paid monthly in arrears
function calculateBrookGreenSupply(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { contractStartDate, contractEndDate, contractValue, commsUR } = contract;
  const UPLIFT_CAP = 1.5;

  if (commsUR <= UPLIFT_CAP) {
    // Standard 80/20 split
    const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
    projections.push({
      month: liveMonth,
      amount: contractValue * 0.8,
      paymentType: 'live'
    });

    const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: reconciliationMonth,
      amount: contractValue * 0.2,
      paymentType: 'reconciliation'
    });
  } else {
    // Over cap - spread payments monthly in arrears
    const cappedValue = contractValue * (UPLIFT_CAP / commsUR);
    const arrearsValue = contractValue - cappedValue;

    // 80% of capped value on live
    const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
    projections.push({
      month: liveMonth,
      amount: cappedValue * 0.8,
      paymentType: 'live'
    });

    // 20% of capped value on reconciliation
    const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: reconciliationMonth,
      amount: cappedValue * 0.2,
      paymentType: 'reconciliation'
    });

    // Arrears spread monthly from CSD to CED
    const monthsInContract = differenceInMonths(contractEndDate, contractStartDate) + 1;
    const monthlyArrears = arrearsValue / monthsInContract;

    let currentMonth = startOfMonth(addMonths(contractStartDate, 1));
    const endMonth = startOfMonth(addMonths(contractEndDate, 1));

    while (currentMonth <= endMonth) {
      projections.push({
        month: new Date(currentMonth),
        amount: monthlyArrears,
        paymentType: 'arrears'
      });
      currentMonth = addMonths(currentMonth, 1);
    }
  }

  return projections;
}

// Calculate payments for Corona Upfront
// 80% signature (18 months before CSD if >18 months out), 4p power/3p gas cap,
// >6yr in arrears. 20% reconciliation 2 months after CED
function calculateCoronaUpfront(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { lockInDate, contractStartDate, contractEndDate, contractValue } = contract;

  const monthsToStart = differenceInMonths(contractStartDate, lockInDate);

  // Determine signature payment date
  let signatureMonth: Date;
  if (monthsToStart > 18) {
    // Pay 18 months before CSD
    signatureMonth = startOfMonth(addMonths(contractStartDate, -18));
  } else {
    // Pay month after lock-in
    signatureMonth = startOfMonth(addMonths(lockInDate, 1));
  }

  // 80% signature
  projections.push({
    month: signatureMonth,
    amount: contractValue * 0.8,
    paymentType: 'signature'
  });

  // 20% reconciliation 2 months after CED
  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.2,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Calculate payments for Crown Gas & Power
// 80% live up to 36 months, longer contracts reconciled at 36 months
function calculateCrownGasPower(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { contractStartDate, contractEndDate, contractValue } = contract;

  const contractMonths = differenceInMonths(contractEndDate, contractStartDate);

  if (contractMonths <= 36) {
    // Standard 80/20
    const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
    projections.push({
      month: liveMonth,
      amount: contractValue * 0.8,
      paymentType: 'live'
    });

    const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: reconciliationMonth,
      amount: contractValue * 0.2,
      paymentType: 'reconciliation'
    });
  } else {
    // First 36 months portion
    const first36Value = contractValue * (36 / contractMonths);
    const remainderValue = contractValue - first36Value;

    const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
    projections.push({
      month: liveMonth,
      amount: first36Value * 0.8,
      paymentType: 'live'
    });

    // Reconciliation at 36 months
    const reconciliation36Month = startOfMonth(addMonths(contractStartDate, 38));
    projections.push({
      month: reconciliation36Month,
      amount: first36Value * 0.2,
      paymentType: 'reconciliation'
    });

    // Remainder 80% at 36 months
    projections.push({
      month: reconciliation36Month,
      amount: remainderValue * 0.8,
      paymentType: 'live'
    });

    // Final 20% at CED
    const finalReconciliation = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: finalReconciliation,
      amount: remainderValue * 0.2,
      paymentType: 'reconciliation'
    });
  }

  return projections;
}

// Calculate payments for Engie Upfront (Acquisition)
// 50% signature, 30% on live, 20% 2 months after CED
// If >2 years to CSD from lock-in, paid 80% live
function calculateEngieUpfront(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { lockInDate, contractStartDate, contractEndDate, contractValue } = contract;

  const monthsToStart = differenceInMonths(contractStartDate, lockInDate);

  if (monthsToStart > 24) {
    // >2 years to CSD - 80% live, 20% reconciliation
    const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
    projections.push({
      month: liveMonth,
      amount: contractValue * 0.8,
      paymentType: 'live'
    });

    const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: reconciliationMonth,
      amount: contractValue * 0.2,
      paymentType: 'reconciliation'
    });
  } else {
    // Standard 50/30/20
    const signatureMonth = startOfMonth(addMonths(lockInDate, 1));
    projections.push({
      month: signatureMonth,
      amount: contractValue * 0.5,
      paymentType: 'signature'
    });

    const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
    projections.push({
      month: liveMonth,
      amount: contractValue * 0.3,
      paymentType: 'live'
    });

    const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: reconciliationMonth,
      amount: contractValue * 0.2,
      paymentType: 'reconciliation'
    });
  }

  return projections;
}

// Calculate payments for EonNext
// 80% signature, 20% 2 months after CED
function calculateEonNext(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { lockInDate, contractEndDate, contractValue } = contract;

  const signatureMonth = startOfMonth(addMonths(lockInDate, 1));
  projections.push({
    month: signatureMonth,
    amount: contractValue * 0.8,
    paymentType: 'signature'
  });

  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.2,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Calculate payments for EonNext Renewal
// 80% on live, 20% 2 months after CED
function calculateEonNextRenewal(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { contractStartDate, contractEndDate, contractValue } = contract;

  const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
  projections.push({
    month: liveMonth,
    amount: contractValue * 0.8,
    paymentType: 'live'
  });

  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.2,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Calculate payments for Smartest Energy
// 80% signature up to 2 years CSD, 2-4 years is 40-40-20
function calculateSmartestEnergy(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { lockInDate, contractStartDate, contractEndDate, contractValue } = contract;

  const monthsToStart = differenceInMonths(contractStartDate, lockInDate);

  if (monthsToStart <= 24) {
    // Up to 2 years - 80% signature, 20% reconciliation
    const signatureMonth = startOfMonth(addMonths(lockInDate, 1));
    projections.push({
      month: signatureMonth,
      amount: contractValue * 0.8,
      paymentType: 'signature'
    });

    const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: reconciliationMonth,
      amount: contractValue * 0.2,
      paymentType: 'reconciliation'
    });
  } else {
    // 2-4 years: 40-40-20
    const signatureMonth = startOfMonth(addMonths(lockInDate, 1));
    projections.push({
      month: signatureMonth,
      amount: contractValue * 0.4,
      paymentType: 'signature'
    });

    const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
    projections.push({
      month: liveMonth,
      amount: contractValue * 0.4,
      paymentType: 'live'
    });

    const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
    projections.push({
      month: reconciliationMonth,
      amount: contractValue * 0.2,
      paymentType: 'reconciliation'
    });
  }

  return projections;
}

// Calculate payments for TotalEnergies
// 20% signature, 60% live (~15 days after), 20% 6 weeks after CED
function calculateTotalEnergies(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { lockInDate, contractStartDate, contractEndDate, contractValue } = contract;

  const signatureMonth = startOfMonth(addMonths(lockInDate, 1));
  projections.push({
    month: signatureMonth,
    amount: contractValue * 0.2,
    paymentType: 'signature'
  });

  const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
  projections.push({
    month: liveMonth,
    amount: contractValue * 0.6,
    paymentType: 'live'
  });

  // 6 weeks after CED (~2 months)
  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.2,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Calculate payments for Total Energies Renewal
// 80% signature 12 months before CSD if exceeding at lock-in
function calculateTotalEnergiesRenewal(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { lockInDate, contractStartDate, contractEndDate, contractValue } = contract;

  const monthsToStart = differenceInMonths(contractStartDate, lockInDate);

  let signatureMonth: Date;
  if (monthsToStart > 12) {
    signatureMonth = startOfMonth(addMonths(contractStartDate, -12));
  } else {
    signatureMonth = startOfMonth(addMonths(lockInDate, 1));
  }

  projections.push({
    month: signatureMonth,
    amount: contractValue * 0.8,
    paymentType: 'signature'
  });

  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.2,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Default calculation for unknown suppliers - 80/20 live/reconciliation
function calculateDefault(contract: ContractData): PaymentProjection[] {
  const projections: PaymentProjection[] = [];
  const { contractStartDate, contractEndDate, contractValue } = contract;

  const liveMonth = startOfMonth(addMonths(contractStartDate, 1));
  projections.push({
    month: liveMonth,
    amount: contractValue * 0.8,
    paymentType: 'live'
  });

  const reconciliationMonth = startOfMonth(addMonths(contractEndDate, 2));
  projections.push({
    month: reconciliationMonth,
    amount: contractValue * 0.2,
    paymentType: 'reconciliation'
  });

  return projections;
}

// Main calculation function
export function calculatePaymentProjections(contract: ContractData): PaymentProjection[] {
  const supplierName = contract.supplierName.trim().toLowerCase();

  // Map supplier names to calculation functions
  if (supplierName === 'british gas' || supplierName === 'british gas lite') {
    return calculateBritishGas(contract);
  }

  if (supplierName === 'british gas renewals' || supplierName === 'british gas renewal') {
    return calculateBritishGasRenewals(contract);
  }

  if (supplierName === 'brook green supply') {
    return calculateBrookGreenSupply(contract);
  }

  if (supplierName === 'corona upfront' || supplierName === 'corona') {
    return calculateCoronaUpfront(contract);
  }

  if (supplierName === 'crown gas & power' || supplierName === 'crown gas & power upfront') {
    return calculateCrownGasPower(contract);
  }

  if (supplierName === 'engie upfront' || supplierName === 'engie' || supplierName === 'engie renewal') {
    return calculateEngieUpfront(contract);
  }

  if (supplierName === 'eonnext' || supplierName === 'eon next') {
    return calculateEonNext(contract);
  }

  if (supplierName === 'eonnext renewal' || supplierName === 'eon next renewal') {
    return calculateEonNextRenewal(contract);
  }

  if (supplierName.includes('npower')) {
    return calculateEonNextRenewal(contract); // nPower uses similar 80/20 live
  }

  if (supplierName === 'smartest energy') {
    return calculateSmartestEnergy(contract);
  }

  if (supplierName === 'totalenergies' || supplierName === 'total energies') {
    return calculateTotalEnergies(contract);
  }

  if (supplierName === 'total energies renewal' || supplierName === 'totalenergies renewal') {
    return calculateTotalEnergiesRenewal(contract);
  }

  // Default for any other supplier
  return calculateDefault(contract);
}

// Aggregate projections by month
export function aggregateProjectionsByMonth(
  projections: PaymentProjection[]
): Map<string, number> {
  const aggregated = new Map<string, number>();

  for (const projection of projections) {
    const monthKey = projection.month.toISOString().slice(0, 7); // YYYY-MM
    const current = aggregated.get(monthKey) || 0;
    aggregated.set(monthKey, current + projection.amount);
  }

  return aggregated;
}
