import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.9";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailNotificationRequest {
  to: string;
  subject: string;
  body: string;
  type: 'leave_approved' | 'leave_rejected' | 'leave_pending' | 'general';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, body, type }: EmailNotificationRequest = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || smtpUser;

    if (!smtpUser || !smtpPass) {
      console.error("SMTP credentials not configured");
      throw new Error("SMTP credentials not configured. Set SMTP_USER and SMTP_PASS (Gmail App Password).");
    }

    const htmlTemplate = generateEmailTemplate(subject, body, type);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: fromEmail,
      to: to,
      subject: subject,
      html: htmlTemplate,
    });

    console.log(`Email sent successfully to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Subject: ${subject}`);
    console.log(`Type: ${type}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        details: {
          to,
          subject,
          type,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error sending email via SMTP:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: "Failed to send email notification",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function generateEmailTemplate(subject: string, body: string, type: string): string {
  const styles = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }
  `;

  const badgeClass = type.includes('approved') ? 'badge-success' :
                     type.includes('pending') ? 'badge-warning' : 'badge-info';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${styles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">StaffHub</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">HR Notifications</p>
        </div>
        <div class="content">
          <span class="badge ${badgeClass}">${type.toUpperCase().replace(/_/g, ' ')}</span>
          <h2 style="margin-top: 20px; color: #1f2937;">${subject}</h2>
          <div style="margin-top: 20px; line-height: 1.8;">
            ${body}
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">This is an automated notification from StaffHub — Al-Mustaqbal University</p>
          <p style="margin: 10px 0 0 0;">Please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
