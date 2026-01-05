import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculatePaymentProjections } from '@/lib/payment-calculator';
import { startOfMonth, addMonths, addYears } from 'date-fns';

// Company name prefixes for generating realistic names
const companyPrefixes = [
  'Acme', 'Global', 'Premier', 'Elite', 'Summit', 'Apex', 'Prime', 'Excel',
  'Metro', 'Central', 'Pacific', 'Atlantic', 'Northern', 'Southern', 'Eastern',
  'Western', 'United', 'First', 'National', 'Royal', 'Crown', 'Diamond', 'Golden',
  'Silver', 'Crystal', 'Emerald', 'Phoenix', 'Eagle', 'Lion', 'Tiger'
];

const companySuffixes = [
  'Industries', 'Manufacturing', 'Services', 'Solutions', 'Group', 'Holdings',
  'Enterprises', 'Corporation', 'Ltd', 'Partners', 'Associates', 'Trading',
  'Logistics', 'Properties', 'Developments', 'Systems', 'Technologies', 'Foods',
  'Retail', 'Wholesale', 'Distribution', 'Construction', 'Engineering', 'Consulting'
];

function generateCompanyName(index: number): string {
  const prefix = companyPrefixes[index % companyPrefixes.length];
  const suffix = companySuffixes[Math.floor(index / companyPrefixes.length) % companySuffixes.length];
  return `${prefix} ${suffix}`;
}

function generateMeterNumber(): string {
  const prefix = Math.random() > 0.5 ? 'S' : 'M';
  const numbers = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${prefix}${numbers}`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    // Check if contracts already exist
    const existingCount = await prisma.contract.count();
    if (existingCount >= 50 && !force) {
      return NextResponse.json({
        message: 'Mock contracts already exist. Add ?force=true to regenerate.',
        count: existingCount
      });
    }

    // If forcing, delete existing contracts and projections
    if (force && existingCount > 0) {
      await prisma.paymentProjection.deleteMany({});
      await prisma.contract.deleteMany({});
    }

    // Get all suppliers
    const suppliers = await prisma.supplier.findMany();
    if (suppliers.length === 0) {
      return NextResponse.json({ error: 'No suppliers found. Run /api/setup first.' }, { status: 400 });
    }

    const today = new Date();
    const contractsToCreate = [];

    // Prepare all contract data first
    for (let i = 0; i < 50; i++) {
      const supplier = suppliers[i % suppliers.length];

      const lockInDate = randomDate(
        addMonths(today, -6),
        addMonths(today, -2)
      );

      const contractStartDate = randomDate(
        addMonths(lockInDate, 1),
        addMonths(lockInDate, 6)
      );

      const contractYears = Math.floor(Math.random() * 5) + 1;
      const contractEndDate = addYears(contractStartDate, contractYears);
      const energyType = Math.random() > 0.4 ? 'Electric' : 'Gas';
      const commsUR = randomFloat(0.5, 3.5);
      const commsSC = Math.random() > 0.7 ? randomFloat(0.1, 1.0) : 0;
      const baseValue = randomFloat(500, 15000);
      const contractValue = baseValue * contractYears;
      const previousSupplier = Math.random() > 0.5
        ? suppliers[Math.floor(Math.random() * suppliers.length)].name
        : null;

      contractsToCreate.push({
        lockInDate,
        companyName: generateCompanyName(i),
        meterNumber: generateMeterNumber(),
        previousSupplier,
        energyType,
        supplierId: supplier.id,
        commsSC,
        commsUR,
        contractStartDate,
        contractEndDate,
        contractValue,
        notes: i % 5 === 0 ? 'Priority customer' : null,
        supplierName: supplier.name, // Store for projection calculation
      });
    }

    // Create contracts one by one to avoid transaction limits
    const createdContracts = [];
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

    for (const { supplierName, ...contractData } of contractsToCreate) {
      const contract = await prisma.contract.create({
        data: contractData,
      });
      createdContracts.push({
        ...contract,
        supplierName: supplierMap.get(contract.supplierId) || supplierName,
      });
    }

    // Calculate and create all projections
    const allProjections: {
      contractId: string;
      month: Date;
      amount: number;
      paymentType: string;
    }[] = [];

    for (const contract of createdContracts) {
      const projections = calculatePaymentProjections({
        lockInDate: contract.lockInDate,
        contractStartDate: contract.contractStartDate,
        contractEndDate: contract.contractEndDate,
        contractValue: contract.contractValue,
        commsUR: contract.commsUR,
        supplierName: contract.supplierName,
      });

      for (const p of projections) {
        allProjections.push({
          contractId: contract.id,
          month: startOfMonth(p.month),
          amount: p.amount,
          paymentType: p.paymentType,
        });
      }
    }

    // Batch create all projections with skipDuplicates to handle any potential conflicts
    if (allProjections.length > 0) {
      await prisma.paymentProjection.createMany({
        data: allProjections,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      message: 'Successfully created 50 mock contracts',
      contracts: createdContracts.slice(0, 10).map(c => ({
        id: c.id,
        companyName: c.companyName,
        supplier: c.supplierName,
        contractValue: c.contractValue,
      })),
      totalCreated: createdContracts.length,
      projectionsCreated: allProjections.length,
    });
  } catch (error) {
    console.error('Seed contracts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to seed contracts', details: errorMessage }, { status: 500 });
  }
}
