-- Gapura OneClick - Consolidated MySQL 8.0+ Schema
-- Compatible with MySQL 8.0+ and phpMyAdmin

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `gapura_oneclick`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `gapura_oneclick`;

-- ============================================================================
-- 1. Master & Auth Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS `stations` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stations_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `units` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `positions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `level` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `locations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `area` VARCHAR(255) NULL,
  `station_id` VARCHAR(64) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_locations_station_id` (`station_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incident_types` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `default_severity` VARCHAR(64) NOT NULL DEFAULT 'low',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(64) NULL,
  `status` VARCHAR(32) NULL,
  `nik` VARCHAR(64) NULL,
  `phone` VARCHAR(64) NULL,
  `station_id` VARCHAR(64) NULL,
  `unit_id` VARCHAR(64) NULL,
  `position_id` VARCHAR(64) NULL,
  `department` VARCHAR(128) NULL,
  `division` VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_nik` (`nik`),
  KEY `idx_users_station_id` (`station_id`),
  KEY `idx_users_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. Security, Sessions, Rate Limits & Audit Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS `security_sessions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `session_id` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` TEXT NULL,
  `device_name` VARCHAR(255) NULL,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `last_active` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_security_sessions_session_id` (`session_id`),
  KEY `idx_security_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_security_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `source` VARCHAR(128) NOT NULL,
  `event_type` VARCHAR(128) NOT NULL,
  `severity` VARCHAR(32) NULL,
  `payload` JSON NOT NULL,
  `ip_address` VARCHAR(64) NULL,
  `actor_id` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_security_events_created_at` (`created_at`),
  KEY `idx_security_events_actor_id` (`actor_id`),
  CONSTRAINT `fk_security_events_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_alerts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `severity` VARCHAR(32) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  `source_events` JSON NULL,
  `metadata` JSON NULL,
  `assigned_to` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_security_alerts_status` (`status`),
  CONSTRAINT `fk_security_alerts_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_configs` (
  `key` VARCHAR(191) NOT NULL,
  `value` JSON NOT NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `blocked_ips` (
  `ip_address` VARCHAR(64) NOT NULL,
  `reason` TEXT NULL,
  `blocked_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` DATETIME(6) NULL,
  `metadata` JSON NULL,
  PRIMARY KEY (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `actor_id` CHAR(36) NULL,
  `action` VARCHAR(128) NOT NULL,
  `entity_type` VARCHAR(128) NOT NULL,
  `entity_id` VARCHAR(255) NOT NULL,
  `old_value` JSON NULL,
  `new_value` JSON NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_actor_id` (`actor_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(512) NOT NULL,
  `count` INT NOT NULL DEFAULT 1,
  `reset_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rate_limits_key` (`key`(255)),
  KEY `idx_rate_limits_reset_at` (`reset_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL,
  `user_id` CHAR(36) NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `reset_token_hash` VARCHAR(255) NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `verified_at` DATETIME(6) NULL,
  `consumed_at` DATETIME(6) NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `ip_address` VARCHAR(64) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_password_reset_otps_email_created` (`email`, `created_at`),
  KEY `idx_password_reset_otps_expires` (`expires_at`),
  CONSTRAINT `fk_password_reset_otps_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. Reports, Sync & Evidence Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS `reports` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `title` TEXT NULL,
  `description` LONGTEXT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'OPEN',
  `severity` VARCHAR(64) NOT NULL DEFAULT 'low',
  `location` TEXT NULL,
  `flight_number` VARCHAR(64) NULL,
  `aircraft_reg` VARCHAR(64) NULL,
  `date_of_event` DATETIME(6) NULL,
  `station_id` VARCHAR(64) NULL,
  `incident_type_id` VARCHAR(64) NULL,
  `sheet_id` VARCHAR(255) NULL,
  `source_fingerprint` VARCHAR(255) NULL,
  `reporter_name` VARCHAR(255) NULL,
  `action_taken` LONGTEXT NULL,
  `root_caused` LONGTEXT NULL,
  `delay_code` VARCHAR(64) NULL,
  `delay_duration` VARCHAR(64) NULL,
  `evidence_urls` JSON NULL,
  `evidence_file_ids` JSON NULL,
  `evidence_submission_id` VARCHAR(255) NULL,
  `primary_tag` VARCHAR(128) NULL,
  `target_division` VARCHAR(64) NULL,
  `remarks_gapura_kps` LONGTEXT NULL,
  `category` VARCHAR(128) NULL,
  `priority` VARCHAR(32) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_reports_user_id` (`user_id`),
  KEY `idx_reports_sheet_id` (`sheet_id`),
  CONSTRAINT `fk_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ground_handling_irregularity_report` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sheet_id` VARCHAR(255) NOT NULL,
  `user_id` CHAR(36) NULL,
  `title` TEXT NULL,
  `description` LONGTEXT NULL,
  `location` TEXT NULL,
  `reporter_email` VARCHAR(255) NULL,
  `evidence_url` TEXT NULL,
  `evidence_urls` JSON NULL,
  `evidence_file_ids` JSON NULL,
  `evidence_submission_id` VARCHAR(255) NULL,
  `status` VARCHAR(64) NULL DEFAULT 'OPEN',
  `severity` VARCHAR(64) NULL DEFAULT 'medium',
  `priority` VARCHAR(32) NULL DEFAULT 'medium',
  `flight_number` VARCHAR(64) NULL,
  `aircraft_reg` VARCHAR(64) NULL,
  `is_flight_related` TINYINT(1) NOT NULL DEFAULT 0,
  `gse_number` VARCHAR(128) NULL,
  `gse_name` VARCHAR(255) NULL,
  `is_gse_related` TINYINT(1) NOT NULL DEFAULT 0,
  `station_id` VARCHAR(64) NULL,
  `unit_id` VARCHAR(64) NULL,
  `location_id` VARCHAR(64) NULL,
  `incident_type_id` VARCHAR(64) NULL,
  `category` VARCHAR(255) NULL,
  `main_category` VARCHAR(255) NULL,
  `investigator_notes` LONGTEXT NULL,
  `manager_notes` LONGTEXT NULL,
  `partner_response_notes` LONGTEXT NULL,
  `validation_notes` LONGTEXT NULL,
  `partner_evidence_urls` JSON NULL,
  `source_sheet` VARCHAR(128) NULL,
  `source_fingerprint` VARCHAR(255) NULL,
  `original_id` VARCHAR(255) NULL,
  `row_number` INT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `resolved_at` DATETIME(6) NULL,
  `sla_deadline` DATETIME(6) NULL,
  `incident_date` DATE NULL,
  `date_of_event` DATE NULL,
  `reporting_branch` VARCHAR(128) NULL,
  `hub` VARCHAR(128) NULL,
  `route` VARCHAR(255) NULL,
  `branch` VARCHAR(128) NULL,
  `station_code` VARCHAR(64) NULL,
  `reporter_name` VARCHAR(255) NULL,
  `specific_location` TEXT NULL,
  `airlines` VARCHAR(255) NULL,
  `airline` VARCHAR(255) NULL,
  `jenis_maskapai` VARCHAR(128) NULL,
  `reference_number` VARCHAR(255) NULL,
  `root_caused` LONGTEXT NULL,
  `root_cause` LONGTEXT NULL,
  `action_taken` LONGTEXT NULL,
  `immediate_action` LONGTEXT NULL,
  `kps_remarks` LONGTEXT NULL,
  `remarks_by` VARCHAR(255) NULL,
  `gapura_kps_action_taken` LONGTEXT NULL,
  `preventive_action` LONGTEXT NULL,
  `remarks_gapura_kps` LONGTEXT NULL,
  `area` VARCHAR(255) NULL,
  `terminal_area_category` VARCHAR(255) NULL,
  `apron_area_category` VARCHAR(255) NULL,
  `general_category` VARCHAR(255) NULL,
  `week_in_month` VARCHAR(64) NULL,
  `report` LONGTEXT NULL,
  `irregularity_complain_category` VARCHAR(255) NULL,
  `kode_cabang` VARCHAR(64) NULL,
  `kode_hub` VARCHAR(64) NULL,
  `maskapai_lookup` VARCHAR(255) NULL,
  `case_classification` VARCHAR(255) NULL,
  `lokal_mpa_lookup` VARCHAR(255) NULL,
  `delay_code` VARCHAR(64) NULL,
  `delay_duration` VARCHAR(64) NULL,
  `primary_tag` VARCHAR(128) NULL,
  `sub_category_note` TEXT NULL,
  `target_division` VARCHAR(64) NULL,
  `service_business_type` VARCHAR(255) NULL,
  `remarks_case` LONGTEXT NULL,
  `case_category` VARCHAR(255) NULL,
  `severity_level` VARCHAR(64) NULL,
  `case_cgo` VARCHAR(255) NULL,
  `supporting_evidence` TEXT NULL,
  `category_case_joumpa` VARCHAR(255) NULL,
  `reservation_scheduling` TEXT NULL,
  `pax_assistance_staff_service_performance` TEXT NULL,
  `baggage_delivery_baggage_assistance` TEXT NULL,
  `administration_payment_documentation_marketing` TEXT NULL,
  `gse_available_requirement` TEXT NULL,
  `gse_requirement` TEXT NULL,
  `gse_motorized` TEXT NULL,
  `gse_non_motorized` TEXT NULL,
  `category_case_gse` VARCHAR(255) NULL,
  `category_case_cargo` VARCHAR(255) NULL,
  `final_remarks` LONGTEXT NULL,
  `customer_satisfaction_score` VARCHAR(64) NULL,
  `customer_satisfaction_label` VARCHAR(128) NULL,
  `customer_joumpa` VARCHAR(255) NULL,
  `detail_customer_joumpa` TEXT NULL,
  `corporate` VARCHAR(255) NULL,
  `customer_company_profile_corporate` TEXT NULL,
  `detail_customer_corporate` TEXT NULL,
  `non_corporate` VARCHAR(255) NULL,
  `customer_background_non_corporate` TEXT NULL,
  `detail_customer_non_corporate` TEXT NULL,
  `case_joumpa` VARCHAR(255) NULL,
  `airport_name` VARCHAR(255) NULL,
  `airport_code` VARCHAR(64) NULL,
  `branch_code` VARCHAR(64) NULL,
  `identification_of_root` LONGTEXT NULL,
  `accident_incident` TEXT NULL,
  `issue_caused` LONGTEXT NULL,
  `breakdown_caused` LONGTEXT NULL,
  `esklasi_divisi` VARCHAR(128) NULL,
  `content_hash` VARCHAR(128) NULL,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `sync_version` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ghir_sheet_id` (`sheet_id`),
  KEY `idx_ghir_user_id` (`user_id`),
  KEY `idx_ghir_station_id` (`station_id`),
  KEY `idx_ghir_branch` (`branch`),
  KEY `idx_ghir_hub` (`hub`),
  KEY `idx_ghir_status` (`status`),
  KEY `idx_ghir_date_of_event` (`date_of_event`),
  KEY `idx_ghir_created_at` (`created_at`),
  KEY `idx_ghir_main_category` (`main_category`),
  KEY `idx_ghir_target_division` (`target_division`),
  KEY `idx_ghir_synced_at` (`synced_at`),
  CONSTRAINT `fk_ghir_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `joumpa_reports_sync` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sheet_id` VARCHAR(255) NOT NULL,
  `user_id` CHAR(36) NULL,
  `source_sheet` VARCHAR(128) NULL DEFAULT 'Form Responses 1',
  `source_spreadsheet_id` VARCHAR(255) NULL,
  `source_fingerprint` VARCHAR(255) NULL,
  `row_number` INT NULL,
  `no` VARCHAR(64) NULL,
  `timestamp_raw` VARCHAR(128) NULL,
  `form_timestamp` DATETIME(6) NULL,
  `date_of_event` DATE NULL,
  `incident_date` DATE NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `sync_version` INT NOT NULL DEFAULT 1,
  `report_by` VARCHAR(255) NULL,
  `reporter_name` VARCHAR(255) NULL,
  `email_address` VARCHAR(255) NULL,
  `reporter_email` VARCHAR(255) NULL,
  `jenis_maskapai` VARCHAR(128) NULL,
  `airlines` VARCHAR(255) NULL,
  `airline` VARCHAR(255) NULL,
  `flight_number` VARCHAR(64) NULL,
  `station` VARCHAR(128) NULL,
  `station_code` VARCHAR(64) NULL,
  `branch` VARCHAR(128) NULL,
  `hub` VARCHAR(128) NULL,
  `route` VARCHAR(255) NULL,
  `delay_code` VARCHAR(64) NULL,
  `category_report` VARCHAR(255) NULL,
  `category` VARCHAR(255) NULL,
  `main_category` VARCHAR(255) NULL,
  `area` VARCHAR(255) NULL,
  `service_business_type` VARCHAR(255) NULL DEFAULT 'Joumpa Service',
  `status` VARCHAR(64) NULL DEFAULT 'OPEN',
  `severity` VARCHAR(64) NULL DEFAULT 'LOW',
  `severity_level` VARCHAR(64) NULL,
  `report` LONGTEXT NULL,
  `title` TEXT NULL,
  `description` LONGTEXT NULL,
  `root_caused` LONGTEXT NULL,
  `root_cause` LONGTEXT NULL,
  `action_taken` LONGTEXT NULL,
  `immediate_action` LONGTEXT NULL,
  `preventive_action` LONGTEXT NULL,
  `remarks_by` VARCHAR(255) NULL,
  `category_case_joumpa` VARCHAR(255) NULL,
  `joumpa_compliment_report_excellent_service` TEXT NULL,
  `reservation_scheduling` TEXT NULL,
  `pax_assistance_staff_service_performance` TEXT NULL,
  `baggage_delivery_baggage_assistance` TEXT NULL,
  `administration_payment_documentation_marketing` TEXT NULL,
  `case_category` VARCHAR(255) NULL,
  `remarks_case` LONGTEXT NULL,
  `case_classification` VARCHAR(255) NULL,
  `identification_of_root` LONGTEXT NULL,
  `supporting_evidence` TEXT NULL,
  `evidence_url` TEXT NULL,
  `evidence_urls` JSON NULL,
  `raw_data` JSON NULL,
  `final_remarks` LONGTEXT NULL,
  `kps_remarks` LONGTEXT NULL,
  `customer_satisfaction_score` VARCHAR(64) NULL,
  `customer_satisfaction_label` VARCHAR(128) NULL,
  `customer_joumpa` VARCHAR(255) NULL,
  `detail_customer_joumpa` TEXT NULL,
  `corporate` VARCHAR(255) NULL,
  `customer_company_profile_corporate` TEXT NULL,
  `detail_customer_corporate` TEXT NULL,
  `non_corporate` VARCHAR(255) NULL,
  `customer_background_non_corporate` TEXT NULL,
  `detail_customer_non_corporate` TEXT NULL,
  `case_joumpa` VARCHAR(255) NULL,
  `airport_name` VARCHAR(255) NULL,
  `airport_code` VARCHAR(64) NULL,
  `branch_code` VARCHAR(64) NULL,
  `content_hash` VARCHAR(128) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_joumpa_sheet_id` (`sheet_id`),
  KEY `idx_joumpa_date_of_event` (`date_of_event`),
  KEY `idx_joumpa_branch` (`branch`),
  KEY `idx_joumpa_airlines` (`airlines`),
  KEY `idx_joumpa_category` (`category`),
  KEY `idx_joumpa_case_category` (`case_category`),
  CONSTRAINT `fk_joumpa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_comments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `report_id` VARCHAR(255) NOT NULL,
  `user_id` CHAR(36) NULL,
  `content` LONGTEXT NULL,
  `attachments` JSON NULL,
  `is_system_message` TINYINT(1) NOT NULL DEFAULT 0,
  `sheet_id` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_report_comments_report_id` (`report_id`),
  KEY `idx_report_comments_user_id` (`user_id`),
  CONSTRAINT `fk_report_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_comment_notifications` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `report_id` VARCHAR(255) NOT NULL,
  `comment_id` CHAR(36) NOT NULL,
  `read_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_comment_notif_user_unread` (`user_id`, `read_at`),
  KEY `idx_comment_notif_comment` (`comment_id`),
  CONSTRAINT `fk_comment_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_notif_comment` FOREIGN KEY (`comment_id`) REFERENCES `report_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_documents` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `report_type` VARCHAR(32) NOT NULL,
  `report_id` VARCHAR(255) NOT NULL,
  `revision_id` CHAR(36) NOT NULL,
  `docx_path` VARCHAR(512) NOT NULL,
  `docx_filename` VARCHAR(255) NOT NULL,
  `docx_mime_type` VARCHAR(255) NOT NULL,
  `docx_size_bytes` BIGINT NOT NULL,
  `docx_sha256` CHAR(64) NOT NULL,
  `pdf_path` VARCHAR(512) NOT NULL,
  `pdf_filename` VARCHAR(255) NOT NULL,
  `pdf_mime_type` VARCHAR(255) NOT NULL,
  `pdf_size_bytes` BIGINT NOT NULL,
  `pdf_sha256` CHAR(64) NOT NULL,
  `edited_snapshot` JSON NOT NULL,
  `signature_sha256` CHAR(64) NULL,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_report_documents_type_id` (`report_type`, `report_id`),
  UNIQUE KEY `uq_report_documents_docx_path` (`docx_path`(255)),
  UNIQUE KEY `uq_report_documents_pdf_path` (`pdf_path`(255)),
  CONSTRAINT `fk_report_documents_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evidence_upload_sessions` (
  `id` VARCHAR(255) NOT NULL,
  `mode` VARCHAR(32) NOT NULL,
  `user_id` CHAR(36) NULL,
  `reporter_email` VARCHAR(255) NULL,
  `reporter_name` VARCHAR(255) NULL,
  `quick_access_session_id` VARCHAR(255) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'uploading',
  `report_sheet_id` VARCHAR(255) NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_evidence_sessions_user_id` (`user_id`),
  KEY `idx_evidence_sessions_status_expires` (`status`, `expires_at`),
  CONSTRAINT `fk_evidence_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evidence_files` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `session_id` VARCHAR(255) NOT NULL,
  `mode` VARCHAR(32) NOT NULL,
  `user_id` CHAR(36) NULL,
  `reporter_email` VARCHAR(255) NULL,
  `reporter_name` VARCHAR(255) NULL,
  `kind` VARCHAR(32) NOT NULL DEFAULT 'evidence',
  `google_drive_file_id` VARCHAR(255) NOT NULL,
  `google_drive_folder_id` VARCHAR(255) NOT NULL,
  `web_view_link` TEXT NOT NULL,
  `web_content_link` TEXT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(255) NOT NULL,
  `size_bytes` INT NOT NULL,
  `sha256` VARCHAR(128) NOT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'uploaded_pending_report',
  `report_sheet_id` VARCHAR(255) NULL,
  `report_id` VARCHAR(255) NULL,
  `linked_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evidence_files_drive_id` (`google_drive_file_id`),
  KEY `idx_evidence_files_session_id` (`session_id`),
  KEY `idx_evidence_files_report_sheet_id` (`report_sheet_id`),
  KEY `idx_evidence_files_report_id` (`report_id`),
  CONSTRAINT `fk_evidence_files_session` FOREIGN KEY (`session_id`) REFERENCES `evidence_upload_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evidence_files_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. Sync State, Caching & AI Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS `sync_state` (
  `source` VARCHAR(128) NOT NULL,
  `last_sync_at` DATETIME(6) NULL,
  `sync_version` BIGINT NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'idle',
  `locked_until` DATETIME(6) NULL,
  `last_error` TEXT NULL,
  `row_count` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`source`),
  KEY `idx_sync_state_locked_until` (`locked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `sync_state` (`source`, `status`) VALUES ('reports', 'idle');

CREATE TABLE IF NOT EXISTS `dashboard_cache_entries` (
  `cache_key` VARCHAR(255) NOT NULL,
  `payload` JSON NOT NULL,
  `sync_version` BIGINT NOT NULL DEFAULT 0,
  `expires_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`cache_key`),
  KEY `idx_dashboard_cache_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_cache_entries` (
  `cache_key` VARCHAR(255) NOT NULL,
  `insights` JSON NOT NULL,
  `supporting_charts` JSON NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`cache_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_audit_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NULL,
  `feature` VARCHAR(128) NOT NULL,
  `prompt` LONGTEXT NOT NULL,
  `raw_response` LONGTEXT NULL,
  `parsed_response` JSON NULL,
  `model` VARCHAR(128) NULL,
  `execution_time_ms` INT NULL,
  `status` VARCHAR(32) NOT NULL,
  `error_message` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ai_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. Custom Dashboards & Sharing Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS `custom_dashboards` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `created_by` CHAR(36) NULL,
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `slug` VARCHAR(255) NOT NULL,
  `config` JSON NOT NULL,
  `folder` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_custom_dashboards_slug` (`slug`),
  CONSTRAINT `fk_custom_dashboards_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dashboard_charts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `dashboard_id` CHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `chart_type` VARCHAR(64) NOT NULL,
  `data_field` VARCHAR(255) NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `width` VARCHAR(32) NOT NULL DEFAULT 'half',
  `config` JSON NULL,
  `query_config` JSON NULL,
  `visualization_config` JSON NULL,
  `layout` JSON NULL,
  `page_name` VARCHAR(255) NOT NULL DEFAULT 'Ringkasan Umum',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_dashboard_charts_dashboard_id` (`dashboard_id`),
  CONSTRAINT `fk_dashboard_charts_dashboard` FOREIGN KEY (`dashboard_id`) REFERENCES `custom_dashboards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `published_dashboards` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `slug` VARCHAR(255) NOT NULL,
  `dashboard_key` VARCHAR(128) NOT NULL,
  `tab` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NULL,
  `config` JSON NOT NULL,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `revoked_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_published_dashboards_slug` (`slug`),
  KEY `idx_published_dashboards_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. Workspaces, Calendar, Links & Quick Access Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `title` VARCHAR(255) NOT NULL,
  `event_date` DATE NOT NULL,
  `event_time` TIME NULL,
  `notes` TEXT NULL,
  `meeting_minutes_link` TEXT NULL,
  `is_recurring` TINYINT(1) NOT NULL DEFAULT 0,
  `recurrence_pattern` VARCHAR(64) NULL,
  `recurrence_end_date` DATE NULL,
  `parent_event_id` CHAR(36) NULL,
  `calendar_type` VARCHAR(32) NOT NULL DEFAULT 'event',
  `created_by` CHAR(36) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_calendar_events_date` (`event_date`),
  CONSTRAINT `fk_calendar_events_parent` FOREIGN KEY (`parent_event_id`) REFERENCES `calendar_events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_calendar_events_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hc_leave_records` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `employee_name` VARCHAR(255) NOT NULL,
  `leave_type` VARCHAR(128) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `submission_status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `station_id` VARCHAR(64) NULL,
  `division_name` VARCHAR(128) NULL,
  `unit_name` VARCHAR(128) NULL,
  `pic_name` VARCHAR(255) NULL,
  `pic_email` VARCHAR(255) NULL,
  `pic_phone` VARCHAR(64) NULL,
  `employee_email` VARCHAR(255) NULL,
  `employee_phone` VARCHAR(64) NULL,
  `notes` TEXT NULL,
  `created_by` CHAR(36) NOT NULL,
  `updated_by` CHAR(36) NULL,
  `reviewed_by` CHAR(36) NULL,
  `reviewed_at` DATETIME(6) NULL,
  `review_notes` TEXT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(6) NULL,
  `deleted_by` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_hc_leave_station` (`station_id`),
  KEY `idx_hc_leave_start_date` (`start_date`),
  KEY `idx_hc_leave_created_by` (`created_by`),
  CONSTRAINT `fk_hc_leave_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hc_leave_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hc_leave_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hc_leave_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `division_documents` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `division` VARCHAR(32) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `source_type` VARCHAR(32) NOT NULL,
  `file_url` TEXT NULL,
  `file_name` VARCHAR(255) NULL,
  `file_size` BIGINT NULL,
  `mime_type` VARCHAR(255) NULL,
  `external_url` TEXT NULL,
  `visibility_scope` VARCHAR(32) NOT NULL DEFAULT 'all',
  `audience_station_ids` JSON NOT NULL,
  `audience_roles` JSON NOT NULL,
  `meeting_title` VARCHAR(255) NULL,
  `meeting_date` DATE NULL,
  `audience_label` VARCHAR(255) NULL,
  `activity_pic` VARCHAR(255) NULL,
  `activity_location` VARCHAR(255) NULL,
  `drive_file_id` VARCHAR(255) NULL,
  `drive_folder_id` VARCHAR(255) NULL,
  `drive_web_url` TEXT NULL,
  `drive_content_url` TEXT NULL,
  `uploaded_at` DATETIME(6) NULL,
  `station_id` VARCHAR(64) NULL,
  `airline` VARCHAR(255) NULL,
  `participants` TEXT NULL,
  `materi_url` TEXT NULL,
  `materi_title` VARCHAR(255) NULL,
  `material_links` JSON NOT NULL,
  `attendance_url` TEXT NULL,
  `recording_url` TEXT NULL,
  `created_by` CHAR(36) NOT NULL,
  `updated_by` CHAR(36) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_division_docs_division` (`division`, `category`),
  CONSTRAINT `fk_division_docs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_division_docs_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_recipients` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `entity` VARCHAR(128) NOT NULL,
  `channel` VARCHAR(32) NOT NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_recipients` (`entity`, `channel`, `recipient_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_delivery_log` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `fingerprint` VARCHAR(255) NOT NULL,
  `entity` VARCHAR(128) NOT NULL,
  `channel` VARCHAR(32) NOT NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(512) NOT NULL,
  `payload` JSON NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `error_message` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `sent_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_delivery_fingerprint` (`fingerprint`),
  KEY `idx_notif_delivery_entity` (`entity`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `external_links` (
  `id` VARCHAR(128) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `url` TEXT NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `description` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `performance_links` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `title` VARCHAR(255) NOT NULL,
  `url` TEXT NOT NULL,
  `description` TEXT NULL,
  `thumbnail_url` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(64) NOT NULL DEFAULT 'ground-handling',
  `created_by` CHAR(36) NOT NULL,
  `updated_by` CHAR(36) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_performance_links_active` (`is_active`, `created_at`),
  CONSTRAINT `fk_performance_links_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_performance_links_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ocs_tab_records` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tab` VARCHAR(32) NOT NULL,
  `event_date` DATE NULL,
  `agenda` TEXT NULL,
  `series` VARCHAR(255) NULL,
  `location` VARCHAR(255) NULL,
  `pic` VARCHAR(255) NULL,
  `branch` VARCHAR(128) NULL,
  `airline` VARCHAR(255) NULL,
  `participants` TEXT NULL,
  `case_report` TEXT NULL,
  `remarks` TEXT NULL,
  `report_url` TEXT NULL,
  `materi_url` TEXT NULL,
  `attendance_url` TEXT NULL,
  `record_url` TEXT NULL,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_ocs_tab_records_tab` (`tab`, `event_date`),
  CONSTRAINT `fk_ocs_tab_records_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ocs_quick_links` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `label` VARCHAR(255) NOT NULL,
  `url` TEXT NOT NULL,
  `color` VARCHAR(64) NOT NULL DEFAULT 'emerald',
  `icon` VARCHAR(64) NOT NULL DEFAULT 'link',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quick_access_sections` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quick_access_tiles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `section_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `icon` VARCHAR(64) NOT NULL DEFAULT 'link',
  `color` VARCHAR(64) NOT NULL DEFAULT 'oklch(0.60 0.18 260)',
  `span` VARCHAR(16) NOT NULL DEFAULT '1x1',
  `display_mode` VARCHAR(32) NOT NULL DEFAULT 'links',
  `content` JSON NOT NULL,
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `gated_by` VARCHAR(64) NULL,
  `is_password_protected` TINYINT(1) NOT NULL DEFAULT 0,
  `password_hash` VARCHAR(255) NULL,
  `is_maintenance` TINYINT(1) NOT NULL DEFAULT 0,
  `wizard_category` VARCHAR(128) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_qa_tiles_section_id` (`section_id`),
  CONSTRAINT `fk_qa_tiles_section` FOREIGN KEY (`section_id`) REFERENCES `quick_access_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quick_access_settings` (
  `key` VARCHAR(191) NOT NULL,
  `value` JSON NOT NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quick_access_submissions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `tile_id` CHAR(36) NOT NULL,
  `data` JSON NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_qa_submissions_tile_id` (`tile_id`),
  CONSTRAINT `fk_qa_submissions_tile` FOREIGN KEY (`tile_id`) REFERENCES `quick_access_tiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. Triggers (Sync bookkeeping-aware updated_at)
-- ============================================================================

DELIMITER $$

DROP TRIGGER IF EXISTS `trg_ghir_updated_at`$$
CREATE TRIGGER `trg_ghir_updated_at`
BEFORE UPDATE ON `ground_handling_irregularity_report`
FOR EACH ROW
BEGIN
  IF (OLD.synced_at <=> NEW.synced_at AND OLD.sync_version <=> NEW.sync_version) THEN
    SET NEW.updated_at = CURRENT_TIMESTAMP(6);
  END IF;
END$$

DROP TRIGGER IF EXISTS `trg_joumpa_updated_at`$$
CREATE TRIGGER `trg_joumpa_updated_at`
BEFORE UPDATE ON `joumpa_reports_sync`
FOR EACH ROW
BEGIN
  IF (OLD.synced_at <=> NEW.synced_at AND OLD.sync_version <=> NEW.sync_version) THEN
    SET NEW.updated_at = CURRENT_TIMESTAMP(6);
  END IF;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
