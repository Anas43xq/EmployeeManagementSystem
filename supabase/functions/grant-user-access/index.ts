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

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const jsonResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const parseBearerToken = (req: Request): string => {
  const authHeader = req.headers.get('Authorization');
  log('[grant-user-access] Auth header received:', !!authHeader);

  if (!authHeader) {
    throw new ApiError(401, 'Missing authorization header');
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new ApiError(401, 'Invalid authorization header');
  }

  return match[1];
};

const decodeJwtUserId = (token: string): string | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch (error) {
    log('[grant-user-access] JWT decode failed:', error?.message ?? error);
    return null;
  }
};

const verifyAdminCaller = async (supabaseAdmin: any, token: string) => {
  const callerId = decodeJwtUserId(token);
  if (!callerId) {
    throw new ApiError(401, 'Invalid authentication token');
  }

  log('[grant-user-access] Verifying admin caller:', callerId);

  const { data: callerData, error: callerError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', callerId)
    .single();

  if (callerError || !callerData || callerData.role !== 'admin') {
    log('[grant-user-access] Admin verification failed:', {
      role: callerData?.role,
      error: callerError?.message,
    });
    throw new ApiError(403, 'Only admins can grant access');
  }

  return callerId;
};

type GrantAccessRequest = {
  email: string;
  password: string;
  role: string;
  employee_id: string;
};

const parseGrantAccessRequest = async (req: Request): Promise<GrantAccessRequest> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    throw new ApiError(400, `Invalid JSON: ${error?.message ?? 'Unable to parse request body'}`);
  }

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Request body must be an object');
  }

  const { email, password, role, employee_id } = body as Record<string, unknown>;

  if (!email || !password || !role || !employee_id) {
    throw new ApiError(400, 'Missing required fields: email, password, role, employee_id');
  }

  return {
    email: String(email).trim(),
    password: String(password),
    role: String(role).trim(),
    employee_id: String(employee_id).trim(),
  };
};

const createAuthUser = async (supabaseAdmin: any, payload: GrantAccessRequest) => {
  log('[grant-user-access] Creating auth user for email:', payload.email);

  const { data: authData, error: signupError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: false,
  });

  if (signupError) {
    log('[grant-user-access] Auth create error:', signupError);
    throw new ApiError(400, `Failed to create auth user: ${signupError.message || 'Unknown error'}`);
  }

  if (!authData?.user?.id) {
    throw new ApiError(400, 'Auth user created but no user ID returned');
  }

  return authData.user.id;
};

const updateAuthUserMetadata = async (
  supabaseAdmin: any,
  userId: string,
  role: string,
  employeeId: string
) => {
  const { error: updateMetaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: {
      role,
      employee_id: employeeId,
    },
  });

  if (updateMetaError) {
    log('[grant-user-access] Metadata update failed:', updateMetaError);
    return false;
  }

  log('[grant-user-access] Metadata updated successfully');
  return true;
};

const getUserRow = async (supabaseAdmin: any, userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, role, employee_id')
    .eq('id', userId)
    .single();

  if (error) {
    log('[grant-user-access] User row lookup error:', error);
    return null;
  }

  return data;
};

const waitForUserRow = async (supabaseAdmin: any, userId: string, attempts = 6, delayMs = 300) => {
  for (let i = 0; i < attempts; i += 1) {
    const user = await getUserRow(supabaseAdmin, userId);
    if (user) {
      return user;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new ApiError(500, 'Supabase service configuration is missing');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const token = parseBearerToken(req);
    await verifyAdminCaller(supabaseAdmin, token);

    const payload = await parseGrantAccessRequest(req);

    log('[grant-user-access] Validated request payload:', {
      email: payload.email ? `${payload.email.substring(0, 3)}...` : 'MISSING',
      role: payload.role,
      employee_id: payload.employee_id,
    });

    const newUserId = await createAuthUser(supabaseAdmin, payload);
    await updateAuthUserMetadata(supabaseAdmin, newUserId, payload.role, payload.employee_id);

    log('[grant-user-access] Waiting for users table row for user:', newUserId);
    const createdUser = await waitForUserRow(supabaseAdmin, newUserId);

    if (!createdUser) {
      log('[grant-user-access] User row was not created in time, deleting auth user:', newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new ApiError(400, 'User record creation failed. Trigger did not fire or employee not found.');
    }

    log('[grant-user-access] User created successfully:', {
      id: newUserId,
      role: createdUser.role,
      employee_id: createdUser.employee_id,
    });

    return jsonResponse({
      success: true,
      message: 'User access granted successfully',
      user: { id: newUserId },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    console.error('[grant-user-access] Unexpected error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
