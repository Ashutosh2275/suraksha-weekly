# 📂 OTP Authentication - File Structure

## Complete File Tree

```
suraksha-weekly/
│
├── 📁 services/api/                      ← FastAPI Backend Service
│   │
│   ├── 📁 schemas/
│   │   └── 📄 auth.py                    ✅ NEW - Pydantic request/response models (~150 lines)
│   │       ├── OTPRequestSchema          • Phone validation
│   │       ├── OTPVerifySchema           • OTP + device validation
│   │       ├── TokenRefreshSchema        • Refresh token validation
│   │       ├── LogoutSchema              • Logout request
│   │       └── All response schemas      • With examples & docs
│   │
│   ├── 📁 services/
│   │   ├── 📄 sms_provider.py            ✅ NEW - SMS provider abstraction (~165 lines)
│   │   │   ├── SMSProvider               • Abstract base class
│   │   │   ├── DevelopmentSMSProvider    • Logs OTP (dev mode)
│   │   │   ├── TwilioSMSProvider         • Twilio API integration
│   │   │   ├── MSG91Provider             • MSG91 API (India)
│   │   │   ├── MockSMSProvider           • Testing mock
│   │   │   └── get_sms_provider()        • Factory function
│   │   │
│   │   ├── 📄 otp_service.py             ✅ NEW - OTP operations (~95 lines)
│   │   │   ├── generate_otp()            • 6-digit random
│   │   │   ├── store_otp()               • Redis with 300s TTL
│   │   │   ├── verify_otp()              • One-time validation
│   │   │   ├── check_rate_limit()        • Sliding window (3/10min)
│   │   │   └── OTPService class          • Main service
│   │   │
│   │   └── 📄 token_service.py           ✅ NEW - JWT operations (~227 lines)
│   │       ├── create_access_token()     • 15-min JWT
│   │       ├── create_refresh_token()    • 7-day JWT
│   │       ├── verify_token()            • Validation
│   │       ├── store_refresh_token()     • Hash + Redis
│   │       ├── rotate_refresh_token()    • Token rotation
│   │       ├── invalidate_refresh_token()• Logout
│   │       └── TokenService class        • Main service
│   │
│   ├── 📁 models/
│   │   └── 📄 worker.py                  ✅ NEW - Database models (~60 lines)
│   │       ├── Worker                    • User identity model
│   │       │   ├── id (UUID, PK)
│   │       │   ├── phone (unique, indexed)
│   │       │   ├── full_name, email
│   │       │   ├── is_active
│   │       │   └── timestamps
│   │       │
│   │       └── WorkerSession             • Session tracking model
│   │           ├── id (UUID, PK)
│   │           ├── worker_id (FK)
│   │           ├── device_id (indexed)
│   │           ├── ip_address, user_agent
│   │           └── timestamps
│   │
│   ├── 📁 routers/
│   │   └── 📄 auth_otp.py                ✅ NEW - Auth endpoints (~332 lines)
│   │       ├── POST /api/v1/auth/otp/request
│   │       │   • Request OTP
│   │       │   • Rate limiting
│   │       │   • SMS sending
│   │       │
│   │       ├── POST /api/v1/auth/otp/verify
│   │       │   • Verify OTP
│   │       │   • Create/get worker
│   │       │   • Issue tokens
│   │       │   • Log session
│   │       │
│   │       ├── POST /api/v1/auth/token/refresh
│   │       │   • Validate refresh token
│   │       │   • Rotate tokens
│   │       │   • Return new pair
│   │       │
│   │       └── POST /api/v1/auth/logout
│   │           • Invalidate token
│   │           • Cleanup session
│   │
│   ├── 📄 requirements.txt               ✅ UPDATED - Dependencies
│   │   ├── PyJWT==2.8.0                  • NEW - JWT operations
│   │   ├── httpx==0.26.0                 • NEW - HTTP client
│   │   ├── redis==5.0.1                  • Existing
│   │   └── ... (other deps)
│   │
│   └── 📄 AUTH_OTP_README.md             ✅ NEW - Technical docs (11.7 KB)
│       ├── Architecture diagrams
│       ├── API specifications
│       ├── Usage examples
│       ├── Security features
│       ├── Redis patterns
│       └── Testing guide
│
├── 📄 OTP_AUTH_INDEX.md                  ✅ NEW - Main index (10.8 KB)
│   ├── Quick links
│   ├── File structure
│   ├── Quick start
│   └── Navigation hub
│
├── 📄 OTP_AUTH_COMPLETE.md               ✅ NEW - Quick start (9.2 KB)
│   ├── Features list
│   ├── Quick setup
│   ├── Testing commands
│   └── Configuration
│
├── 📄 OTP_INTEGRATION_CHECKLIST.md       ✅ NEW - Integration (10.5 KB)
│   ├── Step-by-step guide
│   ├── Verification checklist
│   ├── Troubleshooting
│   └── Success criteria
│
├── 📄 OTP_AUTH_SUMMARY.md                ✅ NEW - Implementation (15.9 KB)
│   ├── Architecture overview
│   ├── Implementation details
│   ├── Security deep dive
│   ├── Redis patterns
│   └── Performance metrics
│
├── 📄 OTP_AUTH_DELIVERABLES.md           ✅ NEW - Deliverables (11.8 KB)
│   ├── Feature checklist
│   ├── Test coverage
│   ├── Integration status
│   └── Metrics
│
├── 📄 OTP_AUTH_FINAL_REPORT.md           ✅ NEW - Final report (10.9 KB)
│   ├── Completion summary
│   ├── Deliverables list
│   ├── Quality checklist
│   └── Next steps
│
└── 📄 OTP_AUTH_FILE_STRUCTURE.md         ✅ NEW - This file
    └── Visual file tree
```

