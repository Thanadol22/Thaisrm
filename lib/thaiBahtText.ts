/**
 * Converts a number to Thai Baht Text representation.
 * Example: 54000 -> "ห้าหมื่นสี่พันบาทถ้วน"
 * Example: 3500.50 -> "สามพันห้าร้อยบาทห้าสิบสตางค์"
 */

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertGroup(numStr: string): string {
  let result = '';
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[i], 10);
    const pos = len - i - 1;

    if (digit === 0) continue;

    if (pos === 0) {
      if (digit === 1 && len > 1) {
        result += 'เอ็ด';
      } else {
        result += THAI_DIGITS[digit];
      }
    } else if (pos === 1) {
      if (digit === 1) {
        result += 'สิบ';
      } else if (digit === 2) {
        result += 'ยี่สิบ';
      } else {
        result += THAI_DIGITS[digit] + 'สิบ';
      }
    } else {
      result += THAI_DIGITS[digit] + THAI_POSITIONS[pos];
    }
  }

  return result;
}

export function thaiBahtText(amount: number | string): string {
  if (amount === undefined || amount === null || amount === '') {
    return 'ศูนย์บาทถ้วน';
  }

  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;

  if (isNaN(num) || num === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  if (num < 0) {
    return 'ลบ' + thaiBahtText(Math.abs(num));
  }

  // Format with 2 decimal places
  const fixed = num.toFixed(2);
  const [bahtPart, satangPart] = fixed.split('.');

  let bahtResult = '';

  if (parseInt(bahtPart, 10) === 0) {
    bahtResult = '';
  } else {
    // Handle large numbers (> 1 million)
    let b = bahtPart;
    const groups: string[] = [];
    while (b.length > 6) {
      groups.unshift(b.slice(-6));
      b = b.slice(0, -6);
    }
    groups.unshift(b);

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const groupText = convertGroup(g);
      bahtResult += groupText;
      if (i < groups.length - 1 && groupText !== '') {
        bahtResult += 'ล้าน';
      }
    }
    bahtResult += 'บาท';
  }

  let satangResult = '';
  const satangVal = parseInt(satangPart, 10);

  if (satangVal === 0) {
    satangResult = 'ถ้วน';
  } else {
    satangResult = convertGroup(satangPart) + 'สตางค์';
  }

  return bahtResult + satangResult;
}
