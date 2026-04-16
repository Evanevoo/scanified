const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { templates } = require('./email-templates');
const { handlePreflight, createResponse, createErrorResponse, getCorsOrigin } = require('./utils/cors');
const { applyRateLimit } = require('./utils/rateLimit');
const { verifyAuth } = require('./utils/auth');
const { requesterMaySetPasswords } = require('./utils/userAdminAuth');

function createMailTransporter() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
  const tlsConfig = {
    rejectUnauthorized: isProduction,
    minVersion: 'TLSv1.2',
  };

  if (process.env.SMTP2GO_USER && process.env.SMTP2GO_PASSWORD && process.env.SMTP2GO_FROM) {
    return {
      transporter: nodemailer.createTransport({
        host: 'mail.smtp2go.com',
        port: 2525,
        secure: false,
        auth: { user: process.env.SMTP2GO_USER, pass: process.env.SMTP2GO_PASSWORD },
        tls: tlsConfig,
      }),
      from: process.env.SMTP2GO_FROM,
      serviceName: 'SMTP2GO',
    };
  }
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM) {
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
        tls: tlsConfig,
      }),
      from: process.env.EMAIL_FROM,
      serviceName: 'Gmail',
    };
  }
  if (process.env.OUTLOOK_USER && process.env.OUTLOOK_PASSWORD && process.env.OUTLOOK_FROM) {
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: { user: process.env.OUTLOOK_USER, pass: process.env.OUTLOOK_PASSWORD },
        tls: { ...tlsConfig, ciphers: 'SSLv3' },
      }),
      from: process.env.OUTLOOK_FROM,
      serviceName: 'Outlook',
    };
  }
  return null;
}

function recoveryRedirectTo(event) {
  const origin = getCorsOrigin(event);
  if (origin && /^https?:\/\//i.test(origin)) {
    return `${origin.replace(/\/$/, '')}/reset-password`;
  }
  const raw =
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    'https://www.scanified.com';
  return `${String(raw).replace(/\/$/, '')}/reset-password`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(event);
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(event, 405, { error: 'Method not allowed' });
  }

  const rateLimitResponse = applyRateLimit(event, 'admin-send-password-reset', 'passwordReset');
  if (rateLimitResponse) return rateLimitResponse;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createErrorResponse(event, 500, 'Service configuration error');
  }

  try {
    const user = await verifyAuth(event);
    if (!user) {
      return createResponse(event, 401, { error: 'Authentication required' });
    }

    const { userId } = JSON.parse(event.body || '{}');
    if (!userId || typeof userId !== 'string') {
      return createResponse(event, 400, { error: 'Missing userId' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: requesterProfile, error: reqErr } = await supabase
      .from('profiles')
      .select('organization_id, role, role_id')
      .eq('id', user.id)
      .single();

    if (reqErr || !requesterProfile) {
      return createResponse(event, 403, { error: 'Your profile could not be verified' });
    }

    const allowed = await requesterMaySetPasswords(supabase, requesterProfile);
    if (!allowed) {
      return createResponse(event, 403, {
        error: 'Only organization admins and owners can send password reset emails',
      });
    }

    const { data: targetProfile, error: targetErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization_id')
      .eq('id', userId)
      .single();

    if (targetErr || !targetProfile?.email) {
      return createResponse(event, 404, { error: 'User not found' });
    }

    if (targetProfile.organization_id !== requesterProfile.organization_id) {
      return createResponse(event, 403, {
        error: 'You can only send reset emails to users in your organization',
      });
    }

    const mail = createMailTransporter();
    if (!mail) {
      return createResponse(event, 500, {
        error:
          'Email is not configured on the server (SMTP2GO or Gmail). Add SMTP env vars in Netlify so recovery emails can be sent.',
      });
    }

    let orgName = 'your organization';
    if (requesterProfile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', requesterProfile.organization_id)
        .maybeSingle();
      if (org?.name) orgName = org.name;
    }

    const redirectTo = recoveryRedirectTo(event);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: targetProfile.email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error('generateLink recovery error:', linkError.message);
      return createResponse(event, 500, {
        error: 'Could not create password reset link',
        details: linkError.message,
      });
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return createResponse(event, 500, { error: 'Could not create password reset link (no action_link)' });
    }

    const tpl = templates['password-recovery']({
      resetLink: actionLink,
      organizationName: orgName,
      recipientName: targetProfile.full_name || targetProfile.email.split('@')[0],
    });

    await mail.transporter.sendMail({
      from: mail.from,
      to: targetProfile.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    return createResponse(event, 200, {
      success: true,
      message: `Password reset email sent to ${targetProfile.email}`,
    });
  } catch (err) {
    console.error('admin-send-password-reset:', err);
    return createErrorResponse(event, 500, 'Failed to send recovery email', err);
  }
};
