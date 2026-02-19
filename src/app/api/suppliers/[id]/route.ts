import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Supplier fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, paymentTerms, upliftCap, isActive } = body;

    // Check if supplier exists
    const existing = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Check for name conflict if name is being changed
    if (name && name !== existing.name) {
      const nameConflict = await prisma.supplier.findUnique({
        where: { name },
      });
      if (nameConflict) {
        return NextResponse.json({ error: 'A supplier with this name already exists' }, { status: 400 });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(upliftCap !== undefined && { upliftCap }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Cascade: recalculate projections for all contracts using this supplier
    const contracts = await prisma.contract.findMany({
      where: { supplierId: id },
    });

    let recalculated = 0;
    for (const contract of contracts) {
      try {
        await prisma.paymentProjection.deleteMany({
          where: { contractId: contract.id },
        });

        const projections = calculatePaymentProjections({
          lockInDate: contract.lockInDate,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          contractValue: contract.contractValue,
          commsUR: contract.commsUR,
          supplierName: supplier.name,
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

        recalculated++;
      } catch (error) {
        console.error(`Failed to recalculate projections for contract ${contract.id}:`, error);
      }
    }

    return NextResponse.json({ ...supplier, contractsRecalculated: recalculated });
  } catch (error) {
    console.error('Supplier update error:', error);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if supplier has any contracts
    const contractCount = await prisma.contract.count({
      where: { supplierId: id },
    });

    if (contractCount > 0) {
      // Soft delete - just mark as inactive
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: 'Supplier marked as inactive (has existing contracts)',
        contractCount
      });
    }

    // Hard delete if no contracts
    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Supplier delete error:', error);
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}
