import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const payment = await prisma.actualPayment.findUnique({
      where: { id },
      include: {
        contract: {
          include: { supplier: true },
        },
        paymentProjection: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Actual payment fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
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

    const existingPayment = await prisma.actualPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const {
      contractId,
      paymentProjectionId,
      amount,
      dateReceived,
      referenceNumber,
      paymentType,
      notes,
    } = body;

    // Validate contract if changing
    if (contractId && contractId !== existingPayment.contractId) {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }
    }

    // If paymentProjectionId is being changed, validate it
    if (paymentProjectionId && paymentProjectionId !== existingPayment.paymentProjectionId) {
      const projection = await prisma.paymentProjection.findUnique({
        where: { id: paymentProjectionId },
      });

      if (!projection) {
        return NextResponse.json({ error: 'Payment projection not found' }, { status: 404 });
      }

      const targetContractId = contractId || existingPayment.contractId;
      if (projection.contractId !== targetContractId) {
        return NextResponse.json(
          { error: 'Payment projection does not belong to this contract' },
          { status: 400 }
        );
      }

      // Check if another payment is already linked to this projection
      const otherPayment = await prisma.actualPayment.findUnique({
        where: { paymentProjectionId },
      });

      if (otherPayment && otherPayment.id !== id) {
        return NextResponse.json(
          { error: 'This projection already has another actual payment linked' },
          { status: 400 }
        );
      }
    }

    // Update payment
    const payment = await prisma.actualPayment.update({
      where: { id },
      data: {
        ...(contractId && { contractId }),
        paymentProjectionId: paymentProjectionId === '' ? null : (paymentProjectionId || existingPayment.paymentProjectionId),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(dateReceived && { dateReceived: new Date(dateReceived) }),
        referenceNumber: referenceNumber !== undefined ? (referenceNumber || null) : existingPayment.referenceNumber,
        ...(paymentType && { paymentType }),
        notes: notes !== undefined ? (notes || null) : existingPayment.notes,
      },
      include: {
        contract: {
          include: { supplier: true },
        },
        paymentProjection: true,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Actual payment update error:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
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
    const existingPayment = await prisma.actualPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    await prisma.actualPayment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Actual payment delete error:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
