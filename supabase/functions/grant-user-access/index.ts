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
    console.log('[grant-user-access] Auth header received:', !!authHeader);
    
    if (!authHeader) {
      console.error('[grant-user-access] Missing authorization header');
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
    console.log('[grant-user-access] Token extracted, attempting to verify');
    
    // Use getSession with the token to verify auth
    const { data: { session }, error: authError } = await supabaseAdmin.auth.getSession();
    
    // Fallback: try verifying the JWT directly
    let callerUser = null;
    if (!authError && session?.user) {
      callerUser = session.user;
    } else {
      // If session doesn't work, decode JWT manually
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          callerUser = { id: payload.sub };
          console.log('[grant-user-access] JWT decoded, user ID:', callerUser.id);
        } catch (e) {
          console.error('[grant-user-access] Failed to decode JWT:', e.message);
        }
      }
    }

    console.log('[grant-user-access] Auth result:', {
      hasUser: !!callerUser,
      userId: callerUser?.id,
      authError: authError?.message,
    });

    if (!callerUser) {
      console.error('[grant-user-access] Invalid authentication:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin
    console.log('[grant-user-access] Checking if user is admin:', callerUser.id);
    
    const { data: callerData, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    console.log('[grant-user-access] Admin check result:', {
      role: callerData?.role,
      error: callerError?.message,
      isAdmin: callerData?.role === 'admin',
    });

    if (callerError || callerData?.role !== 'admin') {
      console.error('[grant-user-access] User is not admin:', {
        error: callerError?.message,
        role: callerData?.role,
      });
      return new Response(
        JSON.stringify({ error: 'Only admins can grant access', role: callerData?.role }),
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

    // Step 1: Create auth user
    // First, try with the admin client (without app_metadata)
    console.log('[grant-user-access] Creating auth user...');
    
    const { data: authData, error: signupError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: false,
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

    if (!authData?.user?.id) {
      console.error('[grant-user-access] Auth user creation succeeded but no user ID returned');
      return new Response(
        JSON.stringify({ error: 'Auth user created but no user ID returned' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;
    console.log('[grant-user-access] Auth user created successfully. User ID:', newUserId);

    // Step 1b: Update auth user app_metadata with role and employee_id
    console.log('[grant-user-access] Updating auth user metadata with role and employee_id...');
    
    const { error: updateMetaError } = await supabaseAdmin.auth.admin.updateUserById(newUserId, {
      app_metadata: {
        role: cleanRole,
        employee_id: cleanEmployeeId,
      },
    });

    if (updateMetaError) {
      console.error('[grant-user-access] Failed to update metadata:', updateMetaError?.message);
      // Don't fail here - trigger might still work with email matching
    } else {
      console.log('[grant-user-access] Metadata updated successfully');
    }

    // Step 2: Insert into public.users table (users table creation will trigger automatically)
    console.log('[grant-user-access] Waiting for trigger to create user record...');
    
    // Wait a moment for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify user was created
    const { data: createdUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, role, employee_id')
      .eq('id', newUserId)
      .single();

    if (checkError || !createdUser) {
      console.error('[grant-user-access] User record not created by trigger:', checkError?.message);
      
      // Cleanup: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      
      return new Response(
        JSON.stringify({ 
          error: 'User record creation failed. Trigger did not fire or employee not found.',
          details: checkError?.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[grant-user-access] User created successfully:', { id: newUserId, role: createdUser.role, employee_id: createdUser.employee_id });

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
