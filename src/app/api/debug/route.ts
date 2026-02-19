import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth } from 'date-fns';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get first 3 contracts with all their data
    const contracts = await prisma.contract.findMany({
      take: 3,
      include: { supplier: true },
    });

    const results = contracts.map((contract) => {
      let projections: unknown[] = [];
      let error: string | null = null;

      try {
        projections = calculatePaymentProjections({
          lockInDate: contract.lockInDate,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          contractValue: contract.contractValue,
          commsUR: contract.commsUR,
          supplierName: contract.supplier.name,
        }).map((p) => ({
          month: startOfMonth(p.month).toISOString(),
          amount: p.amount,
          paymentType: p.paymentType,
        }));
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }

      return {
        id: contract.id,
        companyName: contract.companyName,
        supplierName: contract.supplier.name,
        contractValue: contract.contractValue,
        contractValueType: typeof contract.contractValue,
        commsUR: contract.commsUR,
        lockInDate: contract.lockInDate,
        contractStartDate: contract.contractStartDate,
        contractEndDate: contract.contractEndDate,
        projections,
        projectionCount: projections.length,
        error,
      };
    });

    return NextResponse.json({
      totalContracts: await prisma.contract.count(),
      sampleContracts: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
