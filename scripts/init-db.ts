import prisma from '../lib/prisma';

async function main() {
  console.log('Connecting to PostgreSQL database...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE SEQUENCE IF NOT EXISTS member_no_seq
        START WITH 1281
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    `);
    console.log('✅ Sequence member_no_seq created/verified successfully.');

    // Verify sequence by running nextval preview
    const seqCheck = await prisma.$queryRaw<Array<{ next_member_no: string }>>`
      SELECT lpad(currval('member_no_seq')::TEXT, 4, '0') AS current_member_no
    `.catch(async () => {
      return await prisma.$queryRaw<Array<{ next_member_no: string }>>`
        SELECT lpad(last_value::TEXT, 4, '0') AS current_member_no FROM member_no_seq
      `;
    });

    console.log('✅ Sequence status:', seqCheck);
    console.log('🎉 Database connection & schema synchronization successful!');
  } catch (error) {
    console.error('❌ Error executing database init:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
