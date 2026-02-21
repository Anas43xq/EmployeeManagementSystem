import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import {
  verifyRegistrationResponse,
  generateRegistrationOptions,
} from "https://esm.sh/@simplewebauthn/server@9.0.1";
import type {
  VerifiedRegistrationResponse,
  RegistrationResponseJSON,
} from "https://esm.sh/@simplewebauthn/server@9.0.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PasskeyRegistration {
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName: string;
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
      { auth: { autoRefreshToken: false, persistSession: false } }
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
      const { deviceName } = payload;
      
      if (!deviceName) {
        return new Response(
          JSON.stringify({ error: 'Device name is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data: existingPasskeys } = await supabaseClient
        .from('passkeys')
        .select('credential_id')
        .eq('user_id', user.id);

      const userIdBytes = new Uint8Array(user.id.length);
      for (let i = 0; i < user.id.length; i++) {
        userIdBytes[i] = user.id.charCodeAt(i);
      }

      const options = await generateRegistrationOptions({
        rpName: 'DevTeamHub',
        rpID: rpID,
        userID: userIdBytes,
        userName: user.email ?? '',
        userDisplayName: user.email ?? '',
        attestationType: 'none',
        excludeCredentials: existingPasskeys?.map(pk => ({
          id: Uint8Array.from(atob(pk.credential_id), c => c.charCodeAt(0)),
          type: 'public-key',
          transports: ['internal'],
        })) || [],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
      });
      
      return new Response(
        JSON.stringify({ options, challenge: options.challenge }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify-registration') {
      const { credential, deviceName, expectedChallenge } = payload as {
        credential: RegistrationResponseJSON;
        deviceName: string;
        expectedChallenge: string;
      };

      if (!credential || !deviceName || !expectedChallenge) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
        
        const { error: insertError } = await supabaseClient
          .from('passkeys')
          .insert({
            user_id: user.id,
            credential_id: base64Encode(credentialID),
            public_key: base64Encode(credentialPublicKey),
            counter: counter,
            device_name: deviceName,
          });

        if (insertError) {
          return new Response(
            JSON.stringify({ error: 'Failed to save passkey', details: insertError.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Passkey registered successfully',
            credentialId: base64Encode(credentialID)
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
            status: 400, 
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
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});