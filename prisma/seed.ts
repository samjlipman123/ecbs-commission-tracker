import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const suppliers = [
  // Airticity
  { name: 'Airticity Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Airticity Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // British Gas
  { name: 'British Gas Acquisition', paymentTerms: '70% on live (month after CSD), 30% reconciliation 2 months after CED' },
  { name: 'British Gas Renewal', paymentTerms: '70% on signature (month after lock-in), 30% reconciliation 2 months after CED' },
  // Brook Green
  { name: 'Brook Green Acquisition No Upfront', paymentTerms: '80% on live, 20% reconciliation. Anything over 1.5p/kWh paid monthly in arrears', upliftCap: 1.5 },
  { name: 'Brook Green Acquisition Upfront', paymentTerms: '80% on live, 20% reconciliation. Anything over 1.5p/kWh paid monthly in arrears', upliftCap: 1.5 },
  { name: 'Brook Green Renewal No Upfront', paymentTerms: '80% on live, 20% reconciliation. Anything over 1.5p/kWh paid monthly in arrears', upliftCap: 1.5 },
  { name: 'Brook Green Renewal Upfront', paymentTerms: '80% on live, 20% reconciliation. Anything over 1.5p/kWh paid monthly in arrears', upliftCap: 1.5 },
  // Corona
  { name: 'Corona Acquisition No Upfront', paymentTerms: '80% signature, 20% reconciliation 2 months after CED' },
  { name: 'Corona Acquisition Upfront', paymentTerms: '80% signature (18 months before CSD if >18 months out), 4p power/3p gas cap, >6yr in arrears. 20% reconciliation 2 months after CED' },
  { name: 'Corona Renewal No Upfront', paymentTerms: '80% signature, 20% reconciliation 2 months after CED' },
  { name: 'Corona Renewal Upfront', paymentTerms: '80% signature (18 months before CSD if >18 months out), 4p power/3p gas cap, >6yr in arrears. 20% reconciliation 2 months after CED' },
  // Crown Gas & Power
  { name: 'Crown Gas & Power Acquisition No Upfront', paymentTerms: '80% live up to 36 months, longer contracts reconciled at 36 months then remainder paid 80%' },
  { name: 'Crown Gas & Power Acquisition Upfront', paymentTerms: '80% live up to 36 months, longer contracts reconciled at 36 months then remainder paid 80%' },
  { name: 'Crown Gas & Power Renewal No Upfront', paymentTerms: '80% live up to 36 months, longer contracts reconciled at 36 months then remainder paid 80%' },
  { name: 'Crown Gas & Power Renewal Upfront', paymentTerms: '80% live up to 36 months, longer contracts reconciled at 36 months then remainder paid 80%' },
  // D-Energi
  { name: 'D-Energi Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'D-Energi Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Drax
  { name: 'Drax Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Drax Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Dyce Energy
  { name: 'Dyce Energy Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Dyce Energy Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Ecotricity
  { name: 'Ecotricity Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Ecotricity Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // EDF
  { name: 'EDF Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'EDF Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Engie
  { name: 'Engie Acquisition No Upfront', paymentTerms: 'Acquisition: 50% signature, 30% live, 20% 2 months after CED. If >2 years to CSD from lock-in, paid 80% live' },
  { name: 'Engie Acquisition Upfront', paymentTerms: 'Acquisition: 50% signature, 30% live, 20% 2 months after CED. If >2 years to CSD from lock-in, paid 80% live' },
  { name: 'Engie Renewal No Upfront', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Engie Renewal Upfront', paymentTerms: '80% on live, 20% 2 months after CED' },
  // EonNext
  { name: 'EonNext Acquisition', paymentTerms: '80% live (at CSD month), 20% 2 months after CED' },
  { name: 'EonNext Renewal', paymentTerms: '80% signature (1 month after lock-in), 20% 2 months after CED' },
  // Jellyfish
  { name: 'Jellyfish Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Jellyfish Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Npower
  { name: 'Npower Acquisition No Upfront', paymentTerms: '≤24 months to CSD: 80% at lock-in, 20% at CED. >24 months: 40-40-20' },
  { name: 'Npower Acquisition Upfront', paymentTerms: '≤24 months to CSD: 80% at lock-in, 20% at CED. >24 months: 40-40-20' },
  { name: 'Npower Renewal No Upfront', paymentTerms: '≤24 months to CSD: 80% at lock-in, 20% at CED. >24 months: 40-40-20' },
  { name: 'Npower Renewal Upfront', paymentTerms: '≤24 months to CSD: 80% at lock-in, 20% at CED. >24 months: 40-40-20' },
  // Pozitive Energy
  { name: 'Pozitive Energy Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Pozitive Energy Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Regent Gas
  { name: 'Regent Gas Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Regent Gas Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Scottish Power
  { name: 'Scottish Power Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Scottish Power Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Sefe
  { name: 'Sefe Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Sefe Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Shell Energy
  { name: 'Shell Energy Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Shell Energy Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Smartest Energy
  { name: 'Smartest Energy Acquisition', paymentTerms: '20% signature, 60% live (~15 days after), 20% 6 weeks after CED' },
  { name: 'Smartest Energy Renewal', paymentTerms: '20% signature, 60% live (~15 days after), 20% 6 weeks after CED' },
  // SSE
  { name: 'SSE Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'SSE Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // TEM-Energy
  { name: 'TEM-Energy Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'TEM-Energy Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Totalenergies
  { name: 'Totalenergies Acquisition No Upfront', paymentTerms: '≤12 months to CSD: 40% at lock-in, 40% at CSD, 20% at CED. >12 months: 40% at CSD-12mo, 40% at CSD, 20% at CED' },
  { name: 'Totalenergies Acquisition Upfront', paymentTerms: '≤12 months to CSD: 40% at lock-in, 40% at CSD, 20% at CED. >12 months: 40% at CSD-12mo, 40% at CSD, 20% at CED' },
  { name: 'Totalenergies Renewal No Upfront', paymentTerms: '80% at lock-in month, 20% at CED month' },
  { name: 'Totalenergies Renewal Upfront', paymentTerms: '80% at lock-in month, 20% at CED month' },
  // United Gas & Power
  { name: 'United Gas & Power Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'United Gas & Power Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Utilita
  { name: 'Utilita Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Utilita Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Valda Energy
  { name: 'Valda Energy Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Valda Energy Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Yorkshire Gas & Power
  { name: 'Yorkshire Gas & Power Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Yorkshire Gas & Power Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
  // Yu Energy
  { name: 'Yu Energy Acquisition', paymentTerms: '80% on live, 20% 2 months after CED' },
  { name: 'Yu Energy Renewal', paymentTerms: '80% on live, 20% 2 months after CED' },
];

async function main() {
  console.log('Seeding database...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('ecbs2024!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'sam.lipman@ecbs.co.uk' },
    update: {},
    create: {
      email: 'sam.lipman@ecbs.co.uk',
      name: 'Sam Lipman',
      password: hashedPassword,
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create James Bolam user
  const jamesUser = await prisma.user.upsert({
    where: { email: 'james.bolam@ecbs.co.uk' },
    update: {},
    create: {
      email: 'james.bolam@ecbs.co.uk',
      name: 'James Bolam',
      password: hashedPassword,
    },
  });

  console.log(`Created user: ${jamesUser.email}`);

  // Create suppliers
  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { name: supplier.name },
      update: {
        paymentTerms: supplier.paymentTerms,
        upliftCap: supplier.upliftCap || null,
      },
      create: {
        name: supplier.name,
        paymentTerms: supplier.paymentTerms,
        upliftCap: supplier.upliftCap || null,
      },
    });
  }

  console.log(`Created ${suppliers.length} suppliers`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
