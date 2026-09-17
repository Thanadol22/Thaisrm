/**
 * Helper to generate or format receipt numbers according to the standard pattern:
 * YYYY/MM-NNN (e.g. 2569/02-021, 2569/02-094, 2569/02-103)
 */
export function generateReceiptNo(
  dateInput?: string | Date | null,
  seqNumber: number = 1
): string {
  const now = new Date();
  const currentYear = now.getFullYear() > 2500 ? now.getFullYear() : now.getFullYear() + 543;
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  let year = currentYear;
  let month = currentMonth;

  if (dateInput) {
    if (typeof dateInput === 'string') {
      const thaiMonths = [
        'มกราคม',
        'กุมภาพันธ์',
        'มีนาคม',
        'เมษายน',
        'พฤษภาคม',
        'มิถุนายน',
        'กรกฎาคม',
        'สิงหาคม',
        'กันยายน',
        'ตุลาคม',
        'พฤศจิกายน',
        'ธันวาคม',
      ];
      let foundMonth = false;
      thaiMonths.forEach((mName, idx) => {
        if (dateInput.includes(mName)) {
          month = String(idx + 1).padStart(2, '0');
          foundMonth = true;
        }
      });

      const matchYear = dateInput.match(/25\d{2}/);
      if (matchYear) {
        year = parseInt(matchYear[0], 10);
      }

      if (!foundMonth && !matchYear) {
        const d = new Date(dateInput);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear() > 2500 ? d.getFullYear() : d.getFullYear() + 543;
          month = String(d.getMonth() + 1).padStart(2, '0');
        }
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      year = dateInput.getFullYear() > 2500 ? dateInput.getFullYear() : dateInput.getFullYear() + 543;
      month = String(dateInput.getMonth() + 1).padStart(2, '0');
    }
  } else {
    const now = new Date();
    year = now.getFullYear() > 2500 ? now.getFullYear() : now.getFullYear() + 543;
    month = String(now.getMonth() + 1).padStart(2, '0');
  }

  const seqStr = String(seqNumber).padStart(3, '0');
  return `${year}/${month}-${seqStr}`;
}
