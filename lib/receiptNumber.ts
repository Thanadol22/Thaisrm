export const DEFAULT_RECEIPT_START_SEQ = 115;

/**
 * Helper to generate or format receipt numbers according to the standard pattern:
 * YYYY/02-NNN (e.g. 2569/02-115, 2569/02-116)
 */
export function generateReceiptNo(
  dateInput?: string | Date | null,
  seqNumber: number = DEFAULT_RECEIPT_START_SEQ
): string {
  const now = new Date();
  const currentYear = now.getFullYear() > 2500 ? now.getFullYear() : now.getFullYear() + 543;
  let year = currentYear;

  if (dateInput) {
    if (typeof dateInput === 'string') {
      const matchYear = dateInput.match(/25\d{2}/);
      if (matchYear) {
        year = parseInt(matchYear[0], 10);
      } else {
        const d = new Date(dateInput);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear() > 2500 ? d.getFullYear() : d.getFullYear() + 543;
        }
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      year = dateInput.getFullYear() > 2500 ? dateInput.getFullYear() : dateInput.getFullYear() + 543;
    }
  }

  const seqStr = String(seqNumber).padStart(3, '0');
  return `${year}/02-${seqStr}`;
}
