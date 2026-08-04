/** Brand-matched status colors — hardcoded rather than theme-derived since the app's
 * per-org theme presets vary these hexes, and this decorative visual should stay
 * consistent regardless of the viewer's active theme. */
export const STATUS_COLORS = {
  full: '#22c55e',
  empty: '#f59e0b',
  transit: '#40B5AD',
};

export const STATUS_KEYS = Object.keys(STATUS_COLORS);

export const CYLINDER_COUNT = 6;

/** Full top-to-bottom sweep repeats on this period. */
export const SCAN_PERIOD_MS = 5000;

/** Full 360° cluster rotation takes this long. */
export const ROTATION_PERIOD_MS = 25000;

/** How long a cylinder stays lit after the beam passes it. */
export const FLASH_HOLD_MS = 900;
