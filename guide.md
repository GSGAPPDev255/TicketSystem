# 🎯 NEXUS ESM MASTER GUIDE - Road to 10/10

**Project**: Nexus ESM Ticket System  
**Current Status**: 8/10 (Strong foundation, critical security gaps)  
**Goal**: Achieve 10/10 production-ready system  
**Database**: PostgreSQL 17.6 on Supabase (tyofjtbciywjtbyvqkja)  
**Region**: eu-central-1  

---

## 📚 TABLE OF CONTENTS

1. [Project Context](#project-context)
2. [Current System Analysis](#current-system-analysis)
3. [Database Schema Complete](#database-schema-complete)
4. [Critical Security Issues](#critical-security-issues)
5. [Complete Roadmap](#complete-roadmap)
6. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
7. [Code References](#code-references)
8. [Testing Checklist](#testing-checklist)
9. [Deployment Steps](#deployment-steps)

---

## 1️⃣ PROJECT CONTEXT

### What We're Building
**Nexus ESM** - A modern, multi-tenant IT service management ticketing system that competes with Zendesk, Freshdesk, and ServiceNow Express.

### Technology Stack

#### Frontend
```json
{
  "framework": "React 18.2.0",
  "buildTool": "Vite 5.0.8",
  "styling": "Tailwind CSS 3.4.0",
  "icons": "Lucide React 0.309.0",
  "charts": "Recharts 2.12.0",
  "stateManagement": "React Context API"
}
```

#### Backend
```json
{
  "database": "Supabase (PostgreSQL 17.6)",
  "authentication": "OAuth 2.0 (Microsoft Azure AD)",
  "emailService": "Azure Functions + Microsoft Graph API",
  "hosting": "Supabase (backend) + Vercel/Netlify (frontend recommended)"
}
```

#### API Layer (Azure Functions)
- `/api/email` - Email notification service
- `/api/users` - User management
- `/api/watchdog` - Monitoring service

### Project Structure
```
TicketSystem-main/
├── api/                          # Azure Functions
│   ├── email/
│   │   ├── index.js             # Email service via Microsoft Graph
│   │   └── function.json
│   ├── users/
│   └── watchdog/
├── src/
│   ├── App.jsx                  # Main application logic
│   ├── components/
│   │   └── ui.jsx               # Reusable UI components
│   ├── contexts/
│   │   ├── TenantContext.tsx    # Multi-tenant state management
│   │   └── ThemeContext.jsx     # Dark/light mode
│   ├── views/
│   │   ├── Dashboard.jsx        # Ticket overview
│   │   ├── NewTicket.jsx        # Ticket creation form
│   │   ├── Teams.jsx            # Department management
│   │   ├── Knowledge.jsx        # KB articles
│   │   ├── Settings.jsx         # System configuration
│   │   └── Tenants.jsx          # Tenant management
│   ├── lib/
│   │   └── supabase.js          # Supabase client config
│   ├── index.css                # Global styles
│   └── main.jsx                 # React entry point
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── .env                         # Environment variables
```

---

## 2️⃣ CURRENT SYSTEM ANALYSIS

### ✅ Strengths (Why we're at 8/10)

#### Architecture (9/10)
- Clean separation of concerns
- Modular component structure
- Context-based state management
- Proper use of React hooks
- Well-organized file structure

#### UI/UX (9/10)
- Beautiful glass morphism design (dark mode)
- Clean bento-box style (light mode)
- Fully responsive (mobile, tablet, desktop)
- Smooth animations and transitions
- Professional color system
- Accessible design patterns

#### Features (7/10)
- ✅ Multi-tenant architecture
- ✅ Role-based access control (5 levels)
- ✅ Automated email notifications
- ✅ Department transfers
- ✅ Activity logging
- ✅ Knowledge base
- ✅ Dark/light mode
- ✅ Friendly ticket IDs (MAR-26-0001)
- ⚠️ Missing: Real-time updates
- ⚠️ Missing: Advanced analytics
- ⚠️ Missing: SLA automation
- ⚠️ Missing: Bulk operations

#### Code Quality (7/10)
- ✅ Consistent naming conventions
- ✅ Good React patterns
- ✅ Proper error handling in API
- ✅ Environment variable usage
- ⚠️ Mixed JS/TS files
- ⚠️ Some hardcoded strings
- ⚠️ No error boundaries
- ⚠️ Limited form validation

### ⚠️ Critical Gaps (Why we're not 10/10)

#### Security (2/10) - CRITICAL
- ❌ RLS disabled on 8 tables
- ❌ Tenant isolation not enforced at DB level
- ❌ Leaked password protection disabled
- ❌ No input sanitization audit
- ❌ No rate limiting on APIs

#### Testing (0/10) - CRITICAL
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ❌ No test coverage reports

#### Documentation (3/10)
- ❌ No API documentation
- ❌ No user manual
- ❌ No developer onboarding guide
- ❌ No deployment guide
- ✅ Basic README exists

#### Production Readiness (6/10)
- ❌ No CI/CD pipeline
- ❌ No error logging/monitoring
- ❌ No performance monitoring
- ❌ No backup strategy documented
- ❌ No disaster recovery plan

---

## 3️⃣ DATABASE SCHEMA COMPLETE

### Tables Overview (9 tables, ~118 records)

#### 1. **tenants** (5 rows)
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  domain TEXT,
  status TEXT DEFAULT 'Active'
);
```
**Purpose**: Multi-tenant organization management  
**RLS Status**: ⚠️ DISABLED (Policies exist but not enabled)  
**Security Risk**: CRITICAL - All tenants exposed

#### 2. **profiles** (8 rows)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff',
  department TEXT,
  avatar_initials TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  username TEXT,
  website TEXT
);
```
**Purpose**: User profiles and authentication  
**RLS Status**: ✅ ENABLED (6 policies active)  
**Referenced by**: tickets, ticket_updates, department_members, tenant_access

#### 3. **tickets** (17 rows)
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  friendly_id INT4 DEFAULT nextval('tickets_friendly_id_seq'),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'New',
  priority TEXT DEFAULT 'Medium',
  category TEXT DEFAULT 'General',
  location TEXT,
  description TEXT,
  source TEXT DEFAULT 'portal',
  requester_id UUID REFERENCES profiles(id),
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  attachment_url TEXT,
  department_id UUID REFERENCES departments(id),
  tenant_id UUID REFERENCES tenants(id),
  ticket_number BIGINT DEFAULT nextval('tickets_ticket_number_seq'),
  sla_breached BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX idx_tickets_sla ON tickets(sla_due_at);
```
**Purpose**: Core support ticket records  
**RLS Status**: ⚠️ DISABLED  
**Security Risk**: CRITICAL - All tickets accessible to anyone

#### 4. **categories** (6 rows)
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'Briefcase',
  color TEXT DEFAULT 'text-slate-400',
  bg TEXT DEFAULT 'bg-slate-500/10',
  default_department_id UUID REFERENCES departments(id),
  department_ids UUID[] DEFAULT '{}'
);
```
**Purpose**: Ticket categorization  
**RLS Status**: ⚠️ DISABLED (Policies exist)  
**Missing**: tenant_id column

#### 5. **departments** (11 rows)
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  head_name TEXT,
  icon TEXT DEFAULT 'Users',
  color TEXT DEFAULT 'text-blue-400',
  bg TEXT DEFAULT 'bg-blue-500/10',
  central_group_id TEXT,
  team_email TEXT
);
```
**Purpose**: Team management  
**RLS Status**: ⚠️ DISABLED (Policies exist)  
**Missing**: tenant_id column

#### 6. **kb_articles** (4 rows)
```sql
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT,
  views INT4 DEFAULT 0,
  content TEXT
);
```
**Purpose**: Knowledge base  
**RLS Status**: ⚠️ DISABLED  
**Missing**: tenant_id, created_at, updated_at

#### 7. **department_members** (5 rows)
```sql
CREATE TABLE department_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id),
  user_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'Member',
  status TEXT DEFAULT 'online'
);
```
**Purpose**: Department membership tracking  
**RLS Status**: ⚠️ DISABLED (Policies exist)

#### 8. **tenant_access** (32 rows)
```sql
CREATE TABLE tenant_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id),
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
```
**Purpose**: User-tenant access control  
**RLS Status**: ⚠️ DISABLED (Policies exist)  
**Security Risk**: CRITICAL - Access control table itself exposed!

#### 9. **ticket_updates** (46 rows)
```sql
CREATE TABLE ticket_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id),
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Purpose**: Activity log and communication history  
**RLS Status**: ⚠️ DISABLED

### Entity Relationships
```
tenants (1) ──┬── (N) tenant_access (N) ── (1) profiles
              │
              └── (N) tickets
                      ├── (1) requester_id → profiles
                      ├── (1) assignee_id → profiles
                      ├── (1) department_id → departments
                      └── (N) ticket_updates → profiles

departments (1) ── (N) department_members (N) ── (1) profiles
            │
            └── (1) categories (default_department_id)

kb_articles (standalone)
```

---

## 4️⃣ CRITICAL SECURITY ISSUES

### 🚨 Issue #1: RLS Not Enabled (14 ERROR findings)

**Tables Affected**:
1. `tenants` - ⚠️ Organization data fully exposed
2. `tickets` - ⚠️ ALL tickets from ALL tenants accessible
3. `ticket_updates` - ⚠️ Activity logs exposed
4. `tenant_access` - ⚠️ Access control table ITSELF exposed (!)
5. `categories` - Configuration exposed
6. `departments` - Team data exposed
7. `kb_articles` - Knowledge base unprotected
8. `department_members` - Membership exposed

**Impact**:
- Any authenticated user can read data from ANY tenant
- Tenant isolation completely broken at database level
- Users can see tickets they shouldn't have access to
- Activity logs and sensitive communications exposed

**Current RLS Policies** (defined but not enforced):
```sql
-- profiles (ENABLED - Only table with working RLS)
✅ Allow users to read own profile
✅ Allow users to update own profile
✅ Allow users to insert own profile
✅ Admins can update any profile
✅ Admins can insert profiles
✅ Allow authenticated users to read profiles

-- tenants (DISABLED)
❌ Allow authenticated users to read tenants

-- categories (DISABLED)
❌ Read Categories
❌ Insert Categories
❌ Delete Categories

-- departments (DISABLED)
❌ Read Departments

-- department_members (DISABLED)
❌ Read Members
❌ Insert Members

-- tenant_access (DISABLED)
❌ Allow users to read own access
❌ Allow users to provision own access
```

### 🚨 Issue #2: Missing Tenant Isolation

**Tables without tenant_id**:
- `kb_articles` - Articles not tenant-specific
- `categories` - Categories not tenant-specific
- `departments` - Departments not tenant-specific

**Impact**: Shared resources between tenants (may be intentional but risky)

### 🚨 Issue #3: Authentication Weaknesses

**Leaked Password Protection**: DISABLED
- Passwords not checked against HaveIBeenPwned.org
- Users can set compromised passwords

**Function Security**:
- `handle_new_user()` has mutable search_path (warning level)

### 🚨 Issue #4: No Audit Trail

**Missing audit fields**:
- No `updated_at` on most tables
- No `updated_by` tracking
- No change history
- No soft deletes (`deleted_at`)

---

## 5️⃣ COMPLETE ROADMAP

### 🎯 Goal: From 8/10 to 10/10

```
Current State: 8/10
├─ Architecture: 9/10 ✅
├─ UI/UX: 9/10 ✅
├─ Features: 7/10 ⚠️
├─ Code Quality: 7/10 ⚠️
├─ Security: 2/10 ❌ CRITICAL
├─ Testing: 0/10 ❌ CRITICAL
├─ Documentation: 3/10 ❌
└─ Production Ready: 6/10 ⚠️

Target State: 10/10
├─ Architecture: 9/10 → Maintain
├─ UI/UX: 9/10 → Maintain  
├─ Features: 7/10 → 9/10 (Add real-time, analytics, SLA)
├─ Code Quality: 7/10 → 9/10 (TypeScript, tests, linting)
├─ Security: 2/10 → 10/10 (RLS, policies, audit)
├─ Testing: 0/10 → 9/10 (Unit, integration, E2E)
├─ Documentation: 3/10 → 9/10 (API docs, guides)
└─ Production Ready: 6/10 → 10/10 (CI/CD, monitoring)
```

### Timeline Overview

**Week 1: Emergency Security & Foundation**
- Day 1: RLS implementation
- Day 2-3: Tenant isolation fixes
- Day 4-5: Data integrity improvements

**Week 2: Features & Quality**
- Day 1-2: Real-time subscriptions
- Day 3-4: Advanced features (SLA, attachments)
- Day 5: Testing framework setup

**Week 3: Testing & Documentation**
- Day 1-3: Write tests (unit, integration)
- Day 4-5: Documentation (API, user guides)

**Week 4: Production Readiness**
- Day 1-2: CI/CD pipeline
- Day 3-4: Monitoring & logging
- Day 5: Final audit & launch prep

---

## 6️⃣ PHASE-BY-PHASE IMPLEMENTATION

### 🔴 PHASE 1: EMERGENCY SECURITY FIX (Day 1 - CRITICAL)

**Priority**: CRITICAL - Must be done immediately  
**Time Estimate**: 4-6 hours  
**Impact**: Closes 14 security vulnerabilities

#### Step 1.1: Enable RLS on All Tables
```sql
-- Enable RLS (this alone blocks all access until policies are set)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_updates ENABLE ROW LEVEL SECURITY;
```

#### Step 1.2: Create Tenant-Aware Policies for Tickets
```sql
-- Policy 1: Users can view tickets from their tenants
CREATE POLICY "Users can view own tenant tickets" ON tickets
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Users can create tickets in their tenants
CREATE POLICY "Users can create tickets in own tenant" ON tickets
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Staff can update tickets in their tenants
CREATE POLICY "Staff can update own tenant tickets" ON tickets
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
    AND auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('technician', 'manager', 'admin', 'super_admin')
    )
  );

-- Policy 4: Super admins can see all tickets
CREATE POLICY "Super admins see all tickets" ON tickets
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );
```

#### Step 1.3: Create Tenant-Aware Policies for Ticket Updates
```sql
-- Users can view updates for tickets they can access
CREATE POLICY "Users can view updates for accessible tickets" ON ticket_updates
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM tickets
      WHERE tenant_id IN (
        SELECT tenant_id 
        FROM tenant_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create updates on accessible tickets
CREATE POLICY "Users can create updates on accessible tickets" ON ticket_updates
  FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM tickets
      WHERE tenant_id IN (
        SELECT tenant_id 
        FROM tenant_access 
        WHERE user_id = auth.uid()
      )
    )
  );
```

#### Step 1.4: Enable Tenant Access RLS
```sql
-- Users can only see their own access records
CREATE POLICY "Users view own tenant access" ON tenant_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can see all access
CREATE POLICY "Super admins view all access" ON tenant_access
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );
```

#### Step 1.5: Simple Policies for Supporting Tables
```sql
-- Categories: Tenant-aware read (need to add tenant_id first - see Phase 2)
CREATE POLICY "Users can view categories" ON categories
  FOR SELECT
  USING (true);  -- Temporary open access, fix in Phase 2

-- Departments: Tenant-aware read
CREATE POLICY "Users can view departments" ON departments
  FOR SELECT
  USING (true);  -- Temporary open access, fix in Phase 2

-- KB Articles: Tenant-aware
CREATE POLICY "Users can view kb articles" ON kb_articles
  FOR SELECT
  USING (true);  -- Temporary open access, fix in Phase 2

-- Department Members: Tenant-aware
CREATE POLICY "Users can view department members" ON department_members
  FOR SELECT
  USING (true);  -- Temporary open access, fix in Phase 2
```

#### Step 1.6: Enable Leaked Password Protection
```
Action: Go to Supabase Dashboard
→ Authentication → Policies
→ Enable "Leaked password protection"
→ Enable "Check passwords against HaveIBeenPwned database"
```

#### Step 1.7: Testing Checklist
```
Test Plan:
[ ] Login as regular user → Can see only own tenant tickets
[ ] Login as different tenant user → Cannot see other tenant tickets
[ ] Try to access ticket by direct ID from wrong tenant → Blocked
[ ] Create new ticket → Works only for own tenant
[ ] Update ticket → Works only for accessible tickets
[ ] Super admin → Can see all tickets
[ ] Check API responses for unauthorized access attempts
```

---

### 🟡 PHASE 2: DATA INTEGRITY (Days 2-3)

**Priority**: HIGH  
**Time Estimate**: 8-12 hours  
**Impact**: Proper tenant isolation, audit trails, data quality

#### Step 2.1: Add Tenant ID to Missing Tables
```sql
-- Add tenant_id to categories
ALTER TABLE categories ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Backfill existing data (assign to first tenant or manually)
UPDATE categories SET tenant_id = (SELECT id FROM tenants LIMIT 1);

-- Make it required
ALTER TABLE categories ALTER COLUMN tenant_id SET NOT NULL;

-- Update RLS policy
DROP POLICY "Users can view categories" ON categories;
CREATE POLICY "Users can view own tenant categories" ON categories
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );

-- Repeat for departments
ALTER TABLE departments ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE departments SET tenant_id = (SELECT id FROM tenants LIMIT 1);
ALTER TABLE departments ALTER COLUMN tenant_id SET NOT NULL;

DROP POLICY "Users can view departments" ON departments;
CREATE POLICY "Users can view own tenant departments" ON departments
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );

-- Repeat for kb_articles
ALTER TABLE kb_articles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE kb_articles SET tenant_id = (SELECT id FROM tenants LIMIT 1);
ALTER TABLE kb_articles ALTER COLUMN tenant_id SET NOT NULL;

DROP POLICY "Users can view kb articles" ON kb_articles;
CREATE POLICY "Users can view own tenant kb articles" ON kb_articles
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );
```

#### Step 2.2: Add Audit Fields
```sql
-- Add updated_at to key tables
ALTER TABLE tickets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE categories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE departments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE kb_articles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE kb_articles ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_tickets_updated_at 
  BEFORE UPDATE ON tickets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at 
  BEFORE UPDATE ON kb_articles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Step 2.3: Add Soft Delete Support
```sql
-- Add deleted_at columns
ALTER TABLE tickets ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE departments ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE categories ADD COLUMN deleted_at TIMESTAMPTZ;

-- Update policies to exclude soft-deleted records
DROP POLICY "Users can view own tenant tickets" ON tickets;
CREATE POLICY "Users can view own tenant tickets" ON tickets
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );
```

#### Step 2.4: Add Missing Indexes
```sql
-- Performance indexes
CREATE INDEX idx_tickets_status ON tickets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_tenant_status ON tickets(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_ticket_updates_ticket_created ON ticket_updates(ticket_id, created_at DESC);
CREATE INDEX idx_department_members_user ON department_members(user_id);
CREATE INDEX idx_tenant_access_tenant ON tenant_access(tenant_id);
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_departments_tenant ON departments(tenant_id);
```

#### Step 2.5: Add Data Validation
```sql
-- Check constraints for valid statuses
ALTER TABLE tickets ADD CONSTRAINT valid_status 
  CHECK (status IN ('New', 'In Progress', 'Pending Vendor', 'Resolved', 'Closed'));

ALTER TABLE tickets ADD CONSTRAINT valid_priority 
  CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- Check constraint for valid roles
ALTER TABLE profiles ADD CONSTRAINT valid_role 
  CHECK (role IN ('user', 'technician', 'manager', 'admin', 'super_admin'));

-- Email format validation
ALTER TABLE profiles ADD CONSTRAINT valid_email 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

---

### 🟢 PHASE 3: ADVANCED FEATURES (Days 4-5)

**Priority**: MEDIUM  
**Time Estimate**: 10-14 hours  
**Impact**: Better UX, enterprise features

#### Step 3.1: Create Attachments Table
```sql
-- Multiple attachments per ticket
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);

-- RLS for attachments
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for accessible tickets" ON ticket_attachments
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM tickets
      WHERE tenant_id IN (
        SELECT tenant_id 
        FROM tenant_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Migrate existing attachment_url data
INSERT INTO ticket_attachments (ticket_id, file_url, file_name)
SELECT id, attachment_url, 'legacy_attachment'
FROM tickets 
WHERE attachment_url IS NOT NULL;

-- Drop old column (after verification)
-- ALTER TABLE tickets DROP COLUMN attachment_url;
```

#### Step 3.2: Create SLA Policies Table
```sql
-- SLA configuration per priority/category
CREATE TABLE sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  response_time_hours INT NOT NULL,
  resolution_time_hours INT NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sla_tenant_priority ON sla_policies(tenant_id, priority);

-- RLS for SLA policies
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant SLAs" ON sla_policies
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );

-- Insert default SLA policies
INSERT INTO sla_policies (tenant_id, name, priority, response_time_hours, resolution_time_hours)
SELECT 
  id,
  'Default ' || priority || ' SLA',
  priority,
  CASE priority
    WHEN 'Critical' THEN 1
    WHEN 'High' THEN 4
    WHEN 'Medium' THEN 8
    ELSE 24
  END,
  CASE priority
    WHEN 'Critical' THEN 4
    WHEN 'High' THEN 24
    WHEN 'Medium' THEN 72
    ELSE 168
  END
FROM tenants
CROSS JOIN (VALUES ('Critical'), ('High'), ('Medium'), ('Low')) AS priorities(priority);
```

#### Step 3.3: Create SLA Calculation Function
```sql
-- Function to calculate SLA due date
CREATE OR REPLACE FUNCTION calculate_sla_due(
  ticket_id_param UUID
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  ticket_record RECORD;
  sla_record RECORD;
  due_date TIMESTAMPTZ;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record FROM tickets WHERE id = ticket_id_param;
  
  -- Get matching SLA policy
  SELECT * INTO sla_record 
  FROM sla_policies 
  WHERE tenant_id = ticket_record.tenant_id
    AND priority = ticket_record.priority
    AND (category IS NULL OR category = ticket_record.category)
    AND active = true
  ORDER BY category NULLS LAST
  LIMIT 1;
  
  -- Calculate due date (excluding weekends - optional)
  due_date := ticket_record.created_at + (sla_record.resolution_time_hours || ' hours')::INTERVAL;
  
  RETURN due_date;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set SLA on ticket creation
CREATE OR REPLACE FUNCTION set_ticket_sla()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_due_at := calculate_sla_due(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sla_on_ticket_insert
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_sla();
```

#### Step 3.4: Create Email Templates Table
```sql
-- Customizable email templates per tenant
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'ticket_created', 'ticket_updated', etc.
  variables JSONB, -- Available variables for template
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_tenant_type ON email_templates(tenant_id, template_type);

-- RLS for templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant templates" ON email_templates
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );

-- Insert default templates
INSERT INTO email_templates (tenant_id, name, template_type, subject, body_html, variables)
SELECT 
  id,
  'New Ticket Notification',
  'ticket_created',
  'Ticket Created: {{ticket_id}}',
  '<div style="font-family: Arial, sans-serif;">
    <h3>New Ticket: {{ticket_id}}</h3>
    <p><strong>Subject:</strong> {{subject}}</p>
    <p><strong>Priority:</strong> {{priority}}</p>
    <p><strong>Description:</strong> {{description}}</p>
    <a href="{{dashboard_url}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a>
  </div>',
  '{"ticket_id": "string", "subject": "string", "priority": "string", "description": "string", "dashboard_url": "string"}'::jsonb
FROM tenants;
```

#### Step 3.5: Create User Preferences Table
```sql
-- User notification and display preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  email_on_ticket_assigned BOOLEAN DEFAULT true,
  email_on_ticket_updated BOOLEAN DEFAULT true,
  email_on_ticket_resolved BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS for preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 🔵 PHASE 4: REAL-TIME FEATURES (Week 2, Days 1-2)

**Priority**: MEDIUM  
**Time Estimate**: 8-10 hours  
**Impact**: Modern UX, live updates

#### Step 4.1: Enable Supabase Realtime
```sql
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

#### Step 4.2: Update React App for Realtime
```javascript
// src/hooks/useRealtimeTickets.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeTickets(tenantId) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchTickets();

    // Subscribe to changes
    const subscription = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('Ticket change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTickets(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new : t)
            );
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => 
              prev.filter(t => t.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId]);

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (!error) setTickets(data || []);
    setLoading(false);
  }

  return { tickets, loading, refresh: fetchTickets };
}
```

#### Step 4.3: Add Realtime Notifications
```javascript
// src/components/RealtimeNotifications.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bell } from 'lucide-react';

export function RealtimeNotifications({ userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const subscription = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_updates',
          filter: `user_id=neq.${userId}` // Not from current user
        },
        (payload) => {
          // Show notification for new updates on tickets user is involved in
          showNotification('New ticket update', payload.new.content);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [userId]);

  function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null; // Or render a notification bell with count
}
```

---

### 🟣 PHASE 5: TESTING INFRASTRUCTURE (Week 3, Days 1-3)

**Priority**: HIGH  
**Time Estimate**: 12-16 hours  
**Impact**: Code quality, bug prevention, confidence

#### Step 5.1: Setup Testing Framework
```bash
# Install testing dependencies
npm install --save-dev \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @vitest/ui
```

```javascript
// vite.config.js - Add test configuration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/']
    }
  }
});
```

```javascript
// src/tests/setup.js
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

#### Step 5.2: Write Unit Tests
```javascript
// src/tests/unit/TenantContext.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { TenantProvider, useTenant } from '../../contexts/TenantContext';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'admin' }
      }),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'tenant-1', name: 'Tenant A' },
          { id: 'tenant-2', name: 'Tenant B' }
        ]
      })
    }))
  }
}));

