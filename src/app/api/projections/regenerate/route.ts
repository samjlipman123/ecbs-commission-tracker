import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth } from 'date-fns';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all contracts with their supplier info
    const contracts = await prisma.contract.findMany({
      include: { supplier: true },
    });

    // Delete all existing projections
    await prisma.paymentProjection.deleteMany({});

    let regenerated = 0;
    const errors: { contractId: string; companyName: string; error: string }[] = [];

    // Process each contract
    for (const contract of contracts) {
      try {
        const projections = calculatePaymentProjections({
          lockInDate: contract.lockInDate,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          contractValue: contract.contractValue,
          commsUR: contract.commsUR,
          supplierName: contract.supplier.name,
        });

        if (projections.length > 0) {
          await prisma.paymentProjection.createMany({
            data: projections.map((p) => ({
              contractId: contract.id,
              month: startOfMonth(p.month),
              amount: p.amount,
              paymentType: p.paymentType,
            })),
          });
        }

        regenerated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          contractId: contract.id,
          companyName: contract.companyName,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      regenerated,
      total: contracts.length,
      errors,
    });
  } catch (error) {
    console.error('Regenerate projections error:', error);
    return NextResponse.json({ error: 'Failed to regenerate projections' }, { status: 500 });
  }
}
