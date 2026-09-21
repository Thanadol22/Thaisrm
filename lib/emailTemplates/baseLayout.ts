/**
 * Base HTML Layout for TSRM Email Templates
 * Designed for maximum compatibility across Gmail, Apple Mail, Outlook, and mobile clients.
 */

export interface BaseLayoutOptions {
  title: string;
  preheader?: string;
  contentHtml: string;
  associationNameTh?: string;
  associationNameEn?: string;
  contactEmail?: string;
  websiteUrl?: string;
}

export function renderBaseEmailLayout({
  title,
  preheader = '',
  contentHtml,
  associationNameTh = 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
  associationNameEn = 'Thai Society for Reproductive Medicine (TSRM)',
  contactEmail = 'tsrm.info@gmail.com',
  websiteUrl = 'https://tsrm.com',
}: BaseLayoutOptions): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a, h1, h2, h3 { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1e293b;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 30px 0;
    }
    .main-table {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 620px;
      border-spacing: 0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
    }
    .header-banner {
      background: linear-gradient(135deg, #0026b3 0%, #001768 100%);
      padding: 32px 30px;
      text-align: center;
      color: #ffffff;
    }
    .content-cell {
      padding: 36px 32px;
      font-size: 15px;
      line-height: 1.65;
      color: #334155;
    }
    .footer {
      background-color: #0f172a;
      padding: 26px 30px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #60a5fa;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #0026b3;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 38, 179, 0.25);
    }
    .btn-reject {
      background-color: #dc2626;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
    }
    .info-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 14px;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .badge-success {
      background-color: #dcfce7;
      color: #15803d;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: bold;
      display: inline-block;
    }
    .badge-alert {
      background-color: #fee2e2;
      color: #b91c1c;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: bold;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>

  <table class="wrapper" role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table class="main-table" role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td class="header-banner">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #93c5fd; margin-bottom: 6px;">
                TSRM OFFICIAL NOTIFICATION
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                ${associationNameTh}
              </h1>
              <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                ${associationNameEn}
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="content-cell">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #cbd5e1;">
                ${associationNameTh} (${associationNameEn})
              </p>
              <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 11px;">
                อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติจากสมาคมฯ หากมีข้อสงสัยกรุณาติดต่อ <a href="mailto:${contactEmail}">${contactEmail}</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © ${currentYear} TSRM. All rights reserved. | <a href="${websiteUrl}">tsrm.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
