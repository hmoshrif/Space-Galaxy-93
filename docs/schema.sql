-- ═══════════════════════════════════════════════════════════════════════════
-- منصة «نضج» — مخطط قاعدة بيانات PostgreSQL متعدد المستأجرين (Production v2)
-- يطبّق: فصل قوي بين العملاء (RLS) · تجميد Snapshot (P4) · سجل تدقيق Append-only
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ─── المستأجرون (فصل العملاء) ───
CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  sector       TEXT,
  data_region  TEXT DEFAULT 'ksa-central',   -- سيادة البيانات
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  mfa_enabled   BOOLEAN NOT NULL DEFAULT false,
  sso_subject   TEXT,                          -- ربط SSO / النفاذ الوطني
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الدور داخل المؤسسة (org_admin/assessor/reviewer/executive/auditor/…)
CREATE TABLE memberships (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL CHECK (role IN
             ('platform_admin','org_admin','assessment_manager','assessor','reviewer','participant','executive','auditor')),
  UNIQUE (org_id, user_id, role)
);

-- ─── النماذج وإصداراتها (المصدر المتغيّر) ───
CREATE TABLE assessment_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID REFERENCES organizations(id),    -- NULL = قالب منصة عام
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE template_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  weights       JSONB NOT NULL,                     -- أوزان الأنواع (شفافية)
  body          JSONB NOT NULL,                     -- المجالات/القدرات/الأسئلة/المعايير
  published_at  TIMESTAMPTZ,
  UNIQUE (template_id, version)
);

-- ─── التقييمات — تجميد Snapshot ثابت (P4) ───
CREATE TABLE assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  config            JSONB NOT NULL,                 -- معالج الإعداد
  model_snapshot    JSONB NOT NULL,                 -- نسخة النموذج المجمّدة وقت الإطلاق
  scoring_version   TEXT NOT NULL,                  -- إصدار معادلة الاحتساب
  status            TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress','under_review','completed','archived')),
  launched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE TABLE participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id),
  role           TEXT NOT NULL,
  is_anonymous   BOOLEAN NOT NULL DEFAULT false      -- استبيان الإدراك السري
);

-- ─── الإجابات + الأدلة + قرارات المراجعة (الدرجة قبل/بعد) ───
CREATE TABLE responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL,                     -- يشير داخل الـ snapshot
  proposed_score  SMALLINT,                          -- قد يكون NULL لـ«لا ينطبق»
  applicable      BOOLEAN NOT NULL DEFAULT true,     -- «لا ينطبق»
  confidence      SMALLINT,
  comment         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','returned')),
  final_score     SMALLINT,                          -- بعد اعتماد المراجع
  reviewed_before SMALLINT,                          -- الدرجة قبل التعديل
  reviewer_id     UUID REFERENCES users(id),
  review_note     TEXT,
  approved_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);

CREATE TABLE evidence_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id   UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  owner         TEXT,
  doc_date      DATE,
  valid_until   DATE,                                -- كشف الدليل منتهي الصلاحية
  storage_key   TEXT NOT NULL,                       -- Object Storage مشفّر
  sha256        TEXT,                                -- كشف الدليل المكرر
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── النتائج والفجوات وخطة التحسين ───
CREATE TABLE scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  scope          TEXT NOT NULL,                      -- 'overall' | domain_id
  score          NUMERIC(3,1) NOT NULL,
  breakdown      JSONB,                              -- درجة كل نوع
  evidence_cov   SMALLINT,
  confidence     NUMERIC(3,1),
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE findings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id    TEXT NOT NULL,
  capability     TEXT NOT NULL,
  score          SMALLINT,
  priority       TEXT NOT NULL CHECK (priority IN ('حرجة','عالية','متوسطة')),
  impact         NUMERIC(4,1),
  effort         SMALLINT
);

CREATE TABLE improvement_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  finding_id        UUID REFERENCES findings(id),
  title             TEXT NOT NULL,
  owner             TEXT,
  due_date          DATE,
  kpi               TEXT,
  evidence_required TEXT,
  status            TEXT NOT NULL DEFAULT 'لم تبدأ'
                      CHECK (status IN ('لم تبدأ','قيد التنفيذ','قيد المراجعة','مغلقة')),
  closed_at         TIMESTAMPTZ
);

-- ─── سجل تدقيق Append-only (P6) — لا UPDATE/DELETE ───
CREATE TABLE audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  org_id     UUID NOT NULL REFERENCES organizations(id),
  actor_id   UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  detail     JSONB,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- ═══ فصل العملاء عبر Row-Level Security (نموذج مبسّط) ═══
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assessments
  USING (org_id = current_setting('app.current_org', true)::uuid);
-- تُطبَّق سياسات مماثلة على كل جدول يحمل org_id أو يرتبط بتقييم.

-- فهارس أساسية
CREATE INDEX idx_responses_assessment ON responses(assessment_id);
CREATE INDEX idx_evidence_response    ON evidence_files(response_id);
CREATE INDEX idx_actions_assessment   ON improvement_actions(assessment_id);
CREATE INDEX idx_audit_org_at         ON audit_logs(org_id, at DESC);
