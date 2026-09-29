/**
 * นโยบายอีเมลสำหรับการลงทะเบียน (สมัครสมาชิก / ลงทะเบียนเข้าประชุม)
 * อนุญาตเฉพาะอีเมลส่วนตัวจากผู้ให้บริการทั่วไปเท่านั้น ห้ามใช้อีเมลองค์กร (บริษัท โรงพยาบาล มหาวิทยาลัย ฯลฯ)
 * ใช้ได้ทั้งฝั่ง Client และ Server (ไม่มีการเรียกฐานข้อมูล)
 */
export const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.co.th',
  'outlook.com',
  'outlook.co.th',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.th',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'gmx.com',
  'mail.com',
  'yandex.com',
];

export function getEmailDomain(email: string | null | undefined): string {
  const clean = (email || '').trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  return atIndex === -1 ? '' : clean.substring(atIndex + 1);
}

export function isPersonalEmail(email: string | null | undefined): boolean {
  return PERSONAL_EMAIL_DOMAINS.includes(getEmailDomain(email));
}

export function personalEmailRequiredMessage(lang: 'th' | 'en' = 'th'): string {
  return lang === 'th'
    ? 'ไม่อนุญาตให้ใช้อีเมลองค์กรในการลงทะเบียน กรุณาใช้อีเมลส่วนตัว เช่น Gmail, Hotmail, Outlook, Yahoo หรือ iCloud'
    : 'Organization emails are not allowed for registration. Please use a personal email such as Gmail, Hotmail, Outlook, Yahoo or iCloud.';
}
