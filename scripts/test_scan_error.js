const { processDailyQrScan } = require('./lib/services/dailyCheckinService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const rawCode = 'TSRM-PASS:TSRM-DAY-TSRM34-20261020-GRP20268461';
    const targetMeetingId = 'TSRM34';
    const dailyResult = await processDailyQrScan(rawCode, targetMeetingId);
    console.log('dailyResult:', dailyResult);
    const jsonStr = JSON.stringify(dailyResult);
    console.log('JSON serialized successfully:', jsonStr);
  } catch (err) {
    console.error('TEST ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
