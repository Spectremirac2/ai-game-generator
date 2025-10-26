// Supabase Edge Function - Orchestrator
// This is the future migration target for the main orchestration logic

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GameGenerationRequest {
  gameType: "platformer" | "puzzle" | "shooter" | "racing" | "custom";
  theme: string;
  playerDescription: string;
  difficulty: "easy" | "medium" | "hard";
  mechanics?: string[];
}

interface GenerationJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  userId: string;
  request: GameGenerationRequest;
  assets?: {
    sprites: string[];
    code: string;
    template: string;
  };
  downloadUrl?: string;
  error?: string;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const body: GameGenerationRequest = await req.json();

    // Validate request
    if (!body.gameType || !body.theme || !body.playerDescription) {
      throw new Error("Missing required fields");
    }

    // Create job in database
    const jobId = crypto.randomUUID();
    const job: GenerationJob = {
      id: jobId,
      status: "pending",
      userId: user.id,
      request: body,
    };

    // Store job
    const { error: insertError } = await supabaseClient
      .from("generation_jobs")
      .insert({
        id: job.id,
        user_id: job.userId,
        status: job.status,
        request: job.request,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    // Trigger async generation (in production, this would be a separate worker)
    // For now, return job ID for polling
    console.log(`Created generation job ${jobId} for user ${user.id}`);

    // TODO: Implement parallel AI generation
    // - Call Visual Department (DALL-E/Replicate)
    // - Call Code Department (GPT-4)
    // - Fetch template
    // - Assemble game
    // - Upload to storage

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        status: job.status,
        message: "Game generation started",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Orchestrator error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
