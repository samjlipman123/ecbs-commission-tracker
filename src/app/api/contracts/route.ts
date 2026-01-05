import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const supplierId = searchParams.get('supplierId') || '';

  try {
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { meterNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: { supplier: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contract.count({ where }),
    ]);

    return NextResponse.json({
      contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Contracts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
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
      lockInDate,
      companyName,
      meterNumber,
      previousSupplier,
      energyType,
      supplierId,
      commsSC,
      commsUR,
      contractStartDate,
      contractEndDate,
      contractValue,
      notes,
    } = body;

    // Validate required fields
    if (!companyName || !supplierId || !contractStartDate || !contractEndDate || !contractValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get supplier info
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        lockInDate: new Date(lockInDate),
        companyName,
        meterNumber: meterNumber || null,
        previousSupplier: previousSupplier || null,
        energyType: energyType || 'Electric',
        supplierId,
        commsSC: parseFloat(commsSC) || 0,
        commsUR: parseFloat(commsUR) || 0,
        contractStartDate: new Date(contractStartDate),
        contractEndDate: new Date(contractEndDate),
        contractValue: parseFloat(contractValue) || 0,
        notes: notes || null,
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

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error('Contract creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create contract', details: errorMessage }, { status: 500 });
  }
}
