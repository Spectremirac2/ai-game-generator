"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameTemplate } from "@/types/game";

interface GamePromptFormProps {
  onGenerate: (prompt: string, template: GameTemplate) => void;
  isGenerating: boolean;
}

type TemplateOption = {
  id: GameTemplate;
  name: string;
  icon: string;
  description: string;
};

const TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: "platformer", name: "Platformer", icon: "🏃", description: "Jump and run game" },
  { id: "puzzle", name: "Puzzle", icon: "🧩", description: "Match-3 or logic game" },
  { id: "shooter", name: "Shooter", icon: "🎯", description: "Top-down shooter" },
  { id: "racing", name: "Racing", icon: "🏎️", description: "Car racing game" },
  { id: "custom", name: "Custom", icon: "✨", description: "Anything you want" },
];

const EXAMPLE_PROMPTS: string[] = [
  "Create a neon cyberpunk platformer with wall-jumping and energy shields.",
  "Design a cozy match-3 puzzle set in a magical bakery with combo power-ups.",
  "Build a retro top-down shooter where drones defend a space station.",
  "Generate a multiplayer racing game with drifting and dynamic weather.",
  "Craft an underwater adventure collecting pearls while avoiding sea creatures.",
];

const MAX_PROMPT_LENGTH = 500;

const GamePromptForm = ({ onGenerate, isGenerating }: GamePromptFormProps) => {
  const [prompt, setPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate>("platformer");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  const isSubmitDisabled = useMemo(
    () => prompt.trim().length === 0 || isGenerating,
    [prompt, isGenerating]
  );

  const handlePromptChange = (value: string) => {
    setPrompt(value.slice(0, MAX_PROMPT_LENGTH));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating) return;
    onGenerate(trimmedPrompt, selectedTemplate);
  };

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6 shadow-xl transition-shadow hover:shadow-2xl sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-blue-900 sm:text-2xl">
            Generate your next game concept
          </h2>
          <p className="mt-2 text-sm text-blue-700 sm:text-base">
            Choose a template, describe your idea, and we&apos;ll build a playable Phaser game.
          </p>
        </div>

        <section>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-blue-800">
            Select a template
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TEMPLATE_OPTIONS.map((template) => {
              const isActive = selectedTemplate === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={[
                    "group flex h-full flex-col items-start rounded-2xl border bg-white p-4 text-left transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    isActive
                      ? "border-blue-500 shadow-lg ring-1 ring-blue-400"
                      : "border-transparent shadow hover:-translate-y-0.5 hover:shadow-lg",
                  ].join(" ")}
                >
                  <span className="text-2xl">{template.icon}</span>
                  <span className="mt-3 text-base font-semibold text-blue-900">
                    {template.name}
                  </span>
                  <span className="mt-1 text-sm text-blue-600">{template.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-blue-800">
            Describe your game
          </h3>
          <div className="rounded-3xl border border-blue-200 bg-white p-4 shadow-inner transition-colors focus-within:border-blue-400">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(event) => handlePromptChange(event.target.value)}
              placeholder="Example: Create a pixel-art platformer with dynamic weather, hidden collectibles, and a friendly robot companion that helps solve puzzles."
              maxLength={MAX_PROMPT_LENGTH}
              className="min-h-[120px] w-full resize-none bg-transparent text-base text-blue-900 placeholder:text-blue-300 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-blue-500">
              <span>Share as many details as you like to customize your game.</span>
              <span>
                {prompt.length}/{MAX_PROMPT_LENGTH}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-blue-800">
            Need inspiration?
          </h3>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handlePromptChange(example)}
                className="group rounded-full border border-blue-200 bg-white px-4 py-2 text-sm text-blue-600 transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={[
            "relative flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white transition-all",
            "bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-lg hover:from-blue-600 hover:via-blue-700 hover:to-blue-800",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2",
            isSubmitDisabled ? "cursor-not-allowed opacity-60" : "",
          ].join(" ")}
        >
          {isGenerating ? (
            <>
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating your game...
            </>
          ) : (
            "Generate Game"
          )}
        </button>
      </form>
    </div>
  );
};

export default GamePromptForm;