---

## 📊 Statistics

### Source Code Files: 7
| Category | Files | Lines |
|----------|-------|-------|
| Schemas | 1 | ~150 |
| Services | 3 | ~487 |
| Models | 1 | ~60 |
| Routers | 1 | ~332 |
| Config | 1 | ~22 |
| **TOTAL** | **7** | **~1,051** |

### Documentation Files: 7
| Category | Files | Size |
|----------|-------|------|
| Index | 1 | 10.8 KB |
| Guides | 3 | 35.6 KB |
| Technical | 3 | 39.4 KB |
| **TOTAL** | **7** | **~85.8 KB** |

### Total Deliverables: 14 files
- **Code:** 7 files, ~1,051 lines
- **Docs:** 7 files, ~85.8 KB

---

## 🎯 Quick Navigation

### 🚀 Getting Started
1. **Start Here:** [`OTP_AUTH_INDEX.md`](OTP_AUTH_INDEX.md)
2. **Quick Start:** [`OTP_AUTH_COMPLETE.md`](OTP_AUTH_COMPLETE.md)
3. **Integration:** [`OTP_INTEGRATION_CHECKLIST.md`](OTP_INTEGRATION_CHECKLIST.md)

### 📚 Technical Reference
4. **API Docs:** [`services/api/AUTH_OTP_README.md`](services/api/AUTH_OTP_README.md)
5. **Implementation:** [`OTP_AUTH_SUMMARY.md`](OTP_AUTH_SUMMARY.md)
6. **Deliverables:** [`OTP_AUTH_DELIVERABLES.md`](OTP_AUTH_DELIVERABLES.md)

### 📝 Project Summary
7. **Final Report:** [`OTP_AUTH_FINAL_REPORT.md`](OTP_AUTH_FINAL_REPORT.md)
8. **File Structure:** [`OTP_AUTH_FILE_STRUCTURE.md`](OTP_AUTH_FILE_STRUCTURE.md) ← You are here

---

## 🗂️ Source Code Organization

### Layer 1: Schemas (Input/Output)
```
schemas/auth.py
├── Request Models
│   ├── OTPRequestSchema         (phone validation)
│   ├── OTPVerifySchema          (OTP + device)
│   ├── TokenRefreshSchema       (refresh token)
│   └── LogoutSchema             (logout)
└── Response Models
    ├── OTPRequestResponse       (with/without OTP)
    ├── OTPVerifyResponse        (tokens + worker_id)
    ├── TokenRefreshResponse     (new tokens)
    └── LogoutResponse           (success message)
```

### Layer 2: Services (Business Logic)
```
services/
├── sms_provider.py             (SMS abstraction)
│   ├── SMSProvider             (abstract interface)
│   ├── DevelopmentSMSProvider  (dev mode)
│   ├── TwilioSMSProvider       (production)
│   ├── MSG91Provider           (India)
│   └── MockSMSProvider         (testing)
│
├── otp_service.py              (OTP operations)
│   └── OTPService
│       ├── generate_otp()
│       ├── store_otp()
│       ├── verify_otp()
│       └── check_rate_limit()
│
└── token_service.py            (JWT operations)
    └── TokenService
        ├── create_access_token()
        ├── create_refresh_token()
        ├── verify_token()
        ├── store_refresh_token()
        ├── rotate_refresh_token()
        └── invalidate_refresh_token()
```

### Layer 3: Models (Data Persistence)
```
models/worker.py
├── Worker                      (user identity)
│   ├── id: UUID (PK)
│   ├── phone: str (unique)
│   ├── full_name: str
│   ├── email: str
│   ├── is_active: bool
│   └── timestamps
│
└── WorkerSession               (session tracking)
    ├── id: UUID (PK)
    ├── worker_id: UUID (FK)
    ├── device_id: str
    ├── ip_address: str
    ├── user_agent: str
    └── timestamps
```

