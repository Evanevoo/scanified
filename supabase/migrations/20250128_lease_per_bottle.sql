-- Per-bottle lease agreements: one lease per bottle; new bottles default to monthly until admin switches to yearly.
-- Add bottle_id to lease_agreements (optional: when set, this agreement is for that one bottle).
-- Ensure rentals has rental_type and lease_agreement_id for per-bottle control.

-- lease_agreements: add bottle_id (optional)
ALTER TABLE lease_agreements
ADD COLUMN IF NOT EXISTS bottle_id UUID REFERENCES bottles(id) ON DELETE SET NULL;

COMMENT ON COLUMN lease_agreements.bottle_id IS 'When set, this lease is for this one bottle only. Null = legacy customer-level agreement.';

CREATE INDEX IF NOT EXISTS idx_lease_agreements_bottle_id ON lease_agreements(bottle_id) WHERE bottle_id IS NOT NULL;

-- rentals: ensure rental_type and lease_agreement_id exist
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS rental_type TEXT DEFAULT 'monthly';

ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS lease_agreement_id UUID REFERENCES lease_agreements(id) ON DELETE SET NULL;

COMMENT ON COLUMN rentals.rental_type IS 'monthly = default for new/extra bottles; yearly = after admin links a lease.';
COMMENT ON COLUMN rentals.lease_agreement_id IS 'When set, this rental is billed yearly per this lease (one lease per bottle).';

CREATE INDEX IF NOT EXISTS idx_rentals_lease_agreement_id ON rentals(lease_agreement_id) WHERE lease_agreement_id IS NOT NULL;
