import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth, endOfMonth, parseISO, format, eachMonthOfInterval } from 'date-fns';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'month';

  try {
    // Fetch all contracts with their suppliers
    const contracts = await prisma.contract.findMany({
      include: { supplier: true },
    });

    // Calculate projections dynamically from contract data
    const allProjections: {
      month: Date;
      amount: number;
      paymentType: string;
      companyName: string;
      supplierName: string;
      contractId: string;
    }[] = [];

    for (const contract of contracts) {
      const projections = calculatePaymentProjections({
        lockInDate: contract.lockInDate,
        contractStartDate: contract.contractStartDate,
        contractEndDate: contract.contractEndDate,
        contractValue: contract.contractValue,
        commsUR: contract.commsUR,
        supplierName: contract.supplier.name,
      });

      for (const p of projections) {
        const projMonth = startOfMonth(p.month);

        // Apply date filter
        if (startDateParam && endDateParam) {
          const rangeStart = startOfMonth(parseISO(startDateParam));
          const rangeEnd = endOfMonth(parseISO(endDateParam));
          if (projMonth < rangeStart || projMonth > rangeEnd) continue;
        }

        allProjections.push({
          month: projMonth,
          amount: p.amount,
          paymentType: p.paymentType,
          companyName: contract.companyName,
          supplierName: contract.supplier.name,
          contractId: contract.id,
        });
      }
    }

    if (groupBy === 'month') {
      // Aggregate by month
      const monthTotals = new Map<string, number>();
      for (const p of allProjections) {
        const key = format(p.month, 'yyyy-MM');
        monthTotals.set(key, (monthTotals.get(key) || 0) + p.amount);
      }

      // Fill in missing months with zero
      if (startDateParam && endDateParam) {
        const months = eachMonthOfInterval({
          start: parseISO(startDateParam),
          end: parseISO(endDateParam),
        });

        const filledProjections = months.map((month) => ({
          month: format(month, 'MMM yyyy'),
          monthKey: format(month, 'yyyy-MM'),
          amount: monthTotals.get(format(month, 'yyyy-MM')) || 0,
        }));

        return NextResponse.json(filledProjections);
      }

      const sorted = Array.from(monthTotals.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, amount]) => ({
          month: format(parseISO(key + '-01'), 'MMM yyyy'),
          monthKey: key,
          amount,
        }));

      return NextResponse.json(sorted);
    }

    if (groupBy === 'supplier') {
      const supplierTotals = new Map<string, { name: string; amount: number }>();
      for (const p of allProjections) {
        const current = supplierTotals.get(p.supplierName) || { name: p.supplierName, amount: 0 };
        current.amount += p.amount;
        supplierTotals.set(p.supplierName, current);
      }

      return NextResponse.json(
        Array.from(supplierTotals.values()).sort((a, b) => b.amount - a.amount)
      );
    }

    if (groupBy === 'company') {
      const companyTotals = new Map<string, { name: string; amount: number }>();
      for (const p of allProjections) {
        const current = companyTotals.get(p.companyName) || { name: p.companyName, amount: 0 };
        current.amount += p.amount;
        companyTotals.set(p.companyName, current);
      }

      return NextResponse.json(
        Array.from(companyTotals.values()).sort((a, b) => b.amount - a.amount)
      );
    }

    // Detailed projections
    return NextResponse.json(
      allProjections
        .sort((a, b) => a.month.getTime() - b.month.getTime())
        .map((p) => ({
          month: format(p.month, 'MMM yyyy'),
          monthKey: format(p.month, 'yyyy-MM'),
          amount: p.amount,
          paymentType: p.paymentType,
          companyName: p.companyName,
          supplierName: p.supplierName,
          contractId: p.contractId,
        }))
    );
  } catch (error) {
    console.error('Projections fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 });
  }
}
