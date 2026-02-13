import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const contractId = searchParams.get('contractId') || '';
  const supplierId = searchParams.get('supplierId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const paymentType = searchParams.get('paymentType') || '';

  try {
    const where: Record<string, unknown> = {};

    if (contractId) {
      where.contractId = contractId;
    }

    if (supplierId) {
      where.contract = { supplierId };
    }

    if (startDate || endDate) {
      where.dateReceived = {};
      if (startDate) {
        (where.dateReceived as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.dateReceived as Record<string, Date>).lte = new Date(endDate);
      }
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    const [payments, total] = await Promise.all([
      prisma.actualPayment.findMany({
        where,
        include: {
          contract: {
            include: { supplier: true },
          },
          paymentProjection: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dateReceived: 'desc' },
      }),
      prisma.actualPayment.count({ where }),
    ]);

    // Calculate summary stats
    const summary = await prisma.actualPayment.aggregate({
      where,
      _sum: { amount: true },
    });

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: summary._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Actual payments fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch actual payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      contractId,
      paymentProjectionId,
      amount,
      dateReceived,
      referenceNumber,
      paymentType,
      notes,
    } = body;

    // Validate required fields
    if (!contractId || !amount || !dateReceived || !paymentType) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, amount, dateReceived, paymentType' },
        { status: 400 }
      );
    }

    // Validate contract exists
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // If paymentProjectionId provided, validate it belongs to the same contract
    if (paymentProjectionId) {
      const projection = await prisma.paymentProjection.findUnique({
        where: { id: paymentProjectionId },
      });

      if (!projection) {
        return NextResponse.json({ error: 'Payment projection not found' }, { status: 404 });
      }

      if (projection.contractId !== contractId) {
        return NextResponse.json(
          { error: 'Payment projection does not belong to this contract' },
          { status: 400 }
        );
      }

      // Check if projection already has an actual payment linked
      const existingPayment = await prisma.actualPayment.findUnique({
        where: { paymentProjectionId },
      });

      if (existingPayment) {
        return NextResponse.json(
          { error: 'This projection already has an actual payment linked' },
          { status: 400 }
        );
      }
    }

    // Create actual payment
    const payment = await prisma.actualPayment.create({
      data: {
        contractId,
        paymentProjectionId: paymentProjectionId || null,
        amount: parseFloat(amount),
        dateReceived: new Date(dateReceived),
        referenceNumber: referenceNumber || null,
        paymentType,
        notes: notes || null,
      },
      include: {
        contract: {
          include: { supplier: true },
        },
        paymentProjection: true,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Actual payment creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create actual payment', details: errorMessage }, { status: 500 });
  }
}
