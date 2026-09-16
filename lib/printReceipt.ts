import { ReceiptData, DEFAULT_ASSOCIATION_INFO } from '@/types/receipt';
import { thaiBahtText } from '@/lib/thaiBahtText';

/**
 * Generates the clean HTML string for a receipt document A4 page.
 */
export function generateReceiptHtml(data: ReceiptData): string {
  const formattedTotal = (data.totalAmount || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const bahtText = data.thaiBahtTextOverride || thaiBahtText(data.totalAmount || 0);

  const itemsHtml = (data.items || [])
    .map((item, index) => {
      const subDetailsHtml = (item.subDetails || [])
        .map((line) => {
          const isPayerName = Boolean(data.payerName && line.trim() === data.payerName.trim());
          return `<div style="font-size: 14px; color: ${isPayerName ? '#000' : '#222'}; font-weight: ${isPayerName ? 'bold' : 'normal'}; padding-left: 24px; line-height: 1.45;">${escapeHtml(line)}</div>`;
        })
        .join('');

      return `
        <div style="margin-bottom: 6px;">
          <div style="display: flex; align-items: baseline; font-size: 15px;">
            <span style="width: 24px; flex-shrink: 0; font-weight: normal;">${item.itemNumber || index + 1}.</span>
            <span style="font-weight: normal;">${escapeHtml(item.title)}</span>
          </div>
          ${subDetailsHtml}
        </div>
      `;
    })
    .join('');

  const amountsHtml = (data.items || [])
    .map((item) => {
      return `
        <div style="font-size: 15px; margin-bottom: 6px; font-weight: normal;">
          ${(item.amount || 0).toLocaleString('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </div>
      `;
    })
    .join('');

  const nameTh = data.associationNameTh || DEFAULT_ASSOCIATION_INFO.nameTh;
  const nameEn = data.associationNameEn || DEFAULT_ASSOCIATION_INFO.nameEn;
  const address = data.associationAddress || DEFAULT_ASSOCIATION_INFO.address;
  const contact = data.associationContact || DEFAULT_ASSOCIATION_INFO.contact;
  const taxId = data.associationTaxId || DEFAULT_ASSOCIATION_INFO.taxId;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ใบเสร็จรับเงิน_${escapeHtml(data.receiptNo)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #000000;
      font-family: 'Sarabun', 'TH Sarabun New', 'Angsana New', system-ui, sans-serif;
      font-size: 15px;
      line-height: 1.5;
    }

    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 16mm 18mm 14mm 18mm;
      background: #ffffff;
      position: relative;
      box-sizing: border-box;
    }

    .header-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .logo-box {
      position: absolute;
      left: 0;
      top: 0;
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-box img {
      width: 86px;
      height: 86px;
      object-fit: contain;
    }

    .header-text {
      text-align: center;
      padding-left: 70px;
      padding-right: 10px;
    }

    .title-doc {
      text-align: center;
      font-size: 25px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin: 10px 0;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 15px;
      margin-bottom: 10px;
      padding: 0 16px;
    }

    .payer-box {
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 14px;
      padding: 0 16px 0 32px;
    }

    .indent-text {
      text-indent: 40px;
      margin-bottom: 3px;
    }

    .table-container {
      border: 1px solid #000;
      margin-bottom: 10px;
    }

    .table-header {
      display: flex;
      border-bottom: 1px solid #000;
      background: #ffffff;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
    }

    .table-body {
      display: flex;
      min-height: 220px;
    }

    .col-items {
      flex: 1;
      padding: 10px 12px;
      border-right: 1px solid #000;
    }

    .col-amounts {
      width: 180px;
      padding: 10px 16px;
      text-align: right;
    }

    .table-total {
      display: flex;
      border-top: 1px solid #000;
      font-weight: 700;
      font-size: 15px;
    }

    .total-label {
      flex: 1;
      padding: 6px 16px;
      border-right: 1px solid #000;
      text-align: left;
    }

    .total-amount {
      width: 180px;
      padding: 6px 16px;
      text-align: right;
    }

    .baht-text-row {
      display: flex;
      align-items: center;
      font-size: 15px;
      margin-bottom: 24px;
      padding-left: 36px;
    }

    .signatures-block {
      margin-top: 24px;
      padding: 0 24px 0 36px;
    }

    .sig-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 20px;
      font-size: 15px;
    }

    .sig-left {
      line-height: 1.6;
    }

    .sig-right {
      text-align: right;
      padding-bottom: 4px;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <div class="header-container">
      <div class="logo-box">
        <img src="/tsrm-logoPNG.png" alt="TSRM" onerror="this.src='/logoPNG.png';" />
      </div>
      <div class="header-text">
        <div style="font-size: 21px; font-weight: 700; line-height: 1.25;">${escapeHtml(nameTh)}</div>
        <div style="font-size: 13px; font-weight: 600; line-height: 1.2; margin-top: 2px;">${escapeHtml(nameEn)}</div>
        <div style="font-size: 12.5px; line-height: 1.35; margin-top: 2px;">${escapeHtml(address)}</div>
        <div style="font-size: 12px; line-height: 1.35; margin-top: 1px;">${escapeHtml(contact)}</div>
        <div style="font-size: 12.5px; line-height: 1.35; margin-top: 1px;">เลขประจำตัวผู้เสียภาษี ${escapeHtml(taxId)}</div>
      </div>
    </div>

    <!-- Title -->
    <div class="title-doc">ใบเสร็จรับเงิน</div>

    <!-- Meta: Receipt No & Date -->
    <div class="meta-row">
      <div style="font-weight: 500;">${escapeHtml(data.receiptNo)}</div>
      <div style="font-weight: 500;">วันที่ ${escapeHtml(data.receiptDate)}</div>
    </div>

    <!-- Payer Info -->
    <div class="payer-box">
      <div class="indent-text">
        <span>สมาคมเวชศาสตร์การเจริญพันธุ์ไทย </span>
        <span>${escapeHtml(data.purposeText || 'ได้รับเงินสนับสนุน ประจำปี 2569')}</span>
      </div>
      <div style="margin-top: 2px;">
        <span style="margin-right: 12px;">จาก</span>
        <span style="font-weight: 700;">${escapeHtml(data.payerName)}</span>
        ${data.branchName ? `<span style="margin-left: 12px; font-weight: 400;">${escapeHtml(data.branchName)}</span>` : ''}
      </div>
      ${data.payerAddressLine1 ? `<div style="margin-top: 2px;">${escapeHtml(data.payerAddressLine1)}</div>` : ''}
      ${
        data.payerAddressLine2 || data.payerPhone || data.payerTaxId
          ? `<div style="margin-top: 2px;">
              ${data.payerAddressLine2 ? `${escapeHtml(data.payerAddressLine2)} ` : ''}
              ${data.payerPhone ? `Tel: ${escapeHtml(data.payerPhone)} ` : ''}
              ${data.payerTaxId ? `เลขประจำตัวผู้เสียภาษี ${escapeHtml(data.payerTaxId)}` : ''}
            </div>`
          : ''
      }
    </div>

    <!-- Items Table -->
    <div class="table-container">
      <div class="table-header">
        <div style="flex: 1; padding: 5px 12px; border-right: 1px solid #000;">รายการ</div>
        <div style="width: 180px; padding: 5px 16px;">จำนวนเงิน ( บาท)</div>
      </div>

      <div class="table-body">
        <div class="col-items">
          ${itemsHtml}
        </div>
        <div class="col-amounts">
          ${amountsHtml}
        </div>
      </div>

      <div class="table-total">
        <div class="total-label">จำนวนเงิน</div>
        <div class="total-amount">${formattedTotal}</div>
      </div>
    </div>

    <!-- Thai Baht Text -->
    <div class="baht-text-row">
      <span style="margin-right: 12px;">(ตัวอักษร)</span>
      <span style="font-weight: 500;">(${escapeHtml(bahtText)})</span>
    </div>

    <!-- Signatures -->
    <div class="signatures-block">
      <!-- Signature 1: Payer -->
      <div class="sig-row">
        <div class="sig-left">
          <div>ลงชื่อ.................................................................. ${escapeHtml(data.payerSignerRole || 'ผู้จ่ายเงิน')}</div>
          <div style="padding-left: 12px;">( ${escapeHtml(data.payerSignerName || '.........................................................................')} )</div>
        </div>
        <div class="sig-right">
          <span>ลงวันที่.......................</span>
        </div>
      </div>

      <!-- Signature 2: Authorized Signer -->
      <div class="sig-row">
        <div class="sig-left">
          <div>ลงชื่อ.................................................................. ${escapeHtml(data.authorizedSignerRole || 'เหรัญญิก / ผู้รับเงิน')}</div>
          <div style="padding-left: 12px;">
            (&nbsp;${data.authorizedSignerName ? `.............${escapeHtml(data.authorizedSignerName)}...............` : '.........................................................................'}&nbsp;)
          </div>
        </div>
        <div class="sig-right">
          <span>ลงวันที่.......................</span>
        </div>
      </div>

      <!-- Signature 3: Prepared By -->
      <div class="sig-row" style="margin-bottom: 0;">
        <div class="sig-left">
          <div>ลงชื่อ................................................................ ${escapeHtml(data.preparedByRole || 'ผู้จัดทำ')}</div>
          <div style="padding-left: 12px;">
            (&nbsp;${data.preparedByName ? `..${escapeHtml(data.preparedByName)} ....` : '.........................................................................'}&nbsp;)
          </div>
        </div>
        <div class="sig-right">
          <span>ลงวันที่.......................</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers printing of the receipt in a clean, isolated invisible iframe.
 * Works seamlessly in all modern browsers without any layout distortion or blank pages.
 */
export function printReceipt(data: ReceiptData): void {
  if (typeof window === 'undefined') return;

  const htmlContent = generateReceiptHtml(data);

  // Remove existing print iframes if any
  const existingIframe = document.getElementById('receipt-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'receipt-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for images and fonts to settle, then print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print()', err);
      window.print();
    } finally {
      // Clean up iframe after a delay
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 60000);
    }
  }, 400);
}
