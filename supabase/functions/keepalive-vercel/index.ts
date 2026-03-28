import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let vercelUrl = Deno.env.get("VITE_APP_URL");
    
    if (!vercelUrl) {
      const appUrl = Deno.env.get("VITE_APP_URL");
      if (appUrl) {
        // Remove https:// or http:// prefix
        vercelUrl = appUrl.replace(/^https?:\/\//, "");
      }
    }

    if (!vercelUrl) {
      throw new Error("VERCEL_DEPLOYMENT_URL or VITE_APP_URL environment variable not set");
    }

    const endpoint = `https://${vercelUrl}/api/keepalive-supabase`;
    
    console.log(`[Keepalive-Vercel] Calling Vercel endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    console.log(
      `[Keepalive-Vercel] Vercel response: ${response.status} - ${responseText}`
    );

    if (!response.ok) {
      throw new Error(
        `Vercel endpoint returned ${response.status}: ${responseText}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Vercel keep-alive executed successfully",
        timestamp: new Date().toISOString(),
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Keepalive-Vercel] Error: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
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
