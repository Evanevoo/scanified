-- Store scanner timezone so website can show fill date/time in the timezone where the scan happened
ALTER TABLE cylinder_fills ADD COLUMN IF NOT EXISTS fill_timezone TEXT;
COMMENT ON COLUMN cylinder_fills.fill_timezone IS 'IANA timezone (e.g. Australia/Sydney) when fill was recorded; used for correct date/time display on web.';
