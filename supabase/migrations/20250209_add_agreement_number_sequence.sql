-- Add agreement number sequence to invoice_settings for atomic batch generation.
-- Fixes duplicate key error when creating multiple agreements (e.g. "Apply to all bottles").
ALTER TABLE invoice_settings
  ADD COLUMN IF NOT EXISTS agreement_prefix TEXT DEFAULT 'LA',
  ADD COLUMN IF NOT EXISTS next_agreement_number INTEGER DEFAULT 1;

COMMENT ON COLUMN invoice_settings.agreement_prefix IS 'Prefix for lease agreement numbers (e.g. LA00001)';
COMMENT ON COLUMN invoice_settings.next_agreement_number IS 'Next sequential agreement number for this organization';
