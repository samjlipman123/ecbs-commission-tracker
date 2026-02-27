import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, format } from 'date-fns';

// Temporary debug endpoint - remove after verifying numbers
export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      include: { supplier: true },
    });

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    const next12End = endOfMonth(addMonths(monthStart, 11));

    const allProjections: { month: Date; amount: number; paymentType: string; supplierName: string; company: string }[] = [];

    for (const c of contracts) {
      const projections = calculatePaymentProjections({
        lockInDate: c.lockInDate,
        contractStartDate: c.contractStartDate,
        contractEndDate: c.contractEndDate,
        contractValue: c.contractValue,
        commsUR: c.commsUR,
        supplierName: c.supplier.name,
      });
      for (const p of projections) {
        allProjections.push({
          month: startOfMonth(p.month),
          amount: p.amount,
          paymentType: p.paymentType,
          supplierName: c.supplier.name,
          company: c.companyName,
        });
      }
    }

    // This Month
    const thisMonth = allProjections
      .filter(p => p.month >= monthStart && p.month <= monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    // Calendar year
    const thisYear = allProjections
      .filter(p => p.month >= yearStart && p.month <= yearEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    // Next 12 months
    const next12 = allProjections
      .filter(p => p.month >= monthStart && p.month <= next12End)
      .reduce((sum, p) => sum + p.amount, 0);

    // Monthly chart
    const monthlyChart: { month: string; amount: number }[] = [];
    let chartTotal = 0;
    for (let i = 0; i < 12; i++) {
      const m = addMonths(monthStart, i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const amt = allProjections.filter(p => p.month >= mStart && p.month <= mEnd).reduce((sum, p) => sum + p.amount, 0);
      chartTotal += amt;
      monthlyChart.push({ month: format(m, 'MMM yy'), amount: Math.round(amt * 100) / 100 });
    }

    // Jan 2026 specifically
    const jan26Start = new Date(2026, 0, 1);
    const jan26End = endOfMonth(jan26Start);
    const jan26Projs = allProjections.filter(p => p.month >= jan26Start && p.month <= jan26End);
    const jan26Total = jan26Projs.reduce((sum, p) => sum + p.amount, 0);

    // Jan 2027
    const jan27Start = new Date(2027, 0, 1);
    const jan27End = endOfMonth(jan27Start);
    const jan27Total = allProjections.filter(p => p.month >= jan27Start && p.month <= jan27End).reduce((sum, p) => sum + p.amount, 0);

    // Stored PaymentProjection count
    const storedCount = await prisma.paymentProjection.count();

    // Export simulation
    const exportAll = allProjections.length;

    return NextResponse.json({
      totalContracts: contracts.length,
      totalProjectionRecords: allProjections.length,
      thisMonth: Math.round(thisMonth * 100) / 100,
      thisYear: Math.round(thisYear * 100) / 100,
      next12Months: Math.round(next12 * 100) / 100,
      chartTotal: Math.round(chartTotal * 100) / 100,
      monthlyChart,
      jan2026: {
        total: Math.round(jan26Total * 100) / 100,
        breakdown: jan26Projs.map(p => ({
          company: p.company,
          supplier: p.supplierName,
          type: p.paymentType,
          amount: Math.round(p.amount * 100) / 100,
        })),
      },
      jan2027Total: Math.round(jan27Total * 100) / 100,
      discrepancy: {
        thisYearMinusChartTotal: Math.round((thisYear - chartTotal) * 100) / 100,
        explanation: 'This Year includes Jan 2026 but not Jan 2027. Chart includes Jan 2027 but not Jan 2026.',
      },
      storedPaymentProjectionCount: storedCount,
      dynamicExportRowCount: exportAll,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
