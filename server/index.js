require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Initialize Google OAuth2 Client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/auth/google/callback`
);

// Route เช็คสถานะ Server
app.get('/', (req, res) => {
  res.send({
    status: 'online',
    message: 'Express Backend Server is running',
    googleConfigured: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE'
    )
  });
});

// Route สำหรับสร้าง URL เพื่อให้ Frontend Redirect ผู้ใช้ไป Login ที่ Google
app.get('/api/auth/google/url', (req, res) => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE'
  ) {
    return res.status(400).json({
      error: 'กรุณากรอก GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET ในไฟล์ .env ก่อนใช้งาน'
    });
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'select_account'
  });

  res.json({ url });
});

// Route สำหรับ Callback ที่ Google จะส่ง code กลับมาหลังจากล็อกอินสำเร็จ
app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
  }

  try {
    // 1. นำ code ไปแลก tokens จาก Google
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // 2. ถอดรหัส verify id_token เพื่อดึงข้อมูล User Profile
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 3. สร้าง JWT Token สำหรับระบบเราเอง
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured in .env');
    }
    const appToken = jwt.sign(
      { googleId, email, name, picture },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Redirect กลับไปหน้า Frontend พร้อม Token และข้อมูล User
    const userParam = encodeURIComponent(JSON.stringify({ googleId, email, name, picture }));
    res.redirect(`${FRONTEND_URL}/login/callback?token=${appToken}&user=${userParam}`);
  } catch (error) {
    console.error('Google Callback Error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`);
  }
});

// Staff PIN Verification Endpoint
app.post('/api/staff/verify-pin', (req, res) => {
  const { pin } = req.body;
  const staffPin = process.env.STAFF_PIN;

  if (!pin || typeof pin !== 'string' || pin.length !== 6) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกรหัสผ่าน 6 หลัก' });
  }

  if (!staffPin) {
    return res.status(500).json({ success: false, error: 'ระบบยังไม่ได้ตั้งค่ารหัสเจ้าหน้าที่' });
  }

  if (pin === staffPin) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Express Server running on http://localhost:${PORT}`);
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE'
  ) {
    console.log(`⚠️  คำเตือน: ยังไม่ได้ใส่ GOOGLE_CLIENT_ID หรือ GOOGLE_CLIENT_SECRET ในไฟล์ .env`);
  } else {
    console.log(`✅ โหลด Google OAuth Credentials สำเร็จ!`);
  }
  console.log(`=================================`);
});
