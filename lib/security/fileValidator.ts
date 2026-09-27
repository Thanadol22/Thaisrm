/**
 * File Security & Magic Bytes Validation Utility
 * ตรวจสอบความถูกต้องและปลอดภัยของไฟล์จาก Binary Signature (Magic Numbers)
 * เพื่อป้องกันการปลอมแปลงนามสกุลไฟล์และการโจมตีด้วยไฟล์อันตราย
 */

export interface FileValidationResult {
  valid: boolean;
  mimeType?: string;
  extension?: string;
  error?: string;
}

/**
 * ตรวจสอบ Magic Bytes ของ Buffer ว่าตรงกับประเภทไฟล์ที่อนุญาตหรือไม่
 */
export function validateFileBuffer(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'ไฟล์ว่างเปล่าหรือไม่สมบูรณ์' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: 'image/jpeg', extension: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, mimeType: 'image/png', extension: 'png' };
  }

  // 3. GIF: 47 49 46 38 ('G' 'I' 'F' '8')
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { valid: true, mimeType: 'image/gif', extension: 'gif' };
  }

  // 4. WebP: 52 49 46 46 ... 57 45 42 50 ('RIFF' .... 'WEBP')
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: 'image/webp', extension: 'webp' };
  }

  // 5. PDF: 25 50 44 46 ('%PDF')
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, mimeType: 'application/pdf', extension: 'pdf' };
  }

  // 6. HEIC / HEIF / ISO Media (ftypheic, ftypmif1, ftypmsf1)
  if (buffer.length >= 12) {
    const ftyp = buffer.toString('latin1', 4, 8);
    const brand = buffer.toString('latin1', 8, 12);
    if (
      ftyp === 'ftyp' &&
      (brand.startsWith('hei') ||
        brand.startsWith('mif') ||
        brand.startsWith('msf') ||
        brand === 'heic' ||
        brand === 'heix' ||
        brand === 'hevc' ||
        brand === 'isom' ||
        brand === 'mp42')
    ) {
      return { valid: true, mimeType: 'image/heic', extension: 'heic' };
    }
  }

  return {
    valid: false,
    error: 'โครงสร้างไฟล์ไม่ถูกต้องหรือไม่ตรงกับประเภทรูปภาพและเอกสารที่อนุญาต (รองรับ JPG, PNG, WEBP, GIF, PDF, HEIC เท่านั้น)',
  };
}

/**
 * Sanitize ชื่อไฟล์เพื่อป้องกัน Path Traversal และอักขระควบคุม
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'file_' + Date.now();
  // ลบ null bytes, path separators, อักขระพิเศษ
  const sanitized = fileName
    .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
    .replace(/[/\\]/g, '_')          // Directory separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Non-alphanumeric except . - _
    .replace(/\.{2,}/g, '.')        // Multiple consecutive dots
    .substring(0, 100);

  // ป้องกันการใช้นามสกุลไฟล์อันตราย
  const dangerousExtensions = /\.(exe|php|phtml|sh|bash|bat|cmd|vbs|js|mjs|jsp|cgi|pl|py|jar|war|htaccess)$/i;
  if (dangerousExtensions.test(sanitized)) {
    return sanitized.replace(dangerousExtensions, '.bin');
  }

  return sanitized || 'file_' + Date.now();
}
