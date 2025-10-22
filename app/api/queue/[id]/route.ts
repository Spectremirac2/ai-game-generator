import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getJobStatus } from '@/lib/queue'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const job = await getJobStatus(id)
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Job not found.' },
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          gameId: job.gameId,
          error: job.errorMessage,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('[queue-job] GET error', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Failed to fetch job status.' },
      },
      { status: 500 },
    )
  }
}

