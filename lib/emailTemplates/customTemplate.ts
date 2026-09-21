import { renderBaseEmailLayout } from './baseLayout';

export interface CustomBroadcastEmailOptions {
  subject: string;
  recipientName?: string;
  rawHtmlContent: string;
  associationNameTh?: string;
  associationNameEn?: string;
}

export function renderCustomBroadcastEmail(options: CustomBroadcastEmailOptions): string {
  // Convert newlines to paragraphs/br if simple text
  let formattedContent = options.rawHtmlContent;
  if (!formattedContent.includes('<p>') && !formattedContent.includes('<div>') && !formattedContent.includes('<table')) {
    formattedContent = formattedContent
      .split('\n\n')
      .map((p) => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  }

  const content = `
    ${options.recipientName ? `
      <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 18px;">
        เรียน ${options.recipientName},
      </div>
    ` : ''}

    <div style="font-size: 15px; line-height: 1.7; color: #334155;">
      ${formattedContent}
    </div>
  `;

  return renderBaseEmailLayout({
    title: options.subject,
    preheader: options.subject,
    contentHtml: content,
    associationNameTh: options.associationNameTh,
    associationNameEn: options.associationNameEn,
  });
}