describe('TenantContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should load tenants on mount', async () => {
    const { result } = renderHook(() => useTenant(), {
      wrapper: TenantProvider
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tenants).toHaveLength(2);
    expect(result.current.currentTenant).toBeTruthy();
  });

  it('should persist tenant selection', async () => {
    const { result } = renderHook(() => useTenant(), {
      wrapper: TenantProvider
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newTenant = { id: 'tenant-2', name: 'Tenant B' };
    result.current.setCurrentTenant(newTenant);

    const stored = localStorage.getItem('nexus_active_tenant');
    expect(JSON.parse(stored)).toEqual(newTenant);
  });
});
```

```javascript
// src/tests/unit/TicketRow.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TicketRow } from '../../components/ui';

describe('TicketRow', () => {
  const mockTicket = {
    id: '123',
    subject: 'Test Ticket',
    priority: 'High',
    status: 'New',
    category: 'Hardware',
    requester: 'John Doe',
    created_at: '2026-01-01T00:00:00Z',
    ticket_number: 1
  };

  it('should render ticket information', () => {
    render(<TicketRow ticket={mockTicket} onClick={() => {}} />);
    
    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/JAN-26-0001/i)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<TicketRow ticket={mockTicket} onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Test Ticket'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should show correct priority badge', () => {
    render(<TicketRow ticket={mockTicket} onClick={() => {}} />);
    
    const badge = screen.getByText('High');
    expect(badge).toHaveClass('bg-orange-100'); // High priority color
  });
});
```

#### Step 5.3: Write Integration Tests
```javascript
// src/tests/integration/ticket-creation.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewTicketView from '../../views/NewTicket';

describe('Ticket Creation Flow', () => {
  const mockCategories = [
    { id: '1', label: 'Hardware' },
    { id: '2', label: 'Software' }
  ];

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should create ticket with all required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <NewTicketView 
        categories={mockCategories}
        kbArticles={[]}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill in form
    await user.type(screen.getByPlaceholderText(/brief description/i), 'Laptop not working');
    await user.type(screen.getByPlaceholderText(/detailed description/i), 'Screen is black');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Hardware');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'High');

    // Submit
    await user.click(screen.getByText(/submit ticket/i));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Laptop not working',
          description: 'Screen is black',
          category: 'Hardware',
          priority: 'High'
        })
      );
    });
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    
    render(
      <NewTicketView 
        categories={mockCategories}
        kbArticles={[]}
        onSubmit={mockOnSubmit}
      />
    );

    // Try to submit without filling fields
    await user.click(screen.getByText(/submit ticket/i));

    // Should not call submit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

