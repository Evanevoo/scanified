const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, email, company, subject, message } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create transporter using environment variables
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Get contact info from environment or use defaults
    const contactEmail = process.env.CONTACT_EMAIL || 'contact@lessannoyingscan.com';
    const contactName = process.env.CONTACT_NAME || 'Gas Cylinder Management';

    // Email to business owner
    const ownerMailOptions = {
      from: `"Contact Form" <${process.env.SMTP_USER}>`,
      to: contactEmail,
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>This message was sent from the contact form on your website.</small></p>
      `
    };

    // Confirmation email to customer
    const customerMailOptions = {
      from: `"${contactName}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Thank you for contacting ${contactName}`,
      html: `
        <h2>Thank you for contacting us!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p>If you have any urgent questions, please don't hesitate to contact us directly:</p>
        <p><strong>Email:</strong> ${contactEmail}</p>
        <p><strong>Phone:</strong> ${process.env.CONTACT_PHONE || 'Available on our website'}</p>
        <br>
        <p>Best regards,<br>${contactName} Team</p>
      `
    };

    // Send both emails
    await transporter.sendMail(ownerMailOptions);
    await transporter.sendMail(customerMailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Email sent successfully',
        success: true 
      })
    };

  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send email. Please try again or contact us directly.',
        details: error.message 
      })
    };
  }
}; 