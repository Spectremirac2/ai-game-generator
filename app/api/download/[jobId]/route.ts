/**
 * Game Download API
 *
 * Serves generated game packages for download
 */

import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/services/storage/storage-service";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  try {
    logger.info("Download API: Request received", { jobId });

    // Validate job ID format
    if (!jobId || jobId.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JOB_ID",
            message: "Invalid or missing job ID",
          },
        },
        { status: 400 }
      );
    }

    // Get package from storage
    const packageBuffer = await storageService.getAsset(jobId, "package");

    logger.info("Download API: Package retrieved", {
      jobId,
      size: packageBuffer.length,
    });

    // Return the ZIP file
    return new NextResponse(packageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${jobId}.zip"`,
        "Content-Length": packageBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("Download API: Error occurred", { jobId, error });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PACKAGE_NOT_FOUND",
            message: "Game package not found or expired",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DOWNLOAD_ERROR",
          message: "Failed to download game package",
        },
      },
      { status: 500 }
    );
  }
}