#### Step 5.4: Add E2E Tests with Playwright
```bash
# Install Playwright
npm install --save-dev @playwright/test
npx playwright install
```

```javascript
// tests/e2e/ticket-workflow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Ticket Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login (mock or real Azure AD)
    await page.goto('http://localhost:5173');
    // ... authentication steps
  });

  test('should create and view ticket', async ({ page }) => {
    // Navigate to new ticket
    await page.click('text=New Ticket');
    
    // Fill form
    await page.fill('[placeholder*="brief description"]', 'Test Ticket');
    await page.fill('[placeholder*="detailed description"]', 'This is a test');
    await page.selectOption('select[name="category"]', 'Hardware');
    
    // Submit
    await page.click('button:has-text("Submit Ticket")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Should see new ticket
    await expect(page.locator('text=Test Ticket')).toBeVisible();
  });

  test('should assign ticket to user', async ({ page }) => {
    // Click on a ticket
    await page.click('text=Test Ticket');
    
    // Assign to user
    await page.selectOption('select[aria-label="Assignee"]', 'John Doe');
    
    // Should show success indicator
    await expect(page.locator('text=Assigned to John Doe')).toBeVisible();
    
    // Status should change
    await expect(page.locator('text=In Progress')).toBeVisible();
  });
});
```

#### Step 5.5: Add Test Scripts to package.json
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

