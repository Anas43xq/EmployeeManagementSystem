import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const isDev = Deno.env.get('ENVIRONMENT') === 'development';
const log = (msg: string, data?: any) => {
  if (isDev) console.log(msg, data);
};

const respond = (status: number, data: any) => 
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respond(401, { error: 'Missing authorization header' });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      console.error('[revoke-user-access] Auth failed:', authError?.message);
      return respond(401, { error: 'Invalid authentication' });
    }

    const { data: callerData, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (callerError || callerData?.role !== 'admin') {
      console.error('[revoke-user-access] Not admin:', callerData?.role);
      return respond(403, { error: 'Only admins can revoke user access' });
    }

    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return respond(400, { error: `Invalid JSON: ${(parseError as Error).message}` });
    }

    const { userId } = requestBody;

    if (!userId) {
      return respond(400, { error: 'User ID is required' });
    }

    if (userId === callerUser.id) {
      return respond(400, { error: 'Cannot revoke your own access' });
    }

    log('[revoke-user-access] Revoking access for user:', userId);

    // Delete from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('[revoke-user-access] Auth delete failed:', authDeleteError.message);
    }

    // Delete from public.users
    const { error: publicDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (publicDeleteError) {
      console.error('[revoke-user-access] Public delete failed:', publicDeleteError.message);
      return respond(400, { error: `Failed to revoke user access: ${publicDeleteError.message}` });
    }

    log('[revoke-user-access] Successfully revoked access for user:', userId);
    return respond(200, { success: true, message: 'User access revoked successfully', userId });
  } catch (error) {
    console.error('[revoke-user-access] Unexpected error:', (error as Error).message);
    return respond(500, { error: `Internal server error: ${(error as Error).message}` });
  }
});
