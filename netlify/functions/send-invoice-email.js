const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Wrap everything in try-catch to ensure we always return a response
  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    try {
      // Parse request body
      let requestData;
      try {
        requestData = JSON.parse(event.body);
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Invalid request body',
            details: parseError.message 
          })
        };
      }

      const { to, from, subject, body, pdfBase64, pdfFileName, invoiceNumber } = requestData;

      // Validate required fields
      if (!to || !subject || !pdfBase64) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: 'Missing required fields: to, subject, and pdfBase64 are required' })
        };
      }

      // Use provided 'from' email (logged-in user's email) or fallback to environment variable
      const senderEmail = from || process.env.SMTP2GO_FROM || process.env.EMAIL_FROM || process.env.OUTLOOK_FROM;
      if (!senderEmail) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: 'Missing sender email. Please provide "from" field or configure SMTP_FROM environment variable.' })
        };
      }

      // Check which email service is configured
      let transporter;
      let emailService = 'Unknown';

      // Try SMTP2GO first (your primary service)
      if (process.env.SMTP2GO_USER && process.env.SMTP2GO_PASSWORD) {
        console.log('Using SMTP2GO email service');
        transporter = nodemailer.createTransport({
          host: 'mail.smtp2go.com',
          port: 2525,
          secure: false,
          auth: {
            user: process.env.SMTP2GO_USER,
            pass: process.env.SMTP2GO_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        emailService = 'SMTP2GO';
      }
      // Try Gmail if SMTP2GO not configured
      else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        console.log('Using Gmail email service');
        transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        emailService = 'Gmail';
      }
      // Fallback to Outlook
      else if (process.env.OUTLOOK_USER && process.env.OUTLOOK_PASSWORD) {
        console.log('Using Outlook email service');
        transporter = nodemailer.createTransport({
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.OUTLOOK_USER,
            pass: process.env.OUTLOOK_PASSWORD
          },
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
          }
        });
        emailService = 'Outlook';
      }
      else {
        console.error('No email service configured. Missing environment variables.');
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'No email service configured',
            details: 'Please configure SMTP2GO, Gmail, or Outlook in Netlify environment variables. Required: SMTP2GO_USER, SMTP2GO_PASSWORD (or equivalent for Gmail/Outlook).'
          })
        };
      }

      // Verify transporter connection
      try {
        await transporter.verify();
        console.log(`${emailService} connection verified successfully`);
      } catch (verifyError) {
        console.error(`${emailService} connection verification failed:`, verifyError);
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: `${emailService} connection failed`,
            details: verifyError.message
          })
        };
      }

      // Convert base64 PDF to buffer
      let pdfBuffer;
      try {
        if (!pdfBase64 || typeof pdfBase64 !== 'string') {
          throw new Error('Invalid PDF base64 data');
        }
        pdfBuffer = Buffer.from(pdfBase64, 'base64');
        if (pdfBuffer.length === 0) {
          throw new Error('PDF buffer is empty');
        }
        console.log(`PDF buffer created, size: ${pdfBuffer.length} bytes`);
      } catch (bufferError) {
        console.error('Error creating PDF buffer:', bufferError);
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'Invalid PDF data',
            details: bufferError.message
          })
        };
      }

      // Send email with PDF attachment
      console.log(`Sending invoice email via ${emailService} from: ${senderEmail} to: ${to}`);
      
      const mailOptions = {
        from: senderEmail, // Use the logged-in user's email as sender
        to: to,
        subject: subject,
        html: body || '<p>Please find your invoice attached.</p>',
        attachments: [
          {
            filename: pdfFileName || `Invoice_${invoiceNumber || 'invoice'}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Invoice email sent successfully via ${emailService} from: ${senderEmail} to: ${to}`);
      console.log('Message ID:', info.messageId);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: 'Invoice email sent successfully',
          messageId: info.messageId,
          emailService: emailService,
          from: senderEmail
        })
      };

    } catch (error) {
      console.error('Error sending invoice email:', error);
      console.error('Error stack:', error.stack);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Failed to send invoice email',
          details: error.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
      };
    }
  } catch (outerError) {
    // Catch any errors that occur outside the main try block (e.g., parsing, etc.)
    console.error('Fatal error in handler:', outerError);
    console.error('Error stack:', outerError.stack);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Fatal error in email function',
        details: outerError.message || 'Unknown error',
        type: outerError.name || 'Error'
      })
    };
  }
};
