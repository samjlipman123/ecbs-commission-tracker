import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const exportType = searchParams.get('type') || 'projections'; // projections or contracts

  try {
    if (exportType === 'contracts') {
      // Export contracts
      const contracts = await prisma.contract.findMany({
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      });

      const csvHeaders = [
        'Lock In Date',
        'Company Name',
        'Meter Number',
        'Previous Supplier',
        'Energy Type',
        'Supplier',
        'Commission SC',
        'Commission UR',
        'Contract Start Date',
        'Contract End Date',
        'Contract Value',
        'Notes',
      ];

      const csvRows = contracts.map((c) => [
        format(c.lockInDate, 'dd/MM/yyyy'),
        c.companyName,
        c.meterNumber || '',
        c.previousSupplier || '',
        c.energyType,
        c.supplier.name,
        c.commsSC.toFixed(2),
        c.commsUR.toFixed(2),
        format(c.contractStartDate, 'dd/MM/yyyy'),
        format(c.contractEndDate, 'dd/MM/yyyy'),
        c.contractValue.toFixed(2),
        c.notes || '',
      ]);

      const csv = [csvHeaders, ...csvRows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="contracts-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
        },
      });
    }

    // Export projections
    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      where.month = {
        gte: startOfMonth(parseISO(startDate)),
        lte: endOfMonth(parseISO(endDate)),
      };
    }

    const projections = await prisma.paymentProjection.findMany({
      where,
      include: {
        contract: {
          include: { supplier: true },
        },
      },
      orderBy: { month: 'asc' },
    });

    const csvHeaders = [
      'Month',
      'Company Name',
      'Supplier',
      'Payment Type',
      'Amount',
      'Contract Start Date',
      'Contract End Date',
      'Contract Value',
    ];

    const csvRows = projections.map((p) => [
      format(p.month, 'MMM yyyy'),
      p.contract.companyName,
      p.contract.supplier.name,
      p.paymentType,
      p.amount.toFixed(2),
      format(p.contract.contractStartDate, 'dd/MM/yyyy'),
      format(p.contract.contractEndDate, 'dd/MM/yyyy'),
      p.contract.contractValue.toFixed(2),
    ]);

    const csv = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const dateRange = startDate && endDate
      ? `${format(parseISO(startDate), 'yyyy-MM')}-to-${format(parseISO(endDate), 'yyyy-MM')}`
      : 'all';

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="projections-${dateRange}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