### 🟠 PHASE 6: DOCUMENTATION (Week 3, Days 4-5)

**Priority**: MEDIUM  
**Time Estimate**: 8-10 hours  
**Impact**: Onboarding, maintainability, professional image

#### Step 6.1: API Documentation
```markdown
<!-- docs/API.md -->
# Nexus ESM API Documentation

## Authentication
All API requests require authentication via Supabase JWT tokens.

### Headers
```
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

## Endpoints

### Tickets

#### GET /rest/v1/tickets
Retrieve tickets for the current user's tenant.

**Query Parameters:**
- `tenant_id=eq.<uuid>` - Filter by tenant
- `status=eq.<string>` - Filter by status
- `priority=eq.<string>` - Filter by priority
- `assignee_id=eq.<uuid>` - Filter by assignee
- `order=created_at.desc` - Sort order

**Example Request:**
```bash
curl -X GET \
  'https://tyofjtbciywjtbyvqkja.supabase.co/rest/v1/tickets?tenant_id=eq.123&order=created_at.desc' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

**Example Response:**
```json
[
  {
    "id": "uuid",
    "ticket_number": 1,
    "subject": "Laptop not working",
    "description": "Screen is black",
    "status": "New",
    "priority": "High",
    "category": "Hardware",
    "requester_id": "uuid",
    "assignee_id": null,
    "tenant_id": "uuid",
    "created_at": "2026-03-03T10:00:00Z"
  }
]
```

[Continue with all endpoints...]
```

