/**
 * Organization-scoped format validation for customer IDs.
 * Uses `organizations.format_configuration.customer_id_format` when configured.
 */

/**
 * Validate a customer number against the org's configured customer ID format.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateOrgCustomerId(customerId, organization) {
  const value = String(customerId ?? '').trim();
  if (!value) {
    return { ok: false, error: 'Customer number is required.' };
  }

  const cfg = organization?.format_configuration?.customer_id_format;
  if (!cfg) {
    return { ok: true };
  }

  const disabled =
    cfg.validation_enabled === false ||
    cfg.enabled === false ||
    cfg.validation_enabled === 'false';

  if (disabled || !cfg.pattern) {
    return { ok: true };
  }

  const description = cfg.description || 'the organization customer number format';

  try {
    const re = new RegExp(cfg.pattern);
    if (!re.test(value)) {
      return {
        ok: false,
        error: `Customer number does not match your organization format. Expected: ${description}`,
      };
    }
  } catch {
    return { ok: false, error: 'Invalid organization customer number format configuration.' };
  }

  if (cfg.prefix) {
    const prefix = String(cfg.prefix);
    if (!value.startsWith(prefix)) {
      return {
        ok: false,
        error: `Customer number must start with "${prefix}".`,
      };
    }
  }

  return { ok: true };
}
