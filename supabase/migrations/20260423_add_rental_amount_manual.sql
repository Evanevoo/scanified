-- Add a per-row flag that indicates the rental's rental_amount was set explicitly by a user
-- (via the Rentals edit dialog). When true, the UI must show this saved value as-is and
-- must NOT replace it with the org-class / customer-pricing default that rentalWorkspaceMerge
-- normally computes for monthly rentals.

ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS rental_amount_manual boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rentals.rental_amount_manual IS
  'When true, UI skips the org-class/customer-pricing recompute and shows the saved rental_amount as-is.';
