import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      received: body,
      headers: Object.fromEntries(request.headers.entries()),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: error?.constructor?.name,
    }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasRedis: !!process.env.UPSTASH_REDIS_REST_URL,
      hasDB: !!process.env.POSTGRES_PRISMA_URL,
    }
  });
}
