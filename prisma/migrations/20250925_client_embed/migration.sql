-- Migration: add client-embed fields and flags
ALTER TABLE `Experiment`
  ADD COLUMN `entry_url` VARCHAR(191) NULL,
  ADD COLUMN `mode` ENUM('client_embed','legacy_slug') NOT NULL DEFAULT 'client_embed',
  ADD COLUMN `settings` JSON NULL;

ALTER TABLE `Variant`
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

