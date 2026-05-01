import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
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

    // Export projections - dynamically calculated from contracts (same as dashboard)
    const contracts = await prisma.contract.findMany({
      include: { supplier: true },
    });

    const filterStart = startDate ? startOfMonth(parseISO(startDate)) : null;
    const filterEnd = endDate ? endOfMonth(parseISO(endDate)) : null;

    interface ProjectionRow {
      month: Date;
      companyName: string;
      supplierName: string;
      paymentType: string;
      amount: number;
      contractStartDate: Date;
      contractEndDate: Date;
      contractValue: number;
    }

    const allProjections: ProjectionRow[] = [];

    for (const contract of contracts) {
      const projections = calculatePaymentProjections({
        lockInDate: contract.lockInDate,
        contractStartDate: contract.contractStartDate,
        contractEndDate: contract.contractEndDate,
        contractValue: contract.contractValue,
        commsUR: contract.commsUR,
        supplierName: contract.supplier.name,
        energyType: contract.energyType,
        upliftCap: contract.supplier.upliftCap,
        upliftCapElectric: contract.supplier.upliftCapElectric,
        upliftCapGas: contract.supplier.upliftCapGas,
        paymentTermsJson: contract.supplier.paymentTerms,
        paymentTermsJsonElectric: contract.supplier.paymentTermsElectric,
        paymentTermsJsonGas: contract.supplier.paymentTermsGas,
      });

      for (const p of projections) {
        const projMonth = startOfMonth(p.month);

        // Apply date filter
        if (filterStart && projMonth < filterStart) continue;
        if (filterEnd && projMonth > filterEnd) continue;

        allProjections.push({
          month: projMonth,
          companyName: contract.companyName,
          supplierName: contract.supplier.name,
          paymentType: p.paymentType,
          amount: p.amount,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          contractValue: contract.contractValue,
        });
      }
    }

    // Sort by month, then company name
    allProjections.sort((a, b) => {
      const monthDiff = a.month.getTime() - b.month.getTime();
      if (monthDiff !== 0) return monthDiff;
      return a.companyName.localeCompare(b.companyName);
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

    const csvRows = allProjections.map((p) => [
      format(p.month, 'MMM yyyy'),
      p.companyName,
      p.supplierName,
      p.paymentType,
      p.amount.toFixed(2),
      format(p.contractStartDate, 'dd/MM/yyyy'),
      format(p.contractEndDate, 'dd/MM/yyyy'),
      p.contractValue.toFixed(2),
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
