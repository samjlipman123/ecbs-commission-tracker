import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, format } from 'date-fns';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get total contracts count
    const totalContracts = await prisma.contract.count();

    // Get total contract value
    const contractValueResult = await prisma.contract.aggregate({
      _sum: { contractValue: true },
    });
    const totalContractValue = contractValueResult._sum.contractValue || 0;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // Fetch all contracts with suppliers and calculate projections dynamically
    const contracts = await prisma.contract.findMany({
      include: { supplier: true },
    });

    // Calculate all projections from contract data
    const allProjections: { month: Date; amount: number; paymentType: string; supplierId: string; supplierName: string }[] = [];

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
        allProjections.push({
          month: startOfMonth(p.month),
          amount: p.amount,
          paymentType: p.paymentType,
          supplierId: contract.supplierId,
          supplierName: contract.supplier.name,
        });
      }
    }

    // Current month projection
    const currentMonthProjection = allProjections
      .filter((p) => p.month >= monthStart && p.month <= monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    // Current year projection
    const currentYearProjection = allProjections
      .filter((p) => p.month >= yearStart && p.month <= yearEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    // Next 12 months projections
    const monthlyProjections = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(monthStart, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);

      const amount = allProjections
        .filter((p) => p.month >= mStart && p.month <= mEnd)
        .reduce((sum, p) => sum + p.amount, 0);

      monthlyProjections.push({
        month: format(monthDate, 'MMM yy'),
        amount,
      });
    }

    // Get recent contracts
    const recentContracts = await prisma.contract.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { supplier: true },
    });

    // Get supplier breakdown
    const supplierBreakdown = await prisma.contract.groupBy({
      by: ['supplierId'],
      _sum: { contractValue: true },
      orderBy: { _sum: { contractValue: 'desc' } },
      take: 5,
    });

    const supplierIds = supplierBreakdown.map((s) => s.supplierId);
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
    });

    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

    const supplierBreakdownWithNames = supplierBreakdown.map((s) => ({
      name: supplierMap.get(s.supplierId) || 'Unknown',
      value: s._sum.contractValue || 0,
    }));

    // === Payment Status Calculations ===

    // Total projected to date (dynamically calculated)
    const projectedToDateAmount = allProjections
      .filter((p) => p.month <= monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    // Get total actual payments received
    const totalActualReceived = await prisma.actualPayment.aggregate({
      _sum: { amount: true },
    });

    const actualReceivedAmount = totalActualReceived._sum.amount || 0;
    const percentageReceived = projectedToDateAmount > 0
      ? Math.round((actualReceivedAmount / projectedToDateAmount) * 100)
      : 0;

    // Supplier payment status (dynamically calculated)
    const supplierStatusMap = new Map<string, {
      supplierId: string;
      supplierName: string;
      paid: number;
      outstanding: number;
      outstandingCount: number;
      upcoming: number;
      upcomingCount: number;
    }>();

    for (const projection of allProjections) {
      const { supplierId, supplierName } = projection;

      if (!supplierStatusMap.has(supplierId)) {
        supplierStatusMap.set(supplierId, {
          supplierId,
          supplierName,
          paid: 0,
          outstanding: 0,
          outstandingCount: 0,
          upcoming: 0,
          upcomingCount: 0,
        });
      }

      const status = supplierStatusMap.get(supplierId)!;

      if (projection.month <= monthEnd) {
        // Due (outstanding until matched with actual payment)
        status.outstanding += projection.amount;
        status.outstandingCount += 1;
      } else {
        // Not yet due (upcoming)
        status.upcoming += projection.amount;
        status.upcomingCount += 1;
      }
    }

    const supplierPaymentStatus = Array.from(supplierStatusMap.values())
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);

    return NextResponse.json({
      totalContracts,
      totalContractValue,
      currentMonthProjection,
      currentYearProjection,
      monthlyProjections,
      recentContracts: recentContracts.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        supplierName: c.supplier.name,
        contractValue: c.contractValue,
        contractStartDate: c.contractStartDate.toISOString(),
      })),
      supplierBreakdown: supplierBreakdownWithNames,
      paymentStatus: {
        totalProjectedToDate: projectedToDateAmount,
        totalActualReceived: actualReceivedAmount,
        percentageReceived,
      },
      supplierPaymentStatus,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
