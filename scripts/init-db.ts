import prisma from '../lib/prisma';

async function main() {
  console.log('Connecting to PostgreSQL database...');
  try {
    await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS code_seq START 1;`);
    await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS membership_no_seq START 1;`);
    console.log('✅ Sequences created/verified successfully.');

    // Verify sequences by running nextval preview
    const seqCheck = await prisma.$queryRaw<Array<{ code: string; membership_no: string }>>`
      SELECT 
        lpad(nextval('code_seq')::TEXT, 6, '0') AS code,
        lpad(nextval('membership_no_seq')::TEXT, 6, '0') AS membership_no
    `;

    console.log('✅ Next sequence test result:', seqCheck);
    console.log('🎉 Database connection & schema synchronization successful!');
  } catch (error) {
    console.error('❌ Error executing database init:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
