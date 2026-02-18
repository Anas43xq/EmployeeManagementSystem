import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import {
  verifyAuthenticationResponse,
  generateAuthenticationOptions,
} from "https://esm.sh/@simplewebauthn/server@9.0.1";
import type {
  VerifiedAuthenticationResponse,
  AuthenticationResponseJSON,
} from "https://esm.sh/@simplewebauthn/server@9.0.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function base64urlToBase64(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';
  return b64;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...payload } = await req.json();

    const origin = req.headers.get('Origin') || req.headers.get('Referer') || '';
    const rpID = origin ? new URL(origin).hostname : 'localhost';

    if (action === 'generate-options') {
      const { data: passkeys, error: passkeyError } = await supabaseClient
        .from('passkeys')
        .select('credential_id, counter')
        .eq('user_id', user.id);

      if (passkeyError || !passkeys?.length) {
        return new Response(
          JSON.stringify({ error: 'No passkeys registered for attendance' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const options = await generateAuthenticationOptions({
        rpID: rpID,
        allowCredentials: passkeys.map((pk) => ({
          id: base64Decode(pk.credential_id),
          type: 'public-key',
        })),
        userVerification: 'required',
      });

      return new Response(
        JSON.stringify({ 
          options, 
          challenge: options.challenge 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify-attendance') {
      const { credential, expectedChallenge, attendanceType } = payload as {
        credential: AuthenticationResponseJSON;
        expectedChallenge: string;
        attendanceType: 'check-in' | 'check-out';
      };

      if (!credential || !expectedChallenge || !attendanceType) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data: passkeyData, error: passkeyError } = await supabaseClient
        .from('passkeys')
        .select('*')
        .eq('user_id', user.id)
        .eq('credential_id', base64urlToBase64(credential.rawId))
        .single();

      if (passkeyError || !passkeyData) {
        return new Response(
          JSON.stringify({ error: 'Passkey not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: base64Decode(passkeyData.credential_id),
          credentialPublicKey: base64Decode(passkeyData.public_key),
          counter: passkeyData.counter,
        },
        requireUserVerification: true,
      });

      if (verification.verified) {
        await supabaseClient
          .from('passkeys')
          .update({ 
            counter: verification.authenticationInfo.newCounter,
            last_used_at: new Date().toISOString()
          })
          .eq('id', passkeyData.id);

        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('employee_id, employees(id, first_name, last_name)')
          .eq('id', user.id)
          .single();

        if (userError || !userData?.employee_id) {
          return new Response(
            JSON.stringify({ error: 'Employee record not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

        const { data: existingAttendance } = await supabaseClient
          .from('attendance')
          .select('*')
          .eq('employee_id', userData.employee_id)
          .eq('date', today)
          .single();

        let attendanceResult;

        if (existingAttendance) {
          const updateData = attendanceType === 'check-in' ? 
            { 
              check_in: currentTime,
              attendance_method: 'passkey',
              verification_type: payload.verificationType || 'device',
              device_info: {
                device_name: passkeyData.device_name,
                verification_time: new Date().toISOString(),
                user_agent: req.headers.get('user-agent')
              }
            } : 
            { 
              check_out: currentTime,
              status: 'present'
            };

          const { data, error } = await supabaseClient
            .from('attendance')
            .update(updateData)
            .eq('id', existingAttendance.id)
            .select()
            .single();

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Failed to update attendance', details: error.message }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          attendanceResult = data;
        } else {
          if (attendanceType === 'check-out') {
            return new Response(
              JSON.stringify({ error: 'Cannot check out without checking in first' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          const { data, error } = await supabaseClient
            .from('attendance')
            .insert({
              employee_id: userData.employee_id,
              date: today,
              check_in: currentTime,
              status: 'present',
              attendance_method: 'passkey',
              verification_type: payload.verificationType || 'device',
              device_info: {
                device_name: passkeyData.device_name,
                verification_time: new Date().toISOString(),
                user_agent: req.headers.get('user-agent')
              }
            })
            .select()
            .single();

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Failed to create attendance', details: error.message }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          attendanceResult = data;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `${attendanceType === 'check-in' ? 'Check-in' : 'Check-out'} successful`,
            attendance: attendanceResult,
            employee: userData.employees
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Passkey verification failed' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-passkey-attendance:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});