#### Step 6.2: User Manual
```markdown
<!-- docs/USER_GUIDE.md -->
# Nexus ESM User Guide

## Getting Started

### Logging In
1. Navigate to your Nexus ESM URL
2. Click "Sign in with Microsoft"
3. Enter your work credentials
4. You'll be redirected to the dashboard

### Creating Your First Ticket

#### Step 1: Navigate to New Ticket
Click the "New Ticket" button in the sidebar or press the "+" icon.

#### Step 2: Fill in Details
- **Subject**: Brief description (e.g., "Printer not working")
- **Description**: Detailed explanation of the issue
- **Category**: Select the type of issue (Hardware, Software, etc.)
- **Priority**: How urgent is this?
  - **Critical**: System down, blocking work
  - **High**: Significant impact, needs quick attention
  - **Medium**: Important but not urgent
  - **Low**: Minor issue or feature request
- **Location**: Where you are (office, room number, etc.)

#### Step 3: Add Attachments (Optional)
Click the attachment icon to add screenshots or files.

#### Step 4: Submit
Click "Submit Ticket" and you'll receive a confirmation email.

### Tracking Your Tickets

#### Dashboard View
Your dashboard shows:
- **Total Tickets**: All tickets you've created
- **Open Tickets**: Currently being worked on
- **Resolved**: Fixed issues
- **Response Time**: Average time to first response

#### My Queue
Shows only tickets assigned to you (for staff members).

### Working with Tickets

#### Viewing Ticket Details
Click any ticket to see:
- Full description
- Activity history
- Current status and assignee
- All comments and updates

#### Adding Comments
1. Click on a ticket
2. Scroll to "Add Update" section
3. Type your message
4. Click "Post Update"
5. Relevant parties will be notified via email

### Status Meanings
- **New**: Just created, awaiting review
- **In Progress**: Being actively worked on
- **Pending Vendor**: Waiting on external party
- **Resolved**: Issue fixed, awaiting confirmation
- **Closed**: Confirmed resolved

[Continue with more sections...]
```

