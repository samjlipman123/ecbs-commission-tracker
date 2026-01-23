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

  const { id } = await params;

  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        supplier: true,
        paymentProjections: {
          orderBy: { month: 'asc' },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Contract fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
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

  const { id } = await params;

  try {
    const body = await request.json();

    const existingContract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Get supplier info
    const supplier = await prisma.supplier.findUnique({
      where: { id: body.supplierId },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Update contract
    const contract = await prisma.contract.update({
      where: { id },
      data: {
        lockInDate: new Date(body.lockInDate),
        companyName: body.companyName,
        meterNumber: body.meterNumber,
        previousSupplier: body.previousSupplier,
        energyType: body.energyType,
        supplierId: body.supplierId,
        commsSC: parseFloat(body.commsSC) || 0,
        commsUR: parseFloat(body.commsUR),
        contractStartDate: new Date(body.contractStartDate),
        contractEndDate: new Date(body.contractEndDate),
        contractValue: parseFloat(body.contractValue),
        notes: body.notes,
      },
      include: { supplier: true },
    });

    // Delete existing projections
    await prisma.paymentProjection.deleteMany({
      where: { contractId: id },
    });

    // Recalculate payment projections
    const projections = calculatePaymentProjections({
      lockInDate: contract.lockInDate,
      contractStartDate: contract.contractStartDate,
      contractEndDate: contract.contractEndDate,
      contractValue: contract.contractValue,
      commsUR: contract.commsUR,
      supplierName: supplier.name,
    });

    // Store new projections
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

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Contract update error:', error);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
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

  const { id } = await params;

  try {
    // Delete projections first (cascade should handle this, but being explicit)
    await prisma.paymentProjection.deleteMany({
      where: { contractId: id },
    });

    // Delete contract
    await prisma.contract.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contract delete error:', error);
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
}
