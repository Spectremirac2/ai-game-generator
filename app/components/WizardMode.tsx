"use client";

/**
 * Wizard Mode Component
 *
 * A multi-step guided experience for creating games.
 * Users answer simple questions to build their game specification.
 */

import { useState } from "react";
import type { GameTemplate } from "@/types/game";

interface WizardModeProps {
  onComplete: (specification: GameSpecification) => void;
  isGenerating: boolean;
}

export interface GameSpecification {
  gameType: GameTemplate;
  theme: string;
  playerDescription: string;
  difficulty: "easy" | "medium" | "hard";
  mechanics: string[];
  enemies: string[];
  style: "pixel-art" | "hand-drawn" | "realistic" | "cartoon";
}

type WizardStep = "game-type" | "theme" | "player" | "difficulty" | "style" | "mechanics" | "review";

const WizardMode = ({ onComplete, isGenerating }: WizardModeProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("game-type");
  const [spec, setSpec] = useState<Partial<GameSpecification>>({
    mechanics: [],
    enemies: [],
  });

  const updateSpec = (updates: Partial<GameSpecification>) => {
    setSpec((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    const steps: WizardStep[] = ["game-type", "theme", "player", "difficulty", "style", "mechanics", "review"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: WizardStep[] = ["game-type", "theme", "player", "difficulty", "style", "mechanics", "review"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleComplete = () => {
    if (isCompleteSpec(spec)) {
      onComplete(spec);
    }
  };

  const isCompleteSpec = (s: Partial<GameSpecification>): s is GameSpecification => {
    return !!(s.gameType && s.theme && s.playerDescription && s.difficulty && s.style);
  };

  const progress = {
    "game-type": 14,
    theme: 28,
    player: 42,
    difficulty: 57,
    style: 71,
    mechanics: 85,
    review: 100,
  };

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-purple-50 via-white to-blue-100 p-6 shadow-xl sm:p-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progress[currentStep]}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm text-gray-600">
          Step {Object.keys(progress).indexOf(currentStep) + 1} of {Object.keys(progress).length}
        </p>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === "game-type" && (
          <GameTypeStep
            selected={spec.gameType}
            onSelect={(type) => {
              updateSpec({ gameType: type });
              nextStep();
            }}
          />
        )}

        {currentStep === "theme" && (
          <ThemeStep
            value={spec.theme || ""}
            onChange={(theme) => updateSpec({ theme })}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === "player" && (
          <PlayerStep
            value={spec.playerDescription || ""}
            onChange={(playerDescription) => updateSpec({ playerDescription })}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === "difficulty" && (
          <DifficultyStep
            selected={spec.difficulty}
            onSelect={(difficulty) => {
              updateSpec({ difficulty });
              nextStep();
            }}
            onBack={prevStep}
          />
        )}

        {currentStep === "style" && (
          <StyleStep
            selected={spec.style}
            onSelect={(style) => {
              updateSpec({ style });
              nextStep();
            }}
            onBack={prevStep}
          />
        )}

        {currentStep === "mechanics" && (
          <MechanicsStep
            gameType={spec.gameType!}
            selected={spec.mechanics || []}
            onUpdate={(mechanics) => updateSpec({ mechanics })}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === "review" && (
          <ReviewStep
            spec={spec}
            onEdit={(step) => setCurrentStep(step)}
            onComplete={handleComplete}
            onBack={prevStep}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </div>
  );
};

// Individual step components

const GameTypeStep = ({
  selected,
  onSelect,
}: {
  selected?: GameTemplate;
  onSelect: (type: GameTemplate) => void;
}) => {
  const types = [
    { id: "platformer" as GameTemplate, name: "Platformer", icon: "🏃", description: "Jump, run, and explore levels" },
    { id: "puzzle" as GameTemplate, name: "Puzzle", icon: "🧩", description: "Solve challenges and match patterns" },
    { id: "shooter" as GameTemplate, name: "Shooter", icon: "🎯", description: "Aim and shoot enemies" },
    { id: "racing" as GameTemplate, name: "Racing", icon: "🏎️", description: "Race against time or opponents" },
    { id: "custom" as GameTemplate, name: "Custom", icon: "✨", description: "Create something unique" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">What type of game do you want?</h2>
        <p className="mt-2 text-gray-600">Choose the gameplay style that excites you most</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-white p-6 text-left shadow-lg transition-all hover:-translate-y-1 hover:border-purple-500 hover:shadow-xl"
          >
            <div className="text-4xl">{type.icon}</div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">{type.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{type.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

const ThemeStep = ({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const themes = [
    "Cyberpunk City",
    "Medieval Fantasy",
    "Space Adventure",
    "Underwater Ocean",
    "Haunted Mansion",
    "Tropical Island",
    "Ancient Egypt",
    "Wild West",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">What's the theme of your game?</h2>
        <p className="mt-2 text-gray-600">Choose a setting or describe your own</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {themes.map((theme) => (
            <button
              key={theme}
              onClick={() => onChange(theme)}
              className={`rounded-full px-6 py-3 text-sm font-medium transition-all ${
                value === theme
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 shadow hover:bg-purple-50 hover:shadow-lg"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-inner">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or type your own theme..."
            className="w-full bg-transparent text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
      </div>

      <StepNavigation onNext={onNext} onBack={onBack} canProceed={!!value.trim()} />
    </div>
  );
};

const PlayerStep = ({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const examples = [
    "A ninja robot with glowing blue circuits",
    "A brave knight in shining armor",
    "A magical wizard with a purple hat",
    "A cyberpunk hacker with neon hair",
    "A cute alien explorer",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Describe your main character</h2>
        <p className="mt-2 text-gray-600">The more details, the better!</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Example: A brave astronaut with a red spacesuit and jet boots..."
            className="min-h-[150px] w-full resize-none bg-transparent text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none"
            maxLength={200}
          />
          <div className="mt-2 text-right text-sm text-gray-500">{value.length}/200</div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Need inspiration?</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => onChange(example)}
                className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      <StepNavigation onNext={onNext} onBack={onBack} canProceed={!!value.trim()} />
    </div>
  );
};

const DifficultyStep = ({
  selected,
  onSelect,
  onBack,
}: {
  selected?: "easy" | "medium" | "hard";
  onSelect: (difficulty: "easy" | "medium" | "hard") => void;
  onBack: () => void;
}) => {
  const difficulties = [
    {
      id: "easy" as const,
      name: "Easy",
      icon: "😊",
      description: "Casual and relaxing gameplay",
      color: "green",
    },
    {
      id: "medium" as const,
      name: "Medium",
      icon: "🎮",
      description: "Balanced challenge",
      color: "blue",
    },
    {
      id: "hard" as const,
      name: "Hard",
      icon: "🔥",
      description: "Intense and challenging",
      color: "red",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Choose difficulty level</h2>
        <p className="mt-2 text-gray-600">How challenging should your game be?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {difficulties.map((diff) => (
          <button
            key={diff.id}
            onClick={() => onSelect(diff.id)}
            className={`group rounded-2xl border-2 bg-white p-8 text-center shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
              selected === diff.id ? `border-${diff.color}-500` : "border-transparent"
            }`}
          >
            <div className="text-5xl">{diff.icon}</div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">{diff.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{diff.description}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onBack}
          className="rounded-full bg-gray-200 px-8 py-3 font-medium text-gray-700 hover:bg-gray-300"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

const StyleStep = ({
  selected,
  onSelect,
  onBack,
}: {
  selected?: "pixel-art" | "hand-drawn" | "realistic" | "cartoon";
  onSelect: (style: "pixel-art" | "hand-drawn" | "realistic" | "cartoon") => void;
  onBack: () => void;
}) => {
  const styles = [
    { id: "pixel-art" as const, name: "Pixel Art", icon: "🎮", description: "Retro 8-bit style" },
    { id: "cartoon" as const, name: "Cartoon", icon: "🎨", description: "Colorful and fun" },
    { id: "hand-drawn" as const, name: "Hand-Drawn", icon: "✏️", description: "Sketchy and artistic" },
    { id: "realistic" as const, name: "Realistic", icon: "📸", description: "Detailed and lifelike" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Choose an art style</h2>
        <p className="mt-2 text-gray-600">How should your game look?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            className={`group rounded-2xl border-2 bg-white p-6 text-left shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
              selected === style.id ? "border-purple-500" : "border-transparent"
            }`}
          >
            <div className="text-4xl">{style.icon}</div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">{style.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{style.description}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onBack}
          className="rounded-full bg-gray-200 px-8 py-3 font-medium text-gray-700 hover:bg-gray-300"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

const MechanicsStep = ({
  gameType,
  selected,
  onUpdate,
  onNext,
  onBack,
}: {
  gameType: GameTemplate;
  selected: string[];
  onUpdate: (mechanics: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) => {
  const mechanicsByType: Record<GameTemplate, string[]> = {
    platformer: ["Double Jump", "Wall Jump", "Dash", "Grappling Hook", "Gliding", "Power-ups"],
    puzzle: ["Match-3", "Tile Sliding", "Rotation", "Gravity Switch", "Time Limit", "Combo System"],
    shooter: ["Auto-fire", "Spread Shot", "Homing Missiles", "Shield", "Slow-Motion", "Power-ups"],
    racing: ["Drift Boost", "Nitro", "Weapons", "Shortcuts", "Weather Effects", "Multiplayer"],
    custom: ["Unique Mechanic 1", "Unique Mechanic 2", "Unique Mechanic 3"],
  };

  const mechanics = mechanicsByType[gameType] || mechanicsByType.custom;

  const toggleMechanic = (mechanic: string) => {
    if (selected.includes(mechanic)) {
      onUpdate(selected.filter((m) => m !== mechanic));
    } else {
      onUpdate([...selected, mechanic]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Add special mechanics</h2>
        <p className="mt-2 text-gray-600">Select features to make your game unique (optional)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mechanics.map((mechanic) => (
          <button
            key={mechanic}
            onClick={() => toggleMechanic(mechanic)}
            className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              selected.includes(mechanic)
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 shadow hover:bg-purple-50"
            }`}
          >
            {mechanic}
          </button>
        ))}
      </div>

      <StepNavigation onNext={onNext} onBack={onBack} canProceed={true} />
    </div>
  );
};

const ReviewStep = ({
  spec,
  onEdit,
  onComplete,
  onBack,
  isGenerating,
}: {
  spec: Partial<GameSpecification>;
  onEdit: (step: WizardStep) => void;
  onComplete: () => void;
  onBack: () => void;
  isGenerating: boolean;
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Review your game</h2>
        <p className="mt-2 text-gray-600">Everything look good? Let's create it!</p>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <ReviewItem label="Game Type" value={spec.gameType} onEdit={() => onEdit("game-type")} />
        <ReviewItem label="Theme" value={spec.theme} onEdit={() => onEdit("theme")} />
        <ReviewItem label="Player" value={spec.playerDescription} onEdit={() => onEdit("player")} />
        <ReviewItem label="Difficulty" value={spec.difficulty} onEdit={() => onEdit("difficulty")} />
        <ReviewItem label="Art Style" value={spec.style} onEdit={() => onEdit("style")} />
        <ReviewItem
          label="Mechanics"
          value={spec.mechanics?.length ? spec.mechanics.join(", ") : "None"}
          onEdit={() => onEdit("mechanics")}
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-full bg-gray-200 py-3 font-medium text-gray-700 hover:bg-gray-300"
          disabled={isGenerating}
        >
          ← Back
        </button>
        <button
          onClick={onComplete}
          disabled={isGenerating}
          className="flex-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 py-3 font-bold text-white shadow-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "🎮 Generate My Game!"}
        </button>
      </div>
    </div>
  );
};

const ReviewItem = ({ label, value, onEdit }: { label: string; value?: string; onEdit: () => void }) => {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-lg text-gray-900">{value || "Not set"}</p>
      </div>
      <button onClick={onEdit} className="text-sm font-medium text-purple-600 hover:text-purple-700">
        Edit
      </button>
    </div>
  );
};

const StepNavigation = ({
  onNext,
  onBack,
  canProceed,
}: {
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}) => {
  return (
    <div className="flex gap-4">
      <button
        onClick={onBack}
        className="flex-1 rounded-full bg-gray-200 py-3 font-medium text-gray-700 hover:bg-gray-300"
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={!canProceed}
        className="flex-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 py-3 font-bold text-white shadow-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  );
};

export default WizardMode;