#### Step 6.3: Developer Onboarding Guide
```markdown
<!-- docs/DEVELOPER_ONBOARDING.md -->
# Developer Onboarding Guide

## Prerequisites
- Node.js 18+ installed
- Git installed
- Supabase account
- Azure account (for OAuth and functions)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/TicketSystem.git
cd TicketSystem
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Start Development Server
```bash
npm run dev
```

Application will run on `http://localhost:5173`

## Project Structure

### Key Directories
```
src/
├── App.jsx                 # Main app component, routing logic
├── components/
│   └── ui.jsx             # Reusable UI components
├── contexts/              # React Context providers
├── views/                 # Page-level components
├── lib/                   # Utilities, Supabase client
└── tests/                 # Test files
```

### Code Organization Principles
1. **Components**: Reusable UI elements in `components/`
2. **Views**: Page-level logic in `views/`
3. **Contexts**: Global state in `contexts/`
4. **One component per file** (exception: ui.jsx for related components)

## Database Access

### Local Development
Use Supabase Studio (web UI) for:
- Viewing data
- Running queries
- Testing RLS policies

### SQL Queries
```bash
# Via Supabase CLI
supabase db dump -f schema.sql

# Via psql
psql -h db.tyofjtbciywjtbyvqkja.supabase.co -U postgres
```

## Testing

### Run Unit Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run E2E Tests
```bash
npm run test:e2e
```

## Common Tasks

### Adding a New View
1. Create file in `src/views/YourView.jsx`
2. Add route in `App.jsx`:
```javascript
case 'your-view':
  return <YourView />;
```
3. Add menu item in sidebar
4. Add necessary permissions check

### Adding a Database Table
1. Write migration in Supabase Studio
2. Enable RLS
3. Create policies
4. Update TypeScript types (if using)
5. Test policies thoroughly

### Adding a New API Endpoint
1. Create folder in `api/`
2. Add `function.json` and `index.js`
3. Deploy to Azure Functions
4. Update frontend to call new endpoint

## Troubleshooting

### "Permission Denied" Errors
- Check RLS policies in Supabase
- Verify user has tenant_access record
- Check role permissions

### Email Not Sending
- Verify Azure credentials in environment
- Check Azure Function logs
- Verify Microsoft Graph API permissions

[Continue...]
```

---

### ⚪ PHASE 7: CI/CD & MONITORING (Week 4, Days 1-3)

**Priority**: HIGH for production  
**Time Estimate**: 10-12 hours  
**Impact**: Automated deployments, error tracking, uptime

#### Step 7.1: GitHub Actions CI/CD
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Build application
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          BASE_URL: https://your-production-url.com

  database-migrations:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run migrations
        run: |
          npm install -g supabase
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
```

#### Step 7.2: Error Monitoring with Sentry
```bash
# Install Sentry
npm install --save @sentry/react @sentry/tracing
```

```javascript
// src/lib/sentry.js
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [new BrowserTracing()],
      tracesSampleRate: 1.0,
      environment: import.meta.env.MODE,
      beforeSend(event, hint) {
        // Don't send events from development
        if (window.location.hostname === 'localhost') {
          return null;
        }
        return event;
      }
    });
  }
}

// Usage in main.jsx
import { initSentry } from './lib/sentry';
initSentry();
```

#### Step 7.3: Performance Monitoring
```javascript
// src/lib/analytics.js
export class PerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  // Track page load time
  trackPageLoad() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      this.sendMetric('page_load', loadTime);
    }
  }

  // Track API response time
  async trackAPICall(name, apiCall) {
    const start = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      this.sendMetric(`api_${name}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.sendMetric(`api_${name}_error`, duration);
      throw error;
    }
  }

  sendMetric(name, value) {
    // Send to your analytics service
    console.log(`[Metric] ${name}: ${value}ms`);
    
    // Example: Send to custom backend
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value, timestamp: Date.now() })
    }).catch(err => console.error('Failed to send metric', err));
  }
}

export const perfMonitor = new PerformanceMonitor();
```

#### Step 7.4: Uptime Monitoring
```yaml
# config/uptime-monitoring.yml
# Use a service like UptimeRobot, Pingdom, or Better Uptime

monitors:
  - name: "Nexus ESM - Frontend"
    url: "https://your-app.com"
    interval: 5 # minutes
    expected_status: 200
    alert_contacts:
      - email: dev-team@company.com
      - slack: "#alerts"
  
  - name: "Nexus ESM - API Health"
    url: "https://your-app.com/api/health"
    interval: 5
    expected_status: 200
  
  - name: "Supabase Database"
    url: "https://tyofjtbciywjtbyvqkja.supabase.co/rest/v1/"
    interval: 5
    expected_status: 200
```

#### Step 7.5: Logging Strategy
```javascript
// src/lib/logger.js
class Logger {
  constructor() {
    this.logLevel = import.meta.env.VITE_LOG_LEVEL || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, meta);
      this.sendToRemote('error', message, meta);
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, meta);
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, meta);
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  sendToRemote(level, message, meta) {
    if (import.meta.env.PROD) {
      // Send to logging service (e.g., Logtail, Datadog)
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          meta,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      }).catch(() => {
        // Fail silently - don't break the app if logging fails
      });
    }
  }
}

export const logger = new Logger();
```

---

### 🟤 PHASE 8: FINAL POLISH (Week 4, Days 4-5)

**Priority**: MEDIUM  
**Time Estimate**: 6-8 hours  
**Impact**: User experience refinements

#### Step 8.1: Add Loading States
```javascript
// src/components/LoadingSpinner.jsx
export function LoadingSpinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}></div>
    </div>
  );
}

