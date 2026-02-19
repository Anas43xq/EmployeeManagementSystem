import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is from an authenticated admin
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

    // Verify the caller is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin
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

    // Prevent self-modification
    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot modify your own account status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'ban': {
        // Ban duration in hours (e.g., 24 for 1 day, 720 for 30 days, 'none' for permanent)
        const duration = banDuration === 'permanent' ? '876000h' : `${banDuration}h`; // 100 years for permanent
        
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: duration,
        });

        if (error) throw error;

        // Update the users table with ban info
        await supabaseAdmin
          .from('users')
          .update({
            is_active: false,
            banned_at: new Date().toISOString(),
            ban_reason: reason || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        result = { success: true, message: 'User banned successfully', user: data.user };
        break;
      }

      case 'unban': {
        // Remove ban by setting ban_duration to 'none'
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        });

        if (error) throw error;

        // Update the users table
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
        // Deactivate user without banning (just disable in our system)
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
        // Activate user
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
        // Get user's current ban status from Supabase Auth
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
    console.error('Error managing user status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to manage user status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
