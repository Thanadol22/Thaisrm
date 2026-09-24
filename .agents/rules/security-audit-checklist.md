# 🔒 Security & Completeness Audit Checklist — TSRM System

> ไฟล์นี้เป็น **กฎถาวร** สำหรับ AI Agent ทุกตัวที่ทำงานในโปรเจคนี้
> สร้างเมื่อ: 24 กันยายน 2569 | ตรวจสอบและอัปเดตทุกครั้งหลัง deploy

---

## 🤖 คำสั่งสำหรับ AI Agent

**เมื่อถูกขอให้แก้ไขระบบ Security ให้ทำตามขั้นตอนนี้:**

```
ขั้นตอน 1: อ่านรายการ BUG ในไฟล์นี้
ขั้นตอน 2: แก้ไขทีละ BUG ตาม "วิธีแก้" ที่ระบุ
ขั้นตอน 3: ทดสอบโดยตรวจสอบโค้ดที่แก้ไข (ไม่ต้องรัน command)
ขั้นตอน 4: อัปเดต Status ของ BUG ที่แก้แล้วในไฟล์นี้ ✅
ขั้นตอน 5: รายงานสรุปสิ่งที่ทำเสร็จ
```

**Pattern มาตรฐานสำหรับ Auth Check ในทุก API:**
```typescript
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}
```

---

## 📋 รายการ BUG ที่ต้องแก้ไข

### 🔴 BUG-001 — `/api/coupons` GET+POST ไม่มี Auth
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Critical
- **ไฟล์:** `app/api/coupons/route.ts`
- **ปัญหา:** GET และ POST ไม่มี `getAdminSessionFromRequest` ใครก็ดู/สร้างคูปองได้

**วิธีแก้:**
```typescript
// app/api/coupons/route.ts

// เพิ่ม import ที่บรรทัด 1-2:
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

// ใน GET handler — เพิ่มหลัง try {:
export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // ... เดิม

// ใน POST handler — เพิ่มหลัง try {:
export async function POST(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // ... เดิม
```

---

### 🔴 BUG-002 — `/api/coupons/[id]` GET+PUT+DELETE ไม่มี Auth
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Critical
- **ไฟล์:** `app/api/coupons/[id]/route.ts`
- **ปัญหา:** ทุก handler ไม่มี auth check

**วิธีแก้:**
```typescript
// เพิ่ม import:
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

// เพิ่ม session check ต้นทุก handler (GET, PUT, DELETE):
const session = getAdminSessionFromRequest(request);
if (!session) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
```

---

### 🔴 BUG-003 — `POST /api/sponsors` ไม่มี Auth
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Critical
- **ไฟล์:** `app/api/sponsors/route.ts`
- **ปัญหา:** POST handler (สร้างบริษัท Sponsor) ไม่มี admin auth ใครสร้างบริษัทได้

**วิธีแก้:**
```typescript
// เพิ่ม import ที่บรรทัดแรก (ถ้ายังไม่มี):
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

// ใน POST handler บรรทัด 167 — เพิ่มหลัง export async function POST(req: NextRequest) {:
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
```

---

### 🔴 BUG-004 — `GET /api/admin/settings` ไม่มี Auth
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Critical
- **ไฟล์:** `app/api/admin/settings/route.ts`
- **ปัญหา:** GET handler ไม่รับ NextRequest จึงตรวจ auth ไม่ได้ — เปิดเผยข้อมูลธนาคาร/ลายเซ็น

**วิธีแก้:**
```typescript
// เปลี่ยน signature:
// จาก:
export async function GET() {

// เป็น:
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // ... เดิม
```

---

### 🔴 BUG-005 — `GET /api/admin/receipts` ไม่มี Auth
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Critical
- **ไฟล์:** `app/api/admin/receipts/route.ts`
- **ปัญหา:** GET handler ไม่มี session check — ใบเสร็จทั้งหมดเปิด public

**วิธีแก้:**
```typescript
// ใน GET handler บรรทัด 13 — เพิ่ม session check:
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // ... เดิม
```

---

