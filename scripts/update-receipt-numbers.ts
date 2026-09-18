import prisma from '../lib/prisma';
import { generateReceiptNo } from '../lib/receiptNumber';

async function main() {
  console.log('Checking existing receipts in DB...');
  const receipts = await (prisma as any).receipts.findMany({
    orderBy: { created_at: 'asc' }
  });

  console.log(`Found ${receipts.length} receipts.`);

  const isTestAccount = (name?: string, email?: string) => {
    const n = (name || '').toLowerCase();
    const e = (email || '').toLowerCase();
    return n.includes('ทดสอบ') || n.includes('test') || e.includes('test');
  };

  let seq = 115;
  for (const r of receipts) {
    if (isTestAccount(r.payer_name)) {
      console.log(`Skipping / deleting test receipt: ${r.receipt_no} - ${r.payer_name}`);
      await (prisma as any).receipts.delete({ where: { id: r.id } });
      continue;
    }

    const newReceiptNo = generateReceiptNo(r.receipt_date || r.created_at, seq);
    console.log(`Updating ${r.id} (${r.payer_name}): ${r.receipt_no} -> ${newReceiptNo}`);
    await (prisma as any).receipts.update({
      where: { id: r.id },
      data: { receipt_no: newReceiptNo }
    });
    seq++;
  }

  console.log('Done updating receipts.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
