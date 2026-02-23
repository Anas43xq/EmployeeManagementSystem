import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sendBanNotificationEmail(email: string, reason: string | null, banDuration: string): Promise<void> {
  const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || smtpUser;

  if (!smtpUser || !smtpPass) {
    console.error("SMTP credentials not configured, skipping ban notification email");
    return;
  }

  const durationText = banDuration === 'permanent' 
    ? 'permanently' 
    : `for ${banDuration} hours`;

  const reasonText = reason 
    ? `<p><strong>Reason:</strong> ${reason}</p>` 
    : '';

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">DevTeam Hub</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Account Notification</p>
        </div>
        <div class="content">
          <span class="badge">ACCOUNT SUSPENDED</span>
          <h2 style="margin-top: 20px; color: #1f2937;">Your Account Has Been Suspended</h2>
          <div style="margin-top: 20px; line-height: 1.8;">
            <p>We regret to inform you that your account has been suspended ${durationText}.</p>
            ${reasonText}
            <p>During this suspension period, you will not be able to access the system.</p>
            <p>If you believe this action was taken in error, please contact your HR administrator or supervisor.</p>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">This is an automated notification from DevTeam Hub</p>
          <p style="margin: 10px 0 0 0;">Please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: 'Account Suspended - DevTeam Hub',
      html: htmlTemplate,
    });

    console.log(`Ban notification email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send ban notification email: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerData, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (callerError || callerData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can manage user status' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userId, banDuration, reason } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot modify your own account status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'ban': {
        const duration = banDuration === 'permanent' ? '876000h' : `${banDuration}h`; // 100 years for permanent
        
        // Get user email before banning
        const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userError) throw userError;
        const userEmail = targetUser.user.email;

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: duration,
        });

        if (error) throw error;

        await supabaseAdmin
          .from('users')
          .update({
            is_active: false,
            banned_at: new Date().toISOString(),
            ban_reason: reason || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // Send ban notification email
        if (userEmail) {
          await sendBanNotificationEmail(userEmail, reason || null, banDuration || 'permanent');
        }

        result = { success: true, message: 'User banned successfully', user: data.user };
        break;
      }

      case 'unban': {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        });

        if (error) throw error;

        await supabaseAdmin
          .from('users')
          .update({
            is_active: true,
            banned_at: null,
            ban_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        result = { success: true, message: 'User unbanned successfully', user: data.user };
        break;
      }

      case 'deactivate': {
        await supabaseAdmin
          .from('users')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        result = { success: true, message: 'User deactivated successfully' };
        break;
      }

      case 'activate': {
        await supabaseAdmin
          .from('users')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        result = { success: true, message: 'User activated successfully' };
        break;
      }

      case 'get-status': {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error) throw error;

        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('is_active, banned_at, ban_reason')
          .eq('id', userId)
          .single();

        result = {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            banned_until: data.user.banned_until,
            is_banned: !!data.user.banned_until && new Date(data.user.banned_until) > new Date(),
            is_active: userData?.is_active ?? true,
            banned_at: userData?.banned_at,
            ban_reason: userData?.ban_reason,
          }
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: ban, unban, deactivate, activate, or get-status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to manage user status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
