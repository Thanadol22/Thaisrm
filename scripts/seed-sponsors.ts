import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SponsorSeedData {
  name: string;
  tier: 'Platinum' | 'Gold' | 'Silver';
  contactEmail: string;
  contactName?: string;
  initialQuota?: number;
}

const SPONSORS_LIST: SponsorSeedData[] = [
  // Platinum
  {
    name: 'LG Chem',
    tier: 'Platinum',
    contactEmail: 'natsuree@lgchem.com',
    initialQuota: 20,
  },
  // Gold
  {
    name: 'Merck',
    tier: 'Gold',
    contactEmail: 'pornpun.mongkonsawat@merckgroup.com',
    initialQuota: 8,
  },
  {
    name: 'Ferring',
    tier: 'Gold',
    contactEmail: 'pawt@ferring.com',
    initialQuota: 8,
  },
  {
    name: 'DHA MAMA',
    tier: 'Gold',
    contactEmail: 'maydhamama@gmail.com',
    initialQuota: 8,
  },
  {
    name: 'A.P.Tec',
    tier: 'Gold',
    contactEmail: 'artima@aptecthailand.com',
    initialQuota: 8,
  },
  {
    name: 'Organon',
    tier: 'Gold',
    contactEmail: 'Jutanun.jirawongpaisan@organon.com',
    initialQuota: 8,
  },
  {
    name: 'Abbott',
    tier: 'Gold',
    contactEmail: 'chayaporn.hangnalen@abbott.com',
    initialQuota: 8,
  },
  // Silver
  {
    name: 'IVF Envimed',
    tier: 'Silver',
    contactEmail: 'krongkarn_ivf@envimed.co.th',
    initialQuota: 0,
  },
  {
    name: 'Bangkok Cytogenetics Center',
    tier: 'Silver',
    contactEmail: 'contact@bcc-lab.com',
    initialQuota: 0,
  },
  {
    name: 'Thipthai',
    tier: 'Silver',
    contactEmail: 'admin@thipthai.com',
    initialQuota: 0,
  },
  {
    name: 'Hollywood',
    tier: 'Silver',
    contactEmail: 'nuchcha.sid@gmail.com',
    initialQuota: 0,
  },
  {
    name: 'Labivf',
    tier: 'Silver',
    contactEmail: 'sales.th@labivf.com',
    initialQuota: 0,
  },
  {
    name: 'So Great Con',
    tier: 'Silver',
    contactEmail: 'contact@sogreatcon.com',
    initialQuota: 0,
  },
  {
    name: 'Punshine',
    tier: 'Silver',
    contactEmail: 'info@punshine.com',
    initialQuota: 0,
  },
  {
    name: 'ATGenes',
    tier: 'Silver',
    contactEmail: 'sales001@atgenes.com',
    initialQuota: 0,
  },
  {
    name: 'AI THAI',
    tier: 'Silver',
    contactEmail: 'Aithai.service@gmail.com',
    initialQuota: 0,
  },
  {
    name: 'KateMED group',
    tier: 'Silver',
    contactEmail: 'admin@katemedgroup.com',
    initialQuota: 0,
  },
  {
    name: 'POF Eternity',
    tier: 'Silver',
    contactEmail: 'purchase@pofeternity.com',
    initialQuota: 0,
  },
  {
    name: 'GENEA (DKSH)',
    tier: 'Silver',
    contactEmail: 'rujapa.a@dksh.com',
    initialQuota: 0,
  },
  {
    name: 'Kriengyut Engineering',
    tier: 'Silver',
    contactEmail: 'contact@kriengyut.com',
    initialQuota: 0,
  },
  {
    name: 'Exeltis',
    tier: 'Silver',
    contactEmail: 'sadudee.b@exeltis.com',
    initialQuota: 0,
  },
  {
    name: 'Novatec',
    tier: 'Silver',
    contactEmail: 'Kantamass@novatec.co.th',
    initialQuota: 0,
  },
  {
    name: 'Bangkok Genomics Innovation PCL',
    tier: 'Silver',
    contactEmail: 'cs@bangkokgenomics.com',
    initialQuota: 0,
  },
  {
    name: 'Geneplus',
    tier: 'Silver',
    contactEmail: 'Kanjana@gene-plus.com',
    initialQuota: 0,
  },
  {
    name: 'Mega we care',
    tier: 'Silver',
    contactEmail: 'contact@megawecare.com',
    initialQuota: 0,
  },
  {
    name: 'Science Innovative Products',
    tier: 'Silver',
    contactEmail: 'contact@sip.com',
    initialQuota: 0,
  },
];

async function main() {
  console.log('--- Starting Seed Sponsors ---');

  // ดึงรายการ meetings ทั้งหมด
  const meetings = await prisma.meetings.findMany({
    orderBy: { meeting_date: 'desc' },
  });

  const latestMeeting = meetings[0];
  console.log(`Found ${meetings.length} meetings. Latest meeting: ${latestMeeting?.meeting_name || 'None'}`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of SPONSORS_LIST) {
    // 1. ค้นหาหรือสร้าง sponsor
    let sponsor = await (prisma as any).sponsors.findFirst({
      where: {
        OR: [
          { name: { equals: item.name, mode: 'insensitive' } },
          { contact_email: { equals: item.contactEmail, mode: 'insensitive' } },
        ],
      },
    });

    if (!sponsor) {
      sponsor = await (prisma as any).sponsors.create({
        data: {
          name: item.name,
          tier: item.tier,
          contact_email: item.contactEmail.toLowerCase(),
          contact_name: item.contactName || null,
          is_active: true,
        },
      });
      createdCount++;
      console.log(`+ Created sponsor: [${item.tier}] ${item.name} (${item.contactEmail})`);
    } else {
      sponsor = await (prisma as any).sponsors.update({
        where: { id: sponsor.id },
        data: {
          name: item.name,
          tier: item.tier,
          contact_email: item.contactEmail.toLowerCase(),
          is_active: true,
        },
      });
      updatedCount++;
      console.log(`~ Updated sponsor: [${item.tier}] ${item.name}`);
    }

    // 2. ถ้ามีงานประชุมล่าสุด และมีโควต้าที่กำหนด ให้สร้าง/อัปเดต sponsor_quotas
    if (latestMeeting && item.initialQuota !== undefined && item.initialQuota > 0) {
      const existingQuota = await (prisma as any).sponsor_quotas.findUnique({
        where: {
          sponsor_id_meeting_id: {
            sponsor_id: sponsor.id,
            meeting_id: latestMeeting.meeting_id,
          },
        },
      });

      if (!existingQuota) {
        await (prisma as any).sponsor_quotas.create({
          data: {
            sponsor_id: sponsor.id,
            meeting_id: latestMeeting.meeting_id,
            quota_seats: item.initialQuota,
            used_seats: 0,
            members_only: true,
          },
        });
        console.log(`  -> Allocated ${item.initialQuota} seats for meeting: ${latestMeeting.meeting_name}`);
      } else {
        await (prisma as any).sponsor_quotas.update({
          where: { id: existingQuota.id },
          data: {
            quota_seats: item.initialQuota,
          },
        });
        console.log(`  -> Updated to ${item.initialQuota} seats for meeting: ${latestMeeting.meeting_name}`);
      }
    }
  }

  console.log(`\nSeed completed! Created: ${createdCount}, Updated: ${updatedCount}, Total: ${SPONSORS_LIST.length}`);
}

main()
  .catch((e) => {
    console.error('Error in seed-sponsors:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
