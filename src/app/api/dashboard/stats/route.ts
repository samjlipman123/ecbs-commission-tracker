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
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
