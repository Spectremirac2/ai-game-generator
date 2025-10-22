"use client";

import { useCallback, useState } from "react";

import GamePreview from "@/components/GamePreview";
import GamePromptForm from "@/components/GamePromptForm";
import type { GeneratedGame, GameTemplate } from "@/types/game";

type GenerateResponse =
  | {
      success: true;
      game: GeneratedGame;
      meta?: unknown;
    }
  | {
      success: false;
      error?: {
        message?: string;
      };
    };

const LandingPage = () => {
  const [generatedGame, setGeneratedGame] = useState<GeneratedGame | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (prompt: string, template: GameTemplate) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, template }),
      });

      let parsed: GenerateResponse;
      try {
        parsed = (await response.json()) as GenerateResponse;
      } catch {
        parsed = {
          success: false,
          error: { message: "Failed to parse response from generator service." },
        };
      }

      if (!response.ok || !parsed.success) {
        const message =
          (!parsed.success && parsed.error?.message) ||
          "The generator is currently unavailable. Please try again shortly.";
        setError(message);
        setGeneratedGame(null);
        return;
      }

      setGeneratedGame(parsed.game);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected error occurred while generating the game.";
      setError(message);
      setGeneratedGame(null);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleRegenerate = useCallback(() => {
    setGeneratedGame(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="text-center">
          <div className="text-5xl sm:text-6xl">🎮</div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-5xl">
            AI Game Generator
          </h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            Describe your game idea and watch AI bring it to life.
          </p>
          {error ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 shadow">
              {error}
            </div>
          ) : null}
        </header>

        {!generatedGame ? (
          <GamePromptForm onGenerate={handleGenerate} isGenerating={isGenerating} />
        ) : (
          <GamePreview game={generatedGame} onRegenerate={handleRegenerate} />
        )}

        <footer className="pb-12 text-center text-xs text-slate-500 sm:text-sm">
          Powered by OpenAI GPT-4 &amp; DALL-E 3
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
