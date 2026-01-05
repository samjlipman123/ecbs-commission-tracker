import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const suppliers = [
  { name: 'British Gas', paymentTerms: '70% on live (month after CSD), 30% reconciliation 2 months after CED' },
  { name: 'British Gas Renewals', paymentTerms: '70% on signature (month after lock-in), 30% reconciliation 2 months after CED' },
  { name: 'British Gas Lite', paymentTerms: '70% on live (month after CSD), 30% reconciliation 2 months after CED' },
  { name: 'Brook Green Supply', paymentTerms: '80% on live, 20% reconciliation. Anything over 1.5p/kWh paid monthly in arrears', upliftCap: 1.5 },
  { name: 'Corona Upfront', paymentTerms: '80% signature (18 months before CSD if >18 months out), 4p power/3p gas cap, >6yr in arrears. 20% reconciliation 2 months after CED' },
  { name: 'Corona', paymentTerms: '80% signature, 20% reconciliation 2 months after CED' },
  { name: 'Crown Gas & Power Upfront', paymentTerms: '80% live up to 36 months, longer contracts reconciled at 36 months then remainder paid 80%' },
  { name: 'Crown Gas & Power', paymentTerms: '80% live up to 36 months, longer contracts reconciled at 36 months then remainder paid 80%' },
  { name: 'D-Energi', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Drax', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Dyce Energy', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Ecotricity', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'EDF', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Engie Upfront', paymentTerms: 'Acquisition: 50% signature, 30% live, 20% 2 months after CED. If >2 years to CSD from lock-in, paid 80% live' },
  { name: 'Engie', paymentTerms: 'Acquisition: 50% signature, 30% live, 20% 2 months after CED. If >2 years to CSD from lock-in, paid 80% live' },
  { name: 'Engie Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'EonNext', paymentTerms: '80% signature, 20% 2 months after CED' },
  { name: 'Eon Next', paymentTerms: '80% signature, 20% 2 months after CED' },
  { name: 'EonNext Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Eon Next Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Jellyfish', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'nPower Upfront', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'nPower', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Pozitive Energy', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'SEFE Energy', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Smartest Energy', paymentTerms: '80% signature up to 2 years CSD, 2-4 years is 40-40-20' },
  { name: 'SSE', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'TEM-Energy', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'TotalEnergies', paymentTerms: '20% signature, 60% live (~15 days after), 20% 6 weeks after CED' },
  { name: 'Total Energies', paymentTerms: '20% signature, 60% live (~15 days after), 20% 6 weeks after CED' },
  { name: 'Total Energies Upfront', paymentTerms: '20% signature, 60% live (~15 days after), 20% 6 weeks after CED' },
  { name: 'Total Energies Renewal', paymentTerms: '80% signature 12 months before CSD if exceeding at lock-in' },
  { name: 'Utilita', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Yorkshire Gas & Power', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Yu Energy', paymentTerms: '80% on live, 20% 2 months after CED' },
];

export async function GET() {
  try {
    // Check if already seeded
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      return NextResponse.json({
        message: 'Database already seeded',
        status: 'already_seeded'
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('ecbs2024!', 10);
    const user = await prisma.user.create({
      data: {
        email: 'sam.lipman@ecbs.co.uk',
        name: 'Sam Lipman',
        password: hashedPassword,
      },
    });

    // Create suppliers
    for (const supplier of suppliers) {
      await prisma.supplier.create({
        data: {
          name: supplier.name,
          paymentTerms: supplier.paymentTerms,
          upliftCap: supplier.upliftCap || null,
        },
      });
    }

    return NextResponse.json({
      message: 'Database seeded successfully!',
      status: 'success',
      user: user.email,
      suppliersCreated: suppliers.length
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
