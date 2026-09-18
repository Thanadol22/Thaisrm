/**
 * Email Notification Service Stub
 * Prepared for future integration with SMTP / Transactional Email Provider (e.g. Resend, SendGrid, Nodemailer)
 */

export interface SendRegistrationApprovedEmailParams {
  to: string;
  recipientName: string;
  meetingName: string;
  meetingDate?: string;
  ticketCode: string;
  amountPaid: number;
  qrCodeUrl?: string;
  isMember: boolean;
}

export interface SendSlipRejectionEmailParams {
  to: string;
  recipientName: string;
  meetingName: string;
  rejectionReason: string;
  resubmitUrl: string;
}

/**
 * Send email when meeting registration payment slip is approved
 */
export async function sendRegistrationApprovedEmail(params: SendRegistrationApprovedEmailParams): Promise<{ success: boolean; messageId?: string }> {
  console.log('📧 [EMAIL SERVICE - STUB] Sending Meeting Registration Approval Email:', {
    to: params.to,
    recipient: params.recipientName,
    meeting: params.meetingName,
    ticket: params.ticketCode,
    amount: params.amountPaid,
    isMember: params.isMember ? 'Member' : 'Non-Member',
    timestamp: new Date().toISOString()
  });

  // Future SMTP / Provider API Call placeholder
  return {
    success: true,
    messageId: `stub-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  };
}

/**
 * Send email when meeting registration payment slip is rejected with a re-upload link
 */
export async function sendSlipRejectionEmail(params: SendSlipRejectionEmailParams): Promise<{ success: boolean; messageId?: string }> {
  console.log('📧 [EMAIL SERVICE - STUB] Sending Meeting Slip Rejection & Resubmit Email:', {
    to: params.to,
    recipient: params.recipientName,
    meeting: params.meetingName,
    reason: params.rejectionReason,
    resubmitUrl: params.resubmitUrl,
    timestamp: new Date().toISOString()
  });

  // Future SMTP / Provider API Call placeholder
  return {
    success: true,
    messageId: `stub-reject-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  };
}

export interface SendMembershipApprovedEmailParams {
  to: string;
  recipientName: string;
  memberNo: string;
  amountPaid: number;
}

/**
 * Send email when membership registration payment slip is approved and member account is created
 */
export async function sendMembershipApprovedEmail(params: SendMembershipApprovedEmailParams): Promise<{ success: boolean; messageId?: string }> {
  console.log('📧 [EMAIL SERVICE - STUB] Sending Membership Approval Email:', {
    to: params.to,
    recipient: params.recipientName,
    memberNo: params.memberNo,
    amount: params.amountPaid,
    timestamp: new Date().toISOString()
  });

  // Future SMTP / Provider API Call placeholder
  return {
    success: true,
    messageId: `stub-mem-approved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  };
}


