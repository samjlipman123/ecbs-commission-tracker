import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth } from 'date-fns';
import type { ImportContract, ImportResponse, ImportError } from '@/types/import';

// Fix 2-digit years (e.g., year 26 → 2026)
function fixDate(dateInput: string | Date): Date {
  const date = new Date(dateInput);
  if (date.getFullYear() < 100) {
    date.setFullYear(date.getFullYear() + 2000);
  }
  return date;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contracts } = body as { contracts: ImportContract[] };

    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return NextResponse.json(
        { error: 'No contracts provided' },
        { status: 400 }
      );
    }

    // Pre-fetch all active suppliers for lookup
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
    });

    // Create lookup map (case-insensitive by supplier name)
    const supplierMap = new Map(
      suppliers.map((s) => [s.name.toLowerCase().trim(), s])
    );

    const errors: ImportError[] = [];
    const contractIds: string[] = [];
    let importedCount = 0;

    // Process contracts one by one to ensure proper error handling
    for (let i = 0; i < contracts.length; i++) {
      const importContract = contracts[i];
      const rowNumber = i + 1;

      try {
        // Find supplier by name
        const supplier = supplierMap.get(
          importContract.supplierName.toLowerCase().trim()
        );

        if (!supplier) {
          errors.push({
            rowNumber,
            error: `Supplier "${importContract.supplierName}" not found`,
          });
          continue;
        }

        // Validate required fields
        if (
          !importContract.companyName ||
          !importContract.contractStartDate ||
          !importContract.contractEndDate ||
          !importContract.contractValue
        ) {
          errors.push({
            rowNumber,
            error: 'Missing required fields',
          });
          continue;
        }

        // Create contract
        const contract = await prisma.contract.create({
          data: {
            lockInDate: fixDate(importContract.lockInDate),
            companyName: importContract.companyName,
            meterNumber: importContract.meterNumber || null,
            previousSupplier: importContract.previousSupplier || null,
            energyType: importContract.energyType || 'Electric',
            supplierId: supplier.id,
            commsSC: importContract.commsSC || 0,
            commsUR: importContract.commsUR || 0,
            contractStartDate: fixDate(importContract.contractStartDate),
            contractEndDate: fixDate(importContract.contractEndDate),
            contractValue: importContract.contractValue || 0,
            notes: null,
          },
          include: { supplier: true },
        });

        // Calculate payment projections
        const projections = calculatePaymentProjections({
          lockInDate: contract.lockInDate,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          contractValue: contract.contractValue,
          commsUR: contract.commsUR,
          supplierName: supplier.name,
        });

        // Store projections
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

        contractIds.push(contract.id);
        importedCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          rowNumber,
          error: `Failed to import: ${errorMessage}`,
        });
      }
    }

    const response: ImportResponse = {
      success: importedCount > 0,
      imported: importedCount,
      failed: errors.length,
      errors,
      contractIds,
    };

    return NextResponse.json(response, {
      status: importedCount > 0 ? 201 : 400,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Bulk import failed', details: errorMessage },
      { status: 500 }
    );
  }
}