### 🟠 BUG-006 — `register-slip` และการผูก meeting_id ในการสมัครสมาชิก
- **Status:** ℹ️ ปรับปรุงความถูกต้องตาม Business Logic (24 ก.ย. 2569)
- **ระดับ:** Information / Business Logic
- **ไฟล์:** `app/api/members/register-slip/route.ts`
- **ข้อกำหนดที่ถูกต้อง:** **การสมัครสมาชิกสมาคม (Membership Application) เป็นของสมาคมโดยตรง ไม่ผูกกับรอบการประชุมใดๆ** (เปิดรับตลอดทั้งปี ไม่ขึ้นกับสถานะ upcoming/ongoing ของงานประชุม)
- **การจัดการทางเทคนิค:** ฟิลด์ `meeting_id` ในตาราง `payment_slips` ถูกใช้เพื่อตอบสนอง Foreign Key constraint ของ Database เท่านั้น โดยดึงรอบประชุมล่าสุดที่มีในระบบโดยไม่บล็อกผู้ใช้เมื่อไม่มีงานประชุมที่กำลังเปิดอยู่

---

### 🟠 BUG-007 — `GET /api/meetings` เปิด list ทั้งหมด public (รวม pricing/staff_code)
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** High
- **ไฟล์:** `app/api/meetings/route.ts`
- **ปัญหา:** action='latest' ควร public แต่ GET list ทั้งหมดควร require admin auth

**วิธีแก้:**
```typescript
// ใน GET handler เพิ่ม auth check แบบ conditional:
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Public endpoints: latest, active meeting info for public forms
    const isPublicAction = action === 'latest' || action === 'active' || action === 'next_id';

    if (!isPublicAction) {
      const session = getAdminSessionFromRequest(req);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    // ... เดิม
```

---

### 🟠 BUG-008 — Sponsor Portal ขาด Inactivity Timeout
- **Status:** ✅ ตรวจสอบแล้ว (มีระบบ Inactivity 5 นาที พร้อม Warning Countdown แล้ว)
- **ระดับ:** High
- **ไฟล์:** `app/sponsor/group-register/page.tsx`
- **ปัญหา:** ตาม AGENTS.md Rule 10.1: ต้อง logout อัตโนมัติเมื่อ inactive > 5 นาที

**วิธีแก้:**
```typescript
// เพิ่ม useEffect สำหรับ inactivity tracking:
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_MS = 4 * 60 * 1000; // warn at 4 minutes

useEffect(() => {
  if (!sponsorSession) return; // only track when authenticated

  let warningTimer: ReturnType<typeof setTimeout>;
  let logoutTimer: ReturnType<typeof setTimeout>;

  const resetTimers = () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    warningTimer = setTimeout(() => {
      // show warning toast: "ระบบจะออกจากระบบใน 1 นาที"
    }, WARNING_MS);
    logoutTimer = setTimeout(() => {
      setSponsorSession(null); // clear session → return to email input
    }, INACTIVITY_TIMEOUT_MS);
  };

  const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
  events.forEach(e => window.addEventListener(e, resetTimers));
  resetTimers(); // start timers

  return () => {
    events.forEach(e => window.removeEventListener(e, resetTimers));
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
  };
}, [sponsorSession]);
```

---

### 🟡 ISSUE-009 — pay_later_pending อาจแสดง broken link
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Medium
- **ไฟล์:** `components/views/AdminSlipsView.tsx`

**วิธีแก้:**
```typescript
// หา render ของ slipUrl/slip_url และเพิ่ม condition:
{slip.slipUrl && slip.slipUrl !== 'pay_later_pending' ? (
  <a href={slip.slipUrl} target="_blank" rel="noopener noreferrer">
    ดูสลิป
  </a>
) : slip.slipUrl === 'pay_later_pending' ? (
  <span className="text-yellow-500 text-xs font-medium">ชำระเงินภายหลัง</span>
) : (
  <span className="text-slate-400 text-xs">ไม่มีสลิป</span>
)}
```

---

### 🟡 IMPROVE-010 — rate limiting สำหรับ resubmit-slip
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Medium
- **ไฟล์:** `middleware.ts`

**วิธีแก้:**
```typescript
// เพิ่มใน middleware.ts ส่วน profile selection (ก่อน checkRateLimit):
} else if (pathname.startsWith('/api/payment/resubmit')) {
  profile = {
    maxRequests: 5,
    windowSeconds: 60,
    banDurationSeconds: 300,
    maxViolationsBeforeBan: 2,
  };
  identifier = `resubmit:${ip}`;
}
```

---

