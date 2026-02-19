import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Fix dates where year < 100 (e.g., 0026 should be 2026)
export async function POST() {
  try {
    const contracts = await prisma.contract.findMany();
    let fixed = 0;

    for (const contract of contracts) {
      const updates: Record<string, Date> = {};

      const lockIn = new Date(contract.lockInDate);
      if (lockIn.getFullYear() < 100) {
        lockIn.setFullYear(lockIn.getFullYear() + 2000);
        updates.lockInDate = lockIn;
      }

      const csd = new Date(contract.contractStartDate);
      if (csd.getFullYear() < 100) {
        csd.setFullYear(csd.getFullYear() + 2000);
        updates.contractStartDate = csd;
      }

      const ced = new Date(contract.contractEndDate);
      if (ced.getFullYear() < 100) {
        ced.setFullYear(ced.getFullYear() + 2000);
        updates.contractEndDate = ced;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.contract.update({
          where: { id: contract.id },
          data: updates,
        });
        fixed++;
      }
    }

    return NextResponse.json({
      success: true,
      totalContracts: contracts.length,
      fixedContracts: fixed,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Show sample data for diagnosis
export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      take: 3,
      include: { supplier: true },
    });

    const results = contracts.map((contract) => ({
      id: contract.id,
      companyName: contract.companyName,
      contractValue: contract.contractValue,
      lockInYear: new Date(contract.lockInDate).getFullYear(),
      csdYear: new Date(contract.contractStartDate).getFullYear(),
      cedYear: new Date(contract.contractEndDate).getFullYear(),
    }));

    return NextResponse.json({
      totalContracts: await prisma.contract.count(),
      samples: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
