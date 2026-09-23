
async function testAuth() {
  const baseUrl = 'http://localhost:3000';
  console.log('Testing Sponsor Auth with test@sponsor.com and OTP 111111...');

  // 1. Test request-otp
  const reqOtpRes = await fetch(`${baseUrl}/api/sponsors/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@sponsor.com' }),
  });
  const reqOtpData: any = await reqOtpRes.json();
  console.log('Request OTP response:', reqOtpData);

  // 2. Test verify-otp with 111111
  const verifyRes = await fetch(`${baseUrl}/api/sponsors/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@sponsor.com', otp: '111111' }),
  });
  const verifyData: any = await verifyRes.json();
  console.log('Verify OTP (111111) response:', {
    success: verifyData.success,
    message: verifyData.message,
    sessionData: verifyData.sessionData,
    meetings: verifyData.meetings,
  });

  // 3. Test Verify Again immediately (proves 111111 is permanent and doesn't get consumed/locked out)
  const verifyRes2 = await fetch(`${baseUrl}/api/sponsors/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@sponsor.com', otp: '111111' }),
  });
  const verifyData2: any = await verifyRes2.json();
  console.log('Verify OTP 2nd time (Permanent Pass Check):', {
    success: verifyData2.success,
    message: verifyData2.message,
  });

  // 4. Test coupon validation
  const couponRes = await fetch(`${baseUrl}/api/sponsors/portal/validate-coupon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'T34-TEST-111111',
      meetingId: 'TSRM34',
      basePrice: 4500,
    }),
  });
  const couponData: any = await couponRes.json();
  console.log('Validate Coupon response:', couponData);

  // 5. Test member validation
  const memberRes = await fetch(`${baseUrl}/api/sponsors/portal/verify-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberNo: '0000',
      name: 'บัญชีทดสอบ ระบบ',
      meetingId: 'TSRM34',
    }),
  });
  const memberData: any = await memberRes.json();
  console.log('Verify Member response:', memberData);
}

testAuth().catch(console.error);
