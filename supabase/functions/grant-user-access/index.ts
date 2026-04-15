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

    // Check if caller is admin
    const { data: callerData, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (callerError || callerData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can grant access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody: any;
    try {
      requestBody = await req.json();
      console.log('[grant-user-access] Successfully parsed request body');
    } catch (parseError) {
      console.error('[grant-user-access] JSON parse error:', parseError.message);
      return new Response(
        JSON.stringify({ error: `Invalid JSON: ${parseError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, role, employee_id } = requestBody;

    console.log('[grant-user-access] Received request with fields:', {
      email: email ? `${email.substring(0, 3)}...` : 'MISSING',
      password: password ? `${typeof password} - ${password.length} chars` : 'MISSING',
      role: role || 'MISSING',
      employee_id: employee_id || 'MISSING',
    });

    if (!email || !password || !role || !employee_id) {
      console.error('[grant-user-access] Validation failed for fields:', {
        email: { present: !!email, value: email },
        password: { present: !!password, type: typeof password, length: password?.length },
        role: { present: !!role, value: role },
        employee_id: { present: !!employee_id, value: employee_id },
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, password, role, employee_id',
          received: {
            email: !!email,
            password: !!password,
            role: !!role,
            employee_id: !!employee_id,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trim whitespace from inputs
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanRole = role.trim();
    const cleanEmployeeId = employee_id.trim();

    console.log('[grant-user-access] Creating auth user with:', {
      email: cleanEmail,
      passwordLength: cleanPassword.length,
      role: cleanRole,
      employee_id: cleanEmployeeId,
    });

    // Step 1: Create auth user (email_confirm: false → sends confirmation email)
    const { data: authData, error: signupError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: false,
      user_metadata: {
        role: cleanRole,
      },
    });

    if (signupError) {
      console.error('[grant-user-access] Auth signup error:', {
        message: signupError?.message,
        status: signupError?.status,
        code: signupError?.code,
      });
      return new Response(
        JSON.stringify({ 
          error: `Failed to create auth user: ${signupError?.message}`,
          details: signupError?.code
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData?.user) {
      console.error('[grant-user-access] Auth user creation succeeded but no user returned');
      return new Response(
        JSON.stringify({ error: 'Auth user created but no user ID returned' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;
    console.log('[grant-user-access] Auth user created successfully. User ID:', newUserId);

    // Step 2: Insert into public.users table (with admin privileges via SECURITY DEFINER)
    console.log('[grant-user-access] Inserting user record into users table:', {
      id: newUserId,
      role: cleanRole,
      employee_id: cleanEmployeeId,
      is_active: true,
    });

    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        role: cleanRole,
        employee_id: cleanEmployeeId,
        is_active: true,
      });

    if (insertError) {
      console.error('[grant-user-access] Users table insert error:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
      });
      // Cleanup: delete the auth user if users table insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ 
          error: `Failed to create user record: ${insertError.message}`,
          details: insertError.code
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[grant-user-access] User access granted successfully for user:', newUserId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User access granted successfully',
        user: authData.user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
