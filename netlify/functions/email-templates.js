// Email templates for the application

const templates = {
  'verify-organization': ({ verificationLink, organizationName, userName }) => ({
    subject: `Verify your email to create ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #2563EB; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Welcome to GasBoss!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName || 'there'}!</h2>
            <p>You're almost ready to start managing your assets with <strong>${organizationName}</strong>.</p>
            <p>To complete your registration and verify your email address, please click the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email & Create Organization</a>
            </div>
            <div class="warning">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
              ${verificationLink}
            </p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GasBoss. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${userName || 'there'}!

You're almost ready to start managing your assets with ${organizationName}.

To complete your registration and verify your email address, click this link:
${verificationLink}

⏰ Important: This verification link will expire in 24 hours.

If you didn't request this, you can safely ignore this email.

© ${new Date().getFullYear()} GasBoss. All rights reserved.
    `
  }),

  'invite': ({ inviteLink, organizationName, inviterName }) => ({
    subject: `You're invited to join ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #059669; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .info-box { background: #dbeafe; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 You're Invited!</h1>
          </div>
          <div class="content">
            <h2>Join ${organizationName}</h2>
            <p><strong>${inviterName}</strong> has invited you to join their organization on GasBoss.</p>
            <p>Click the button below to accept the invitation and get started:</p>
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
            <div class="info-box">
              <strong>ℹ️ What happens next?</strong><br>
              You'll be able to create your account and join ${organizationName} immediately.
              This invitation link expires in 7 days.
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
              ${inviteLink}
            </p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GasBoss. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
🎉 You're Invited!

${inviterName} has invited you to join ${organizationName} on GasBoss.

Click this link to accept the invitation:
${inviteLink}

ℹ️ What happens next?
You'll be able to create your account and join ${organizationName} immediately.
This invitation link expires in 7 days.

If you weren't expecting this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} GasBoss. All rights reserved.
    `
  })
};

module.exports = { templates };

