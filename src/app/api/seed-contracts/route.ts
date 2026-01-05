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

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if contracts already exist
    const existingCount = await prisma.contract.count();
    if (existingCount >= 50) {
      return NextResponse.json({
        message: 'Mock contracts already exist',
        count: existingCount
      });
    }

    // Get all suppliers
    const suppliers = await prisma.supplier.findMany();
    if (suppliers.length === 0) {
      return NextResponse.json({ error: 'No suppliers found. Run /api/setup first.' }, { status: 400 });
    }

    const contracts = [];
    const today = new Date();

    for (let i = 0; i < 50; i++) {
      // Distribute contracts across all suppliers
      const supplier = suppliers[i % suppliers.length];

      // Generate dates
      // Lock-in date: between 6 months ago and 2 months ago
      const lockInDate = randomDate(
        addMonths(today, -6),
        addMonths(today, -2)
      );

      // Contract start date: 1-6 months after lock-in
      const contractStartDate = randomDate(
        addMonths(lockInDate, 1),
        addMonths(lockInDate, 6)
      );

      // Contract end date: 1-5 years after start
      const contractYears = Math.floor(Math.random() * 5) + 1;
      const contractEndDate = addYears(contractStartDate, contractYears);

      // Energy type: roughly 60% electric, 40% gas
      const energyType = Math.random() > 0.4 ? 'Electric' : 'Gas';

      // Commission values
      const commsUR = randomFloat(0.5, 3.5); // 0.5p to 3.5p per kWh
      const commsSC = Math.random() > 0.7 ? randomFloat(0.1, 1.0) : 0; // 30% chance of standing charge commission

      // Contract value based on commission rate and contract length
      const baseValue = randomFloat(500, 15000);
      const contractValue = baseValue * contractYears;

      // Previous supplier (50% chance of having one)
      const previousSupplier = Math.random() > 0.5
        ? suppliers[Math.floor(Math.random() * suppliers.length)].name
        : null;

      // Create contract
      const contract = await prisma.contract.create({
        data: {
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
        },
        include: { supplier: true },
      });

      // Calculate and store payment projections
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

      contracts.push({
        id: contract.id,
        companyName: contract.companyName,
        supplier: supplier.name,
        contractValue: contract.contractValue,
      });
    }

    return NextResponse.json({
      message: 'Successfully created 50 mock contracts',
      contracts: contracts.slice(0, 10), // Return first 10 as sample
      totalCreated: contracts.length,
    });
  } catch (error) {
    console.error('Seed contracts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to seed contracts', details: errorMessage }, { status: 500 });
  }
}
