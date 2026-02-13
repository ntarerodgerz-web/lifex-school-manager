/**
 * Database Migration Script
 * Creates all tables for the School Manager multi-tenant SaaS platform.
 * Run: npm run migrate
 */
const { pool } = require('./db');
const logger = require('../utils/logger');

const migration = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  motto VARCHAR(500),
  address TEXT,
  district VARCHAR(100),
  region VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Uganda',
  phone VARCHAR(30),
  email VARCHAR(255) UNIQUE,
  logo_url TEXT,
  badge_url TEXT,
  subscription_status VARCHAR(30) DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired','suspended')),
  plan_type VARCHAR(30) DEFAULT 'starter'
    CHECK (plan_type IN ('starter','standard','pro')),
  trial_ends_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHOOL BRANDING (per-school theme customisation)
-- ============================================================
CREATE TABLE IF NOT EXISTS school_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  primary_color VARCHAR(10) DEFAULT '#1e3a5f',
  secondary_color VARCHAR(10) DEFAULT '#f0ad4e',
  font_family VARCHAR(100) DEFAULT 'Inter',
  font_style VARCHAR(100) DEFAULT 'normal',
  header_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ============================================================
-- USERS (all roles live here, discriminated by role)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL
    CHECK (role IN ('SUPER_ADMIN','SCHOOL_ADMIN','TEACHER','PARENT')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================
-- CLASSES
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  section VARCHAR(50),
  capacity INT DEFAULT 40,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);

-- ============================================================
-- TEACHERS (extends users with teacher-specific fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_number VARCHAR(50),
  qualification VARCHAR(255),
  specialization VARCHAR(255),
  date_joined DATE,
  nin VARCHAR(50),
  salary NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);

-- ============================================================
-- TEACHER_SUBJECTS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- ============================================================
-- PUPILS
-- ============================================================
CREATE TABLE IF NOT EXISTS pupils (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  other_names VARCHAR(100),
  gender VARCHAR(10) CHECK (gender IN ('Male','Female')),
  date_of_birth DATE,
  admission_number VARCHAR(50),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  photo_url TEXT,
  -- Contact & residence
  address TEXT,
  district VARCHAR(100),
  -- Background
  nationality VARCHAR(50) DEFAULT 'Ugandan',
  religion VARCHAR(50),
  -- Previous school
  previous_school VARCHAR(255),
  previous_class VARCHAR(100),
  reason_for_leaving TEXT,
  -- Health
  medical_notes TEXT,
  blood_group VARCHAR(5),
  allergies TEXT,
  disabilities TEXT,
  -- Emergency contact
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(30),
  emergency_contact_relationship VARCHAR(50),
  -- Enrollment
  enrollment_type VARCHAR(20) DEFAULT 'new'
    CHECK (enrollment_type IN ('new','transfer','repeating')),
  enrolled_at DATE DEFAULT CURRENT_DATE,
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_boarding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pupils_school ON pupils(school_id);
CREATE INDEX IF NOT EXISTS idx_pupils_class ON pupils(class_id);

-- ============================================================
-- PARENTS (extends users with parent-specific fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occupation VARCHAR(255),
  address TEXT,
  relationship VARCHAR(50) DEFAULT 'Parent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_parents_school ON parents(school_id);

-- ============================================================
-- PUPIL_PARENTS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS pupil_parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pupil_id, parent_id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'present'
    CHECK (status IN ('present','absent','late','excused')),
  recorded_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pupil_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_pupil ON attendance(pupil_id);

-- ============================================================
-- ASSESSMENTS / GRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  term VARCHAR(20),
  academic_year VARCHAR(20),
  score NUMERIC(5,2),
  grade VARCHAR(5),
  remarks TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessments_school ON assessments(school_id);

-- ============================================================
-- FEES
-- ============================================================
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  name VARCHAR(150) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  term VARCHAR(20),
  academic_year VARCHAR(20),
  due_date DATE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fees_school ON fees(school_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  fee_id UUID REFERENCES fees(id),
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash'
    CHECK (payment_method IN ('cash','mobile_money','bank_transfer','other')),
  reference_number VARCHAR(100),
  payment_date DATE DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_school ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_pupil ON payments(pupil_id);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(30) DEFAULT 'all'
    CHECK (audience IN ('all','teachers','parents','class')),
  target_class_id UUID REFERENCES classes(id),
  posted_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================================
-- SUBSCRIPTIONS (billing history)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_type VARCHAR(30) NOT NULL,
  amount NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'UGX',
  status VARCHAR(30) DEFAULT 'active'
    CHECK (status IN ('active','expired','cancelled','pending')),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_reference VARCHAR(255),
  pesapal_order_id VARCHAR(100),
  pesapal_tracking_id VARCHAR(100),
  pesapal_payment_method VARCHAR(50),
  payment_status VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_school ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pesapal ON subscriptions(pesapal_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tracking ON subscriptions(pesapal_tracking_id);

-- ============================================================
-- BROADCASTS (SUPER_ADMIN system-wide messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  target VARCHAR(30) DEFAULT 'all'
    CHECK (target IN ('all','school_admins','teachers','parents')),
  target_school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  posted_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_broadcasts_target ON broadcasts(target);

-- ============================================================
-- AUDIT LOG (future-ready)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_school ON audit_logs(school_id);

-- ============================================================
-- FIX: Ensure subscriptions status constraint includes 'pending'
-- (Needed because original table may have been created without it)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_status_check') THEN
    ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active','expired','cancelled','pending'));
END $$;

-- ============================================================
-- CAMPUSES (for multi-campus support — Pro plan)
-- ============================================================
CREATE TABLE IF NOT EXISTS campuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  district VARCHAR(100),
  region VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(255),
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name),
  UNIQUE(school_id, code)
);
CREATE INDEX IF NOT EXISTS idx_campuses_school ON campuses(school_id);

-- Add campus_id to classes table for campus assignment
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='campus_id') THEN
        ALTER TABLE classes ADD COLUMN campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_classes_campus ON classes(campus_id);

-- ============================================================
-- SMS_LOGS (for tracking SMS notifications — Pro plan)
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','partial')),
  provider_response JSONB,
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_logs_school ON sms_logs(school_id);

-- ============================================================
-- API_KEYS (for programmatic access — Pro plan)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  permissions JSONB DEFAULT '["read"]',
  rate_limit INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_school ON api_keys(school_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
`;

async function runMigration() {
  try {
    logger.info('Running database migration...');
    await pool.query(migration);
    logger.info('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

