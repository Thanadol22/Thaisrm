import { PrismaClient } from '@prisma/client';
import { generateReceiptNo, DEFAULT_RECEIPT_START_SEQ } from '../lib/receiptNumber';

const targetUrl = process.argv[2] || process.env.DATABASE_URL;

const prisma = targetUrl && targetUrl !== process.env.DATABASE_URL
  ? new PrismaClient({ datasources: { db: { url: targetUrl } } })
  : new PrismaClient();

async function main() {
  console.log('🔄 Checking existing receipts in DB...');
  const receipts = await (prisma as any).receipts.findMany({
    orderBy: { created_at: 'asc' }
  });

  console.log(`📋 Found ${receipts.length} receipts in database.`);

  const isTestAccount = (name?: string, email?: string) => {
    const n = (name || '').toLowerCase();
    const e = (email || '').toLowerCase();
    return n.includes('ทดสอบ') || n.includes('test') || e.includes('test');
  };

  let seq = DEFAULT_RECEIPT_START_SEQ; // 115
  let idSeq = 1;

  for (const r of receipts) {
    if (isTestAccount(r.payer_name)) {
      console.log(`🗑️ Deleting test receipt: ${r.receipt_no} - ${r.payer_name}`);
      await (prisma as any).receipts.delete({ where: { id: r.id } });
      continue;
    }

    const newReceiptNo = generateReceiptNo(r.receipt_date || r.created_at, seq);
    const newId = String(idSeq);
    console.log(`✨ Renumbering [${r.payer_name}]: ID ${r.id} -> ${newId} | No: ${r.receipt_no} -> ${newReceiptNo}`);

    if (r.id !== newId) {
      await (prisma as any).receipts.delete({ where: { id: r.id } });
      await (prisma as any).receipts.create({
        data: {
          ...r,
          id: newId,
          receipt_no: newReceiptNo,
        }
      });
    } else {
      await (prisma as any).receipts.update({
        where: { id: r.id },
        data: { receipt_no: newReceiptNo }
      });
    }
    seq++;
    idSeq++;
  }

  console.log('✅ Done updating all receipts to running ID (1, 2, ...) and Receipt No (2569/02-115, ...).');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
