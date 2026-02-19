import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get first 3 contracts with all their data
    const contracts = await prisma.contract.findMany({
      take: 3,
      include: { supplier: true },
    });

    const results = contracts.map((contract) => {
      let projections: unknown[] = [];
      let calcError: string | null = null;

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
        calcError = e instanceof Error ? e.stack || e.message : String(e);
      }

      return {
        id: contract.id,
        companyName: contract.companyName,
        supplierName: contract.supplier.name,
        contractValue: contract.contractValue,
        contractValueType: typeof contract.contractValue,
        commsUR: contract.commsUR,
        lockInDate: String(contract.lockInDate),
        lockInDateType: typeof contract.lockInDate,
        contractStartDate: String(contract.contractStartDate),
        contractEndDate: String(contract.contractEndDate),
        projections,
        projectionCount: projections.length,
        calcError,
      };
    });

    return NextResponse.json({
      totalContracts: await prisma.contract.count(),
      contractsFetched: contracts.length,
      sampleContracts: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.stack || error.message : String(error);
    return NextResponse.json({ topLevelError: msg }, { status: 500 });
  }
}
