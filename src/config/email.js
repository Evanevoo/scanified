// Email configuration for different environments
export const emailConfig = {
  // Development settings (with SMTP2GO configured)
  development: {
    requireEmailConfirmation: true,
    smtpConfigured: true
  },
  // Production settings
  production: {
    requireEmailConfirmation: true,
    smtpConfigured: true
  }
};

// Get current environment
export const getEmailConfig = () => {
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  return isDevelopment ? emailConfig.development : emailConfig.production;
};

// Check if email confirmation is required
export const isEmailConfirmationRequired = () => {
  return getEmailConfig().requireEmailConfirmation;
};

// Check if SMTP is configured
export const isSMTPConfigured = () => {
  return getEmailConfig().smtpConfigured;
}; 