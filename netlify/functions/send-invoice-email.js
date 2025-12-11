const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Log function invocation
  console.log('=== send-invoice-email function invoked ===');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Event body length:', event.body?.length || 0);
  console.log('Context:', { requestId: context?.requestId, functionName: context?.functionName });
  
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
        if (!event.body) {
          console.error('Event body is missing or empty');
          return {
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              error: 'Request body is required',
              details: 'The request body is missing or empty'
            })
          };
        }
        requestData = JSON.parse(event.body);
        console.log('Request data parsed successfully. Fields:', Object.keys(requestData));
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        console.error('Event body (first 500 chars):', event.body?.substring(0, 500));
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

      // Check PDF size (Netlify has 6MB request body limit, but we should keep PDFs smaller)
      // Base64 is ~33% larger than binary, so 4MB base64 ≈ 3MB binary
      const pdfBase64Size = typeof pdfBase64 === 'string' ? Buffer.byteLength(pdfBase64, 'utf8') : 0;
      const maxSize = 4 * 1024 * 1024; // 4MB in bytes
      if (pdfBase64Size > maxSize) {
        console.error(`PDF too large: ${(pdfBase64Size / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'PDF file too large',
            details: `PDF size is ${(pdfBase64Size / 1024 / 1024).toFixed(2)}MB, maximum allowed is ${(maxSize / 1024 / 1024).toFixed(2)}MB. Please reduce the PDF size or contact support.`
          })
        };
      }

      console.log(`Processing invoice email: to=${to}, from=${from}, pdfSize=${(pdfBase64Size / 1024).toFixed(2)}KB`);

      // Use provided 'from' email (logged-in user's email) - it should always be provided
      // Only fallback to environment variable if 'from' is explicitly not provided (undefined)
      let senderEmail;
      if (from !== undefined && from !== null && from !== '') {
        // 'from' field was provided, use it
        senderEmail = from;
      } else {
        // 'from' field was not provided, fallback to environment variable (for backward compatibility)
        senderEmail = process.env.SMTP2GO_FROM || process.env.EMAIL_FROM || process.env.OUTLOOK_FROM;
        console.warn('No "from" email provided in request, using environment variable fallback:', senderEmail);
      }
      
      if (!senderEmail) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: 'Missing sender email. The "from" field is required and must be the logged-in user\'s email address.' })
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
          throw new Error('Invalid PDF base64 data: must be a non-empty string');
        }
        
        // Remove data URL prefix if present (e.g., "data:application/pdf;base64,")
        const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
        
        pdfBuffer = Buffer.from(base64Data, 'base64');
        if (pdfBuffer.length === 0) {
          throw new Error('PDF buffer is empty after base64 decoding');
        }
        console.log(`PDF buffer created successfully, size: ${(pdfBuffer.length / 1024).toFixed(2)}KB`);
      } catch (bufferError) {
        console.error('Error creating PDF buffer:', bufferError);
        console.error('PDF base64 length:', pdfBase64?.length || 0);
        console.error('PDF base64 type:', typeof pdfBase64);
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'Invalid PDF data',
            details: bufferError.message || 'Failed to decode PDF base64 data'
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

      let info;
      try {
        // Set a timeout for sending email (25 seconds to stay under Netlify's 26s limit)
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email sending timed out after 25 seconds')), 25000)
        );
        
        info = await Promise.race([sendPromise, timeoutPromise]);
        console.log(`Invoice email sent successfully via ${emailService} from: ${senderEmail} to: ${to}`);
        console.log('Message ID:', info.messageId);
      } catch (sendError) {
        console.error('Error sending email:', sendError);
        throw new Error(`Failed to send email via ${emailService}: ${sendError.message}`);
      }

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
    console.error('=== FATAL ERROR in handler ===');
    console.error('Error name:', outerError?.name);
    console.error('Error message:', outerError?.message);
    console.error('Error stack:', outerError?.stack);
    console.error('Error type:', typeof outerError);
    
    // Ensure we always return a response, even if JSON.stringify fails
    let errorResponse;
    try {
      errorResponse = JSON.stringify({
        error: 'Fatal error in email function',
        details: outerError?.message || 'Unknown error',
        type: outerError?.name || 'Error'
      });
    } catch (stringifyError) {
      // If JSON.stringify fails, return a simple string
      errorResponse = JSON.stringify({
        error: 'Fatal error in email function',
        details: 'An unexpected error occurred and could not be serialized'
      });
    }
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: errorResponse
    };
  } finally {
    console.log('=== send-invoice-email function completed ===');
  }
};