// src/components/LoadingOverlay.jsx
export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-2xl">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
```

#### Step 8.2: Add Error Boundaries
```javascript
// src/components/ErrorBoundary.jsx
import React from 'react';
import { logger } from '../lib/logger';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React Error Boundary caught error', {
      error: error.toString(),
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md p-8 bg-white dark:bg-slate-900 rounded-xl shadow-xl">
            <h2 className="text-2xl font-bold text-rose-600 mb-4">Oops! Something went wrong</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              We've been notified and are looking into it. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### Step 8.3: Add Toast Notifications
```javascript
// src/components/ToastNotification.jsx
import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  return { toasts, showToast };
}

export function ToastContainer({ toasts, onClose }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  };

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500'
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-in slide-in-from-right`}
          >
            <Icon size={20} />
            <p className="flex-1">{toast.message}</p>
            <button onClick={() => onClose(toast.id)} className="hover:bg-white/20 rounded p-1">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

#### Step 8.4: Improve Form Validation
```javascript
// src/lib/validation.js
export const validators = {
  required: (value) => {
    if (!value || value.trim() === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  }
};

export function validateForm(values, rules) {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = values[field];
    
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        break; // Stop at first error
      }
    }
  });
  
  return errors;
}

// Usage example
const formRules = {
  subject: [validators.required, validators.minLength(5)],
  description: [validators.required, validators.minLength(20)],
  email: [validators.required, validators.email]
};

const errors = validateForm(formData, formRules);
```

#### Step 8.5: Add Keyboard Shortcuts
```javascript
// src/hooks/useKeyboardShortcuts.js
import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for modifier keys
      const modifiers = {
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey
      };

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        const matches = 
          (!shortcut.ctrl || modifiers.ctrl) &&
          (!shortcut.shift || modifiers.shift) &&
          (!shortcut.alt || modifiers.alt) &&
          shortcut.key.toLowerCase() === e.key.toLowerCase();

        if (matches) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Usage in App
useKeyboardShortcuts([
  {
    key: 'n',
    ctrl: true,
    action: () => setActiveView('new-ticket'),
    description: 'Create new ticket'
  },
  {
    key: 'd',
    ctrl: true,
    action: () => setActiveView('dashboard'),
    description: 'Go to dashboard'
  },
  {
    key: '/',
    action: () => document.querySelector('input[type="search"]')?.focus(),
    description: 'Focus search'
  }
]);
```

---

## 7️⃣ CODE REFERENCES

### Key Files and Their Purpose

#### Frontend Core
```
src/App.jsx (412 lines)
├─ Authentication & session management
├─ Route handling (7 views)
├─ Sidebar component (tenant selector, navigation)
├─ Auto-provisioning logic (checkAndProvisionAccess)
├─ Ticket creation with email notifications
└─ Main application state management

src/components/ui.jsx (615 lines)
├─ GlassCard component (reusable styled container)
├─ StatCard component (dashboard statistics)
├─ TicketRow component (ticket list item)
├─ TicketDetailView component (complete ticket interface)
│   ├─ Real-time activity log
│   ├─ Assignment controls
│   ├─ Department transfer dropdown
│   ├─ Status management with resolution modal
│   └─ Update posting with email notifications
└─ Modal component (reusable dialog)

src/contexts/TenantContext.tsx (130 lines)
├─ Multi-tenant state management
├─ Secure tenant fetching (user-specific access)
├─ Tenant persistence (localStorage)
└─ Access validation on tenant switch

src/contexts/ThemeContext.jsx
├─ Dark/light mode toggle
└─ Theme persistence

src/views/
├─ Dashboard.jsx - Ticket overview and statistics
├─ NewTicket.jsx - Ticket creation form with KB suggestions
├─ Teams.jsx - Department management
├─ Knowledge.jsx - KB article CRUD
├─ Settings.jsx - System configuration
└─ Tenants.jsx - Tenant management (super admin only)
```

#### Backend (Azure Functions)
```
api/email/index.js (100 lines)
├─ OAuth token acquisition (Azure AD)
├─ Microsoft Graph API integration
├─ HTML email sending
└─ Error handling and logging

api/users/index.js
└─ User management operations

api/watchdog/index.js
└─ Monitoring and health checks
```

### Critical Code Sections

#### Auto-Provisioning Logic (App.jsx lines 150-250)
```javascript
const checkAndProvisionAccess = async (user) => {
  // 1. Check if profile exists
  // 2. Create profile if new user
  // 3. Determine tenant from email domain
  // 4. Grant tenant access
  // 5. Fetch user's tenants
  // 6. Set active tenant
}
```

#### Ticket Creation with Emails (App.jsx lines 300-458)
```javascript
const handleCreateTicket = async (formData) => {
  // 1. Insert ticket into database
  // 2. Get friendly ID (MAR-26-0001)
  // 3. Send email to department
  // 4. Send confirmation to requester
  // 5. Handle attachments
  // 6. Redirect to dashboard
}
```

#### Department Transfer (ui.jsx lines 469-483)
```javascript
const handleDeptChange = async (newDeptId) => {
  // 1. Update ticket.department_id
  // 2. Log transfer message
  // 3. Update email context for future replies
}
```

#### RLS Policy Examples (To be implemented)
```sql
-- Template for tenant-aware policies
CREATE POLICY "policy_name" ON table_name
  FOR operation
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_access 
      WHERE user_id = auth.uid()
    )
  );
```

---

## 8️⃣ TESTING CHECKLIST

### Pre-Deployment Testing

