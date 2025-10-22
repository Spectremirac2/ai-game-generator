import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateGameAssetSet,
  generateSprite,
  SPRITE_PRESETS,
  TEMPLATE_ASSET_DEFINITIONS,
  TemplateKey,
} from "@/lib/dalle";

const styles = ["pixel-art", "cartoon", "2d-vector", "hand-drawn"] as const;

const SingleSpriteRequestSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  style: z.enum(styles).default("cartoon"),
});

const AssetSetRequestSchema = z.object({
  template: z.enum(["platformer", "shooter", "puzzle", "racing"]),
  style: z.enum(styles).default("cartoon"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.template) {
      const parsed = AssetSetRequestSchema.parse(body);
      const assets = await generateGameAssetSet(parsed.template as TemplateKey, parsed.style);
      return NextResponse.json(
        {
          success: true,
          assets,
          count: Object.keys(assets).length,
        },
        { status: 200 },
      );
    }

    const parsed = SingleSpriteRequestSchema.parse(body ?? {});
    const sprite = await generateSprite(parsed);
    return NextResponse.json(
      {
        success: true,
        sprite,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Validation error",
            details: error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    console.error("[assets-api] POST error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to generate assets" },
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const templateParam = searchParams.get("template");

    if (templateParam) {
      const parsed = AssetSetRequestSchema.shape.template.safeParse(templateParam);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: { message: "Invalid template parameter" },
          },
          { status: 400 },
        );
      }

      const template = parsed.data as TemplateKey;

      return NextResponse.json(
        {
          success: true,
          template,
          requiredAssets: TEMPLATE_ASSET_DEFINITIONS[template].map((asset) => asset.key),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        presets: SPRITE_PRESETS,
        styles,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[assets-api] GET error", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to fetch asset presets" },
      },
      { status: 500 },
    );
  }
}

