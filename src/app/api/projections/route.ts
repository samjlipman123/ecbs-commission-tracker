import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfMonth, endOfMonth, parseISO, format, eachMonthOfInterval } from 'date-fns';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') || 'month'; // month, supplier, company

  try {
    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      where.month = {
        gte: startOfMonth(parseISO(startDate)),
        lte: endOfMonth(parseISO(endDate)),
      };
    }

    if (groupBy === 'month') {
      // Get projections grouped by month
      const projections = await prisma.paymentProjection.groupBy({
        by: ['month'],
        where,
        _sum: { amount: true },
        orderBy: { month: 'asc' },
      });

      // Fill in missing months with zero
      if (startDate && endDate) {
        const months = eachMonthOfInterval({
          start: parseISO(startDate),
          end: parseISO(endDate),
        });

        const projectionMap = new Map(
          projections.map((p) => [format(p.month, 'yyyy-MM'), p._sum.amount || 0])
        );

        const filledProjections = months.map((month) => ({
          month: format(month, 'MMM yyyy'),
          monthKey: format(month, 'yyyy-MM'),
          amount: projectionMap.get(format(month, 'yyyy-MM')) || 0,
        }));

        return NextResponse.json(filledProjections);
      }

      return NextResponse.json(
        projections.map((p) => ({
          month: format(p.month, 'MMM yyyy'),
          monthKey: format(p.month, 'yyyy-MM'),
          amount: p._sum.amount || 0,
        }))
      );
    }

    if (groupBy === 'supplier') {
      // Get projections with contract and supplier info
      const projections = await prisma.paymentProjection.findMany({
        where,
        include: {
          contract: {
            include: { supplier: true },
          },
        },
      });

      // Group by supplier
      const supplierTotals = new Map<string, { name: string; amount: number }>();

      for (const p of projections) {
        const supplierName = p.contract.supplier.name;
        const current = supplierTotals.get(supplierName) || { name: supplierName, amount: 0 };
        current.amount += p.amount;
        supplierTotals.set(supplierName, current);
      }

      return NextResponse.json(
        Array.from(supplierTotals.values()).sort((a, b) => b.amount - a.amount)
      );
    }

    if (groupBy === 'company') {
      // Get projections with contract info
      const projections = await prisma.paymentProjection.findMany({
        where,
        include: {
          contract: true,
        },
      });

      // Group by company
      const companyTotals = new Map<string, { name: string; amount: number }>();

      for (const p of projections) {
        const companyName = p.contract.companyName;
        const current = companyTotals.get(companyName) || { name: companyName, amount: 0 };
        current.amount += p.amount;
        companyTotals.set(companyName, current);
      }

      return NextResponse.json(
        Array.from(companyTotals.values()).sort((a, b) => b.amount - a.amount)
      );
    }

    // Detailed projections
    const projections = await prisma.paymentProjection.findMany({
      where,
      include: {
        contract: {
          include: { supplier: true },
        },
      },
      orderBy: { month: 'asc' },
    });

    return NextResponse.json(
      projections.map((p) => ({
        id: p.id,
        month: format(p.month, 'MMM yyyy'),
        monthKey: format(p.month, 'yyyy-MM'),
        amount: p.amount,
        paymentType: p.paymentType,
        companyName: p.contract.companyName,
        supplierName: p.contract.supplier.name,
        contractId: p.contractId,
      }))
    );
  } catch (error) {
    console.error('Projections fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 });
  }
}
