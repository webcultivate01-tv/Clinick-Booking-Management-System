-- Lumière Skin Clinic — MySQL schema
-- Charset: utf8mb4 for full unicode support (Indian names, emojis in messages, etc.)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- users  (admin + staff only — patients are stored in `patients`)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(120)  NOT NULL,
  email           VARCHAR(190)  NOT NULL UNIQUE,
  mobile          VARCHAR(20)   DEFAULT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  gender          ENUM('male','female','other') DEFAULT NULL,
  dob             DATE          DEFAULT NULL,
  profile_image   VARCHAR(500)  DEFAULT NULL,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- patients  (guest booking — created/upserted on each booking by email+mobile)
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(120)  NOT NULL,
  email           VARCHAR(190)  NOT NULL,
  mobile          VARCHAR(20)   NOT NULL,
  gender          ENUM('male','female','other') DEFAULT NULL,
  dob             DATE          DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patients_email_mobile (email, mobile),
  INDEX idx_patients_mobile (mobile),
  INDEX idx_patients_dob_md (dob)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- services / treatments
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(160) NOT NULL,
  slug              VARCHAR(190) NOT NULL UNIQUE,
  description       TEXT,
  short_description VARCHAR(280) DEFAULT NULL,
  price             DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_minutes  INT UNSIGNED NOT NULL DEFAULT 30,
  image_url         VARCHAR(500) DEFAULT NULL,
  image_public_id   VARCHAR(255) DEFAULT NULL,
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_services_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- doctors  (optional — clinic may have one or many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(160) NOT NULL,
  specialization  VARCHAR(160) DEFAULT NULL,
  email           VARCHAR(190) DEFAULT NULL,
  mobile          VARCHAR(20)  DEFAULT NULL,
  image_url       VARCHAR(500) DEFAULT NULL,
  image_public_id VARCHAR(255) DEFAULT NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- appointments
--   queue_number is unique per appointment_date and assigned in the order
--   the appointment was created (first booked => queue 1 for that date).
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id           INT UNSIGNED NOT NULL,
  service_id           INT UNSIGNED NOT NULL,
  doctor_id            INT UNSIGNED DEFAULT NULL,
  appointment_date     DATE         NOT NULL,
  appointment_time     TIME         NOT NULL,
  queue_number         INT UNSIGNED DEFAULT NULL,
  problem_description  TEXT,
  appointment_status   ENUM('pending','confirmed','completed','cancelled','no_show','rescheduled')
                       NOT NULL DEFAULT 'pending',
  payment_status       ENUM('pending','paid','failed','refunded')
                       NOT NULL DEFAULT 'pending',
  payment_mode         ENUM('online','cash') NOT NULL DEFAULT 'online',
  booking_source       ENUM('online','offline') NOT NULL DEFAULT 'online',
  amount               DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by           INT UNSIGNED DEFAULT NULL,
  internal_note        TEXT,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_patient  FOREIGN KEY (patient_id) REFERENCES patients(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_appt_service  FOREIGN KEY (service_id) REFERENCES services(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_appt_doctor   FOREIGN KEY (doctor_id)  REFERENCES doctors(id)   ON DELETE SET NULL,
  CONSTRAINT fk_appt_creator  FOREIGN KEY (created_by) REFERENCES users(id)     ON DELETE SET NULL,
  UNIQUE KEY uq_appt_date_queue (appointment_date, queue_number),
  INDEX idx_appt_date          (appointment_date),
  INDEX idx_appt_pay_status    (payment_status),
  INDEX idx_appt_status        (appointment_status),
  INDEX idx_appt_date_time     (appointment_date, appointment_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- opd_schedules  (per-day clinic hours and slot size)
--   - One row per `opd_date` (UNIQUE). Absence of a row falls back to the
--     `opd_defaults` row (id=1).
--   - `is_open=0` means clinic is closed that day even though there's a row
--     (useful for holidays where we want to keep notes).
-- ============================================================================
CREATE TABLE IF NOT EXISTS opd_schedules (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  opd_date            DATE         NOT NULL,
  start_time          TIME         NOT NULL,
  end_time            TIME         NOT NULL,
  slot_duration_minutes INT UNSIGNED NOT NULL DEFAULT 15,
  is_open             TINYINT(1)   NOT NULL DEFAULT 1,
  note                VARCHAR(255) DEFAULT NULL,
  created_by          INT UNSIGNED DEFAULT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_opd_date (opd_date),
  CONSTRAINT fk_opd_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_opd_window CHECK (end_time > start_time),
  CONSTRAINT chk_opd_slot   CHECK (slot_duration_minutes BETWEEN 5 AND 120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- opd_defaults  (single row, id=1 — applies when a given day has no override)
-- ============================================================================
CREATE TABLE IF NOT EXISTS opd_defaults (
  id                    TINYINT UNSIGNED PRIMARY KEY,
  start_time            TIME         NOT NULL DEFAULT '09:00:00',
  end_time              TIME         NOT NULL DEFAULT '18:00:00',
  slot_duration_minutes INT UNSIGNED NOT NULL DEFAULT 15,
  is_open               TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_opd_def_window CHECK (end_time > start_time),
  CONSTRAINT chk_opd_def_slot   CHECK (slot_duration_minutes BETWEEN 5 AND 120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO opd_defaults (id, start_time, end_time, slot_duration_minutes, is_open)
VALUES (1, '09:00:00', '18:00:00', 15, 1)
ON DUPLICATE KEY UPDATE id = id;

-- ============================================================================
-- payments  (one row per Razorpay attempt; the latest 'paid' is authoritative)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id        INT UNSIGNED NOT NULL,
  patient_id            INT UNSIGNED NOT NULL,
  razorpay_order_id     VARCHAR(120) NOT NULL,
  razorpay_payment_id   VARCHAR(120) DEFAULT NULL,
  razorpay_signature    VARCHAR(255) DEFAULT NULL,
  amount                DECIMAL(10,2) NOT NULL,
  currency              VARCHAR(8)   NOT NULL DEFAULT 'INR',
  payment_status        ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  payment_method        VARCHAR(40)  DEFAULT NULL,
  paid_at               TIMESTAMP    NULL DEFAULT NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_patient     FOREIGN KEY (patient_id)     REFERENCES patients(id)     ON DELETE RESTRICT,
  UNIQUE KEY uq_pay_order (razorpay_order_id),
  INDEX idx_pay_payment_id (razorpay_payment_id),
  INDEX idx_pay_status     (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- enquiries  (public contact form submissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS enquiries (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  mobile          VARCHAR(20)  DEFAULT NULL,
  subject         VARCHAR(200) DEFAULT NULL,
  message         TEXT         NOT NULL,
  status          ENUM('new','contacted','closed') NOT NULL DEFAULT 'new',
  priority        ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  internal_note   TEXT         DEFAULT NULL,
  responded_at    TIMESTAMP    NULL DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enquiries_status   (status),
  INDEX idx_enquiries_priority (priority),
  INDEX idx_enquiries_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- reviews / testimonials  (require admin approval before showing publicly)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_name  VARCHAR(120) NOT NULL,
  email         VARCHAR(190) DEFAULT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  review_text   TEXT         NOT NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reviews_status (status),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- gallery
-- ============================================================================
CREATE TABLE IF NOT EXISTS gallery (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(160) DEFAULT NULL,
  image_url       VARCHAR(500) NOT NULL,
  image_public_id VARCHAR(255) NOT NULL,
  category        VARCHAR(80)  DEFAULT NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gallery_category (category),
  INDEX idx_gallery_active   (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- birthday_email_logs  (prevents duplicate sends; allows retry on failures)
-- ============================================================================
CREATE TABLE IF NOT EXISTS birthday_email_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id    INT UNSIGNED NOT NULL,
  email         VARCHAR(190) NOT NULL,
  sent_date     DATE         NOT NULL,
  status        ENUM('sent','failed') NOT NULL,
  error_message TEXT         DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bday_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  UNIQUE KEY uq_bday_patient_date (patient_id, sent_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Idempotent column additions for existing databases that pre-date the
-- offline-booking feature. MySQL has no native IF NOT EXISTS on ADD COLUMN,
-- so we check information_schema first.
-- ============================================================================
SET @db := DATABASE();

-- gallery: image_public_id was Cloudinary-only; new local-disk uploads store
-- a relative disk path here (eg "gallery/abc.webp") for cleanup. URL-imported
-- rows that were not mirrored have NULL — so the column must be nullable.
SET @col_nullable := (
  SELECT IS_NULLABLE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'gallery' AND COLUMN_NAME = 'image_public_id'
);
SET @sql := IF(@col_nullable = 'NO',
  'ALTER TABLE gallery MODIFY COLUMN image_public_id VARCHAR(255) DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payments: refund-tracking columns (Razorpay refund id + amount + reason + timestamp)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'razorpay_refund_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE payments ADD COLUMN razorpay_refund_id VARCHAR(120) DEFAULT NULL AFTER razorpay_signature',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'refund_amount'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE payments ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT NULL AFTER razorpay_refund_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'refund_reason'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE payments ADD COLUMN refund_reason VARCHAR(255) DEFAULT NULL AFTER refund_amount',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'refunded_at'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE payments ADD COLUMN refunded_at TIMESTAMP NULL DEFAULT NULL AFTER refund_reason',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'payment_mode'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE appointments ADD COLUMN payment_mode ENUM(''online'',''cash'') NOT NULL DEFAULT ''online'' AFTER payment_status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'booking_source'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE appointments ADD COLUMN booking_source ENUM(''online'',''offline'') NOT NULL DEFAULT ''online'' AFTER payment_mode',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Enquiry-management upgrade (priority, internal_note, responded_at + indexes)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'enquiries' AND COLUMN_NAME = 'priority'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE enquiries ADD COLUMN priority ENUM(''low'',''normal'',''high'',''urgent'') NOT NULL DEFAULT ''normal'' AFTER status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'enquiries' AND COLUMN_NAME = 'internal_note'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE enquiries ADD COLUMN internal_note TEXT DEFAULT NULL AFTER priority',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'enquiries' AND COLUMN_NAME = 'responded_at'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE enquiries ADD COLUMN responded_at TIMESTAMP NULL DEFAULT NULL AFTER internal_note',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'enquiries' AND INDEX_NAME = 'idx_enquiries_priority'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE enquiries ADD INDEX idx_enquiries_priority (priority)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'enquiries' AND INDEX_NAME = 'idx_enquiries_created'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE enquiries ADD INDEX idx_enquiries_created (created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