### Layer 4: Routers (API Endpoints)
```
routers/auth_otp.py
├── POST /api/v1/auth/otp/request
│   └── Request OTP for phone
│
├── POST /api/v1/auth/otp/verify
│   └── Verify OTP, get tokens
│
├── POST /api/v1/auth/token/refresh
│   └── Refresh access token
│
└── POST /api/v1/auth/logout
    └── Logout, invalidate session
```

---

## 🔄 Data Flow

### OTP Request Flow
```
Client
  │
  └─> POST /otp/request {"phone": "+91..."}
        │
        ├─> OTPRequestSchema (validate phone)
        │
        ├─> OTPService.check_rate_limit() → Redis
        │
        ├─> OTPService.generate_otp() → "123456"
        │
        ├─> OTPService.store_otp() → Redis (300s TTL)
        │
        ├─> SMSProvider.send_otp() → SMS API
        │
        └─> OTPRequestResponse
            └─> {message, expires_in, otp?}
```

### OTP Verify Flow
```
Client
  │
  └─> POST /otp/verify {"phone": "+91...", "otp": "123456", "device_id": "..."}
        │
        ├─> OTPVerifySchema (validate input)
        │
        ├─> OTPService.verify_otp() → Redis (check & delete)
        │
        ├─> Worker.find_or_create() → PostgreSQL
        │
        ├─> WorkerSession.create() → PostgreSQL
        │
        ├─> TokenService.create_access_token() → JWT (15min)
        │
        ├─> TokenService.create_refresh_token() → JWT (7days)
        │
        ├─> TokenService.store_refresh_token() → Redis (hash + store)
        │
        └─> OTPVerifyResponse
            └─> {access_token, refresh_token, worker_id, is_new_user}
```

### Token Refresh Flow
```
Client
  │
  └─> POST /token/refresh {"refresh_token": "..."}
        │
        ├─> TokenRefreshSchema (validate)
        │
        ├─> TokenService.verify_token() → Decode JWT
        │
        ├─> TokenService.rotate_refresh_token() → Redis (check, invalidate, create new)
        │
        └─> TokenRefreshResponse
            └─> {access_token, refresh_token}
```

### Logout Flow
```
Client
  │
  └─> POST /logout {"refresh_token": "..."}
        │
        ├─> LogoutSchema (validate)
        │
        ├─> TokenService.invalidate_refresh_token() → Redis (delete)
        │
        └─> LogoutResponse
            └─> {message: "Logged out successfully"}
```

---

## 📦 Redis Data Structure

### Keys and Values
```
Redis Store
│
├── otp:{phone}
│   Type: String
│   Value: "123456"
│   TTL: 300 seconds (5 minutes)
│   Example: otp:+919876543210 = "456789"
│
├── otp_rate_limit:{phone}
│   Type: Sorted Set
│   Members: Unix timestamps
│   TTL: 600 seconds (10 minutes)
│   Example: otp_rate_limit:+919876543210
│            Score 1706123456.789 → "1706123456.789"
│            Score 1706123567.890 → "1706123567.890"
│
└── session:{worker_id}:{device_id}
    Type: Hash
    Fields:
      - token_hash: "a3f2b8c4..."
      - created_at: "2024-01-25T10:30:00"
      - last_used_at: "2024-01-25T10:30:00"
    TTL: 604800 seconds (7 days)
    Example: session:550e8400-e29b-41d4-a716-446655440000:device-abc123
```

---

## 🗄️ Database Schema

### PostgreSQL Tables
```sql
-- Workers Table
CREATE TABLE workers (
    id UUID PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);
CREATE INDEX idx_workers_phone ON workers(phone);

-- Worker Sessions Table
CREATE TABLE worker_sessions (
    id UUID PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES workers(id),
    device_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_worker_sessions_worker_device ON worker_sessions(worker_id, device_id);
```

---

## 🎯 Summary

### What You Have
```
✅ 7 source code files (~1,051 lines)
✅ 7 documentation files (~85.8 KB)
✅ 4 REST API endpoints
✅ 4 SMS provider implementations
✅ Complete authentication flow
✅ Security features implemented
✅ Production-ready code
```

### File Organization
```
Schemas     → Input validation & output formatting
Services    → Business logic & external integrations
Models      → Database persistence
Routers     → HTTP endpoints
Docs        → Comprehensive documentation
```

### Next Steps
```
1. Review OTP_AUTH_INDEX.md (start here)
2. Read OTP_INTEGRATION_CHECKLIST.md (integration)
3. Follow integration steps 1-9
4. Test endpoints
5. Deploy to production
```

---

**Built for Suraksha Weekly** • Guidewire DEVTrails 2026 🚀
