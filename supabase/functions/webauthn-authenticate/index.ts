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
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...payload } = await req.json();

    const origin = req.headers.get('Origin') || req.headers.get('Referer') || '';
    const rpID = origin ? new URL(origin).hostname : 'localhost';

    if (action === 'generate-options') {
      const { email } = payload;
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data: { users }, error: userError } = await supabaseServiceClient.auth.admin.listUsers();
      const authUser = users?.find(u => u.email === email);

      if (userError || !authUser) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data: passkeys, error: passkeyError } = await supabaseServiceClient
        .from('passkeys')
        .select('credential_id, counter')
        .eq('user_id', authUser.id);

      if (passkeyError || !passkeys?.length) {
        return new Response(
          JSON.stringify({ error: 'No passkeys registered for this user' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const options = await generateAuthenticationOptions({
        rpID: rpID,
        allowCredentials: passkeys.map((pk: any) => ({
          id: base64Decode(pk.credential_id),
          type: 'public-key',
        })),
        userVerification: 'required',
      });

      return new Response(
        JSON.stringify({ 
          options, 
          challenge: options.challenge,
          userId: authUser.id 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'verify-authentication') {
      const { credential, expectedChallenge, userId } = payload as {
        credential: AuthenticationResponseJSON;
        expectedChallenge: string;
        userId: string;
      };

      if (!credential || !expectedChallenge || !userId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data: passkeyData, error: passkeyError } = await supabaseServiceClient
        .from('passkeys')
        .select('*')
        .eq('user_id', userId)
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
        await supabaseServiceClient
          .from('passkeys')
          .update({ 
            counter: verification.authenticationInfo.newCounter,
            last_used_at: new Date().toISOString()
          })
          .eq('id', passkeyData.id);

        const { data: { user: authUser } } = await supabaseServiceClient.auth.admin.getUserById(userId);
        
        if (!authUser?.email) {
          return new Response(
            JSON.stringify({ error: 'User email not found' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const { data: linkData, error: linkError } = await supabaseServiceClient.auth.admin.generateLink({
          type: 'magiclink',
          email: authUser.email,
        });

        if (linkError || !linkData?.properties?.hashed_token) {
          return new Response(
            JSON.stringify({ error: 'Failed to create session link' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Authentication successful',
            user: authUser,
            token_hash: linkData.properties.hashed_token,
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
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
    console.error('Error in webauthn-authenticate:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});