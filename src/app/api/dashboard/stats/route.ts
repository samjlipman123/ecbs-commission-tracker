import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
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

    // Get current month's projection
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const currentMonthProjections = await prisma.paymentProjection.aggregate({
      where: {
        month: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: { amount: true },
    });
    const currentMonthProjection = currentMonthProjections._sum.amount || 0;

    // Get current year's projection
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    const currentYearProjections = await prisma.paymentProjection.aggregate({
      where: {
        month: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      _sum: { amount: true },
    });
    const currentYearProjection = currentYearProjections._sum.amount || 0;

    // Get next 12 months projections
    const monthlyProjections = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(monthStart, i);
      const monthStartDate = startOfMonth(monthDate);
      const monthEndDate = endOfMonth(monthDate);

      const projection = await prisma.paymentProjection.aggregate({
        where: {
          month: {
            gte: monthStartDate,
            lte: monthEndDate,
          },
        },
        _sum: { amount: true },
      });

      monthlyProjections.push({
        month: format(monthDate, 'MMM yy'),
        amount: projection._sum.amount || 0,
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

    // Fetch supplier names
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

    // Get total projected payments up to current month (what should have been received)
    const totalProjectedToDate = await prisma.paymentProjection.aggregate({
      where: {
        month: {
          lte: monthEnd,
        },
      },
      _sum: { amount: true },
    });

    // Get total actual payments received
    const totalActualReceived = await prisma.actualPayment.aggregate({
      _sum: { amount: true },
    });

    const projectedToDateAmount = totalProjectedToDate._sum.amount || 0;
    const actualReceivedAmount = totalActualReceived._sum.amount || 0;
    const percentageReceived = projectedToDateAmount > 0
      ? Math.round((actualReceivedAmount / projectedToDateAmount) * 100)
      : 0;

    // Get supplier payment status
    // First, get all projections grouped by supplier
    const projectionsWithSupplier = await prisma.paymentProjection.findMany({
      include: {
        contract: {
          include: { supplier: true },
        },
        actualPayment: true,
      },
    });

    // Group by supplier and calculate paid/outstanding/upcoming
    const supplierStatusMap = new Map<string, {
      supplierId: string;
      supplierName: string;
      paid: number;
      outstanding: number;
      outstandingCount: number;
      upcoming: number;
      upcomingCount: number;
    }>();

    for (const projection of projectionsWithSupplier) {
      const supplierId = projection.contract.supplierId;
      const supplierName = projection.contract.supplier.name;

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
      const projectionMonth = new Date(projection.month);

      if (projection.actualPayment) {
        // Has an actual payment linked
        status.paid += projection.actualPayment.amount;
      } else if (projectionMonth <= monthEnd) {
        // Due but not paid (outstanding)
        status.outstanding += projection.amount;
        status.outstandingCount += 1;
      } else {
        // Not yet due (upcoming)
        status.upcoming += projection.amount;
        status.upcomingCount += 1;
      }
    }

    // Convert map to array and sort by outstanding (needs chasing) first
    const supplierPaymentStatus = Array.from(supplierStatusMap.values())
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10); // Top 10 suppliers

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
      // Payment status data
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