### 🟡 IMPROVE-011 — Dashboard auto-refresh
- **Status:** ✅ แก้ไขแล้ว (24 ก.ย. 2569)
- **ระดับ:** Low
- **ไฟล์:** `components/admin/DashboardOverviewPanel.tsx`

**วิธีแก้:**
```typescript
// เพิ่ม auto-refresh ทุก 30 วินาที:
useEffect(() => {
  fetchDashboardData(); // initial load
  const interval = setInterval(fetchDashboardData, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## ✅ ขั้นตอนการทดสอบหลังแก้ไข (Post-Fix Verification)

หลังแก้แต่ละ BUG ให้ตรวจสอบดังนี้:

### สำหรับ BUG-001 ถึง BUG-005 (Auth fixes):
```
1. ตรวจสอบว่าทุก handler มี import getAdminSessionFromRequest
2. ตรวจสอบว่า session check อยู่ก่อน try block หรือต้นสุดของ handler
3. ตรวจสอบว่า return 401 เมื่อ session = null
4. ตรวจว่าไม่มี handler อื่นในไฟล์เดียวกันที่ยังขาด auth
```

### สำหรับ BUG-006 (Meeting status):
```
1. ตรวจว่า where clause มี status: { in: ['upcoming', 'ongoing'] }
2. ตรวจว่า orderBy เป็น meeting_date: 'asc' (เอาใกล้ที่สุด)
3. Error message เมื่อไม่มี meeting ยังแสดงถูกต้อง
```

### สำหรับ BUG-007 (Meetings public filter):
```
1. ตรวจว่า action='latest' ยังทำงานโดยไม่ต้อง login
2. ตรวจว่า GET แบบ list (ไม่มี action) ต้อง login
```

### สำหรับ BUG-008 (Inactivity timeout):
```
1. ตรวจว่า useEffect ติดตาม events: mousemove, keydown, touchstart, scroll
2. ตรวจว่า timeout set ที่ 5 นาที
3. ตรวจว่า cleanup function คืน clearTimeout และ removeEventListener
4. ตรวจว่า session ถูก clear เมื่อ timeout
```

---

## 📅 ประวัติการแก้ไข

| วันที่ | BUG | ผู้แก้ | หมายเหตุ |
|--------|-----|--------|---------|
| 24 ก.ย. 2569 | - | Audit | สร้าง checklist เริ่มต้น |
| 24 ก.ย. 2569 | BUG-001 | AI Agent | เพิ่ม Admin Auth ให้กับ GET และ POST /api/coupons |
| 24 ก.ย. 2569 | BUG-002 | AI Agent | เพิ่ม Admin Auth ให้กับ GET, PUT, PATCH, DELETE /api/coupons/[id] |
| 24 ก.ย. 2569 | BUG-003 | AI Agent | เพิ่ม Admin Auth ให้กับ POST /api/sponsors |
| 24 ก.ย. 2569 | BUG-004 | AI Agent | เพิ่ม Admin Auth ให้กับ GET /api/admin/settings และสร้าง /api/settings/public |
| 24 ก.ย. 2569 | BUG-005 | AI Agent | เพิ่ม Admin Auth ให้กับ GET /api/admin/receipts |
| 24 ก.ย. 2569 | BUG-006 | AI Agent | ปรับปรุง: การสมัครสมาชิกไม่ผูกกับการประชุม (ใช้ meeting_id เพื่อ FK เท่านั้น ไม่บล็อกผู้สมัคร) |
| 24 ก.ย. 2569 | BUG-007 | AI Agent | ป้องกัน GET /api/meetings list ทั้งหมด ต้องมี Admin Auth |
| 24 ก.ย. 2569 | BUG-008 | AI Agent | ตรวจสอบระบบ Inactivity Timeout 5 นาทีใน Sponsor Portal ทำงานสมบูรณ์ |
| 24 ก.ย. 2569 | ISSUE-009 | AI Agent | ปรับปรุงการแสดงผลสลิปกรณีชำระเงินภายหลัง ป้องกัน broken link ใน AdminSlipsView |
| 24 ก.ย. 2569 | IMPROVE-010 | AI Agent | เพิ่ม Rate Limiting สำหรับ /api/payment/resubmit ใน middleware.ts |
| 24 ก.ย. 2569 | IMPROVE-011 | AI Agent | เพิ่ม Auto-refresh ทุก 30 วินาทีสำหรับ Dashboard Overview ใน app/admin/page.tsx |