#### Security Tests
- [ ] Test RLS policies for each role
- [ ] Verify tenant isolation (user can't access other tenant data)
- [ ] Test super admin access to all tenants
- [ ] Verify leaked password protection works
- [ ] Test CSRF protection
- [ ] Audit all user inputs for XSS vulnerabilities

#### Functionality Tests
- [ ] Create ticket as regular user
- [ ] Assign ticket as staff
- [ ] Transfer ticket between departments
- [ ] Update ticket status
- [ ] Resolve ticket with notes
- [ ] Close ticket
- [ ] Add ticket comments
- [ ] Upload attachments
- [ ] Search tickets
- [ ] Filter tickets by status/priority
- [ ] Switch between tenants (if multi-tenant user)

#### Email Tests
- [ ] New ticket email to requester
- [ ] New ticket email to department
- [ ] Status update emails
- [ ] Resolution emails
- [ ] Reply notification emails
- [ ] Department transfer notification

#### Performance Tests
- [ ] Dashboard load time < 2 seconds
- [ ] Ticket list with 1000+ tickets
- [ ] Concurrent user access (10+ users)
- [ ] Large attachment uploads (10MB+)
- [ ] Database query performance

#### UI/UX Tests
- [ ] Mobile responsiveness (< 768px)
- [ ] Tablet layout (768px - 1024px)
- [ ] Desktop experience (> 1024px)
- [ ] Dark mode consistency
- [ ] Light mode consistency
- [ ] Loading states display correctly
- [ ] Error messages are helpful
- [ ] Form validation works
- [ ] Keyboard navigation

#### Browser Compatibility
- [ ] Chrome/Edge (Chromium) - Latest
- [ ] Firefox - Latest
- [ ] Safari - Latest
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

#### Accessibility Tests
- [ ] Screen reader compatibility
- [ ] Keyboard-only navigation
- [ ] WCAG 2.1 AA compliance
- [ ] Color contrast ratios
- [ ] Focus indicators visible

---

## 9️⃣ DEPLOYMENT STEPS

### Production Deployment Checklist

#### Pre-Deployment
- [ ] Run full test suite
- [ ] Check code coverage > 80%
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Database migrations tested
- [ ] Backup current database
- [ ] Document rollback plan

#### Environment Setup
- [ ] Production Supabase project created
- [ ] Azure Functions deployed
- [ ] Environment variables configured
- [ ] OAuth credentials set up
- [ ] Email service configured
- [ ] CDN configured (if using)
- [ ] SSL certificates installed

#### Database Migration
```bash
# 1. Backup production database
supabase db dump -f backup-$(date +%Y%m%d).sql

# 2. Review migration scripts
cat migrations/*.sql

# 3. Apply migrations
supabase db push

# 4. Verify RLS policies enabled
supabase db remote ls policies

# 5. Run post-migration tests
npm run test:integration
```

#### Frontend Deployment
```bash
# 1. Build production bundle
npm run build

# 2. Test production build locally
npm run preview

# 3. Deploy to hosting (example: Vercel)
vercel --prod

# 4. Verify deployment
curl -I https://your-app.com
```

#### Post-Deployment
- [ ] Smoke tests on production
- [ ] Verify authentication works
- [ ] Test core workflows
- [ ] Check error monitoring
- [ ] Verify email sending
- [ ] Monitor performance metrics
- [ ] Update documentation
- [ ] Notify stakeholders

#### Rollback Procedure (if needed)
```bash
# 1. Revert to previous frontend version
vercel rollback

# 2. Restore database backup (if DB changed)
psql -h db.supabase.co -U postgres -d postgres < backup-20260303.sql

# 3. Revert Azure Functions
az functionapp deployment source config-zip \
  --resource-group YourRG \
  --name YourFunctionApp \
  --src previous-deployment.zip
```

---

## 🎯 SUCCESS METRICS

### How to Know We've Reached 10/10

#### Security (Must achieve 10/10)
- ✅ All 14 RLS errors resolved
- ✅ Zero security vulnerabilities in audit
- ✅ Penetration test passed
- ✅ All user inputs sanitized
- ✅ Rate limiting in place

#### Performance (Target: 9/10)
- ✅ Dashboard loads in < 2 seconds
- ✅ Ticket search < 500ms
- ✅ API responses < 1 second
- ✅ Lighthouse score > 90

#### Testing (Target: 9/10)
- ✅ Code coverage > 80%
- ✅ All critical paths tested
- ✅ E2E tests for main workflows
- ✅ No known bugs in production

#### Documentation (Target: 9/10)
- ✅ Complete API documentation
- ✅ User manual available
- ✅ Developer onboarding guide
- ✅ Architecture diagrams
- ✅ Database schema docs

#### Production Ready (Target: 10/10)
- ✅ CI/CD pipeline operational
- ✅ Error monitoring active
- ✅ Uptime monitoring configured
- ✅ Backup strategy implemented
- ✅ Disaster recovery tested

---

## 📝 NOTES & TIPS

### Database Best Practices
1. **Always test RLS policies** in development before production
2. **Use migrations** for all schema changes (don't edit directly)
3. **Index foreign keys** for better query performance
4. **Soft delete** instead of hard delete for audit trail
5. **Use transactions** for operations that span multiple tables

### React Best Practices
1. **Memo expensive components** with React.memo()
2. **Use React.lazy()** for code splitting
3. **Avoid prop drilling** - use Context or state management
4. **Keep components pure** - no side effects in render
5. **Handle loading and error states** for all async operations

### Security Best Practices
1. **Never trust client-side validation** - always validate on server
2. **Use environment variables** for all secrets
3. **Implement rate limiting** on all API endpoints
4. **Log all security-relevant events**
5. **Keep dependencies updated** - run `npm audit` regularly

### Performance Best Practices
1. **Lazy load images** and components
2. **Debounce search inputs** (300-500ms)
3. **Paginate large lists** (50-100 items per page)
4. **Use indexes** on frequently queried columns
5. **Cache API responses** when appropriate

---

## 🚀 QUICK START FOR NEW CONVERSATION

If you need to continue this work in a new chat, provide Claude with:

1. **This MASTER_GUIDE.md file** - Contains everything
2. **Current phase you're on** - e.g., "We're starting Phase 2"
3. **Any blockers encountered** - Issues you've faced
4. **Access info** - Supabase project ID, GitHub repo link

Example prompt:
```
Hi Claude! I'm continuing work on Nexus ESM. We've completed Phase 1 
(RLS implementation) and are now starting Phase 2 (Data Integrity). 
Here's our master guide: [attach MASTER_GUIDE.md]

Current status:
- RLS enabled on all tables ✅
- Tenant-aware policies implemented ✅
- Need to add tenant_id to categories, departments, kb_articles

Database: tyofjtbciywjtbyvqkja.supabase.co
GitHub: github.com/your-org/TicketSystem

Can you help me with Step 2.1?
```

---

## 🎓 LEARNING RESOURCES

### Supabase
- [RLS Policies Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime)
- [Storage for File Uploads](https://supabase.com/docs/guides/storage)

### React & Testing
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright E2E Testing](https://playwright.dev/)

### Azure
- [Azure Functions JavaScript Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)

---

*End of Master Guide*  
*Version: 1.0*  
*Last Updated: March 3, 2026*  
*Project: Nexus ESM Ticket System*

---

**Remember**: This is a living document. Update it as you progress through phases and learn new optimizations!

🎯 **Goal**: Transform from 8/10 to 10/10  
🚀 **Timeline**: 4 weeks  
✨ **Outcome**: Production-ready enterprise ticket system
