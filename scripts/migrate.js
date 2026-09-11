const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting migration...');

  console.log('1. Dropping foreign keys from child tables...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE IF EXISTS member_educations 
        DROP CONSTRAINT IF EXISTS member_educations_member_no_fkey;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE IF EXISTS meeting_attendances 
        DROP CONSTRAINT IF EXISTS meeting_attendances_member_no_fkey;
  `);

  console.log('2. Altering member_no column type to VARCHAR(20) with LPAD 4 digits...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE members 
        ALTER COLUMN member_no TYPE VARCHAR(20) 
        USING LPAD(member_no::text, 4, '0');
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE member_educations 
        ALTER COLUMN member_no TYPE VARCHAR(20) 
        USING LPAD(member_no::text, 4, '0');
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE meeting_attendances 
        ALTER COLUMN member_no TYPE VARCHAR(20) 
        USING LPAD(member_no::text, 4, '0');
  `);

  console.log('3. Updating Primary Key on members to member_no...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE members 
        DROP CONSTRAINT IF EXISTS members_pkey CASCADE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE members 
        ADD CONSTRAINT members_pkey PRIMARY KEY (member_no);
  `);

  console.log('4. Creating sequence member_no_seq (START 1281)...');
  await prisma.$executeRawUnsafe(`
    CREATE SEQUENCE IF NOT EXISTS member_no_seq
        START WITH 1281
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
  `);

  console.log('5. Setting default for member_no...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE members 
        ALTER COLUMN member_no SET DEFAULT LPAD(nextval('member_no_seq')::text, 4, '0');
  `);

  console.log('6. Re-adding foreign key constraints...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE member_educations
        ADD CONSTRAINT member_educations_member_no_fkey 
        FOREIGN KEY (member_no) REFERENCES members(member_no) ON DELETE CASCADE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE meeting_attendances
        ADD CONSTRAINT meeting_attendances_member_no_fkey 
        FOREIGN KEY (member_no) REFERENCES members(member_no) ON DELETE CASCADE;
  `);

  console.log('✅ Migration executed successfully!');

  // Verify sample data
  const sample = await prisma.$queryRawUnsafe(`
    SELECT member_no, id, full_name_th FROM members ORDER BY member_no ASC LIMIT 3;
  `);
  console.log('Sample updated members:', sample);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
