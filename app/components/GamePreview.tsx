"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { GeneratedGame } from "@/types/game";

interface GamePreviewProps {
  game: GeneratedGame;
  onRegenerate?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

type GameStatus = "validating" | "loading" | "running" | "error";

type GameIframeMessage =
  | { type: "game-loaded"; payload?: unknown }
  | { type: "game-error"; payload?: { message?: string } }
  | { type: "game-loading"; payload?: unknown }
  | { type: "log"; payload?: { level?: string; message?: string } };

const SPINNER =
  "inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent";

const GamePreview = ({
  game,
  onRegenerate,
  onSave,
  onShare,
}: GamePreviewProps) => {
  const [gameStatus, setGameStatus] = useState<GameStatus>("validating");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const loadStartRef = useRef<number>(0);
  const blobUrlRef = useRef<string | null>(null);

  const templateBadgeColor = useMemo(() => {
    switch (game.metadata.template) {
      case "platformer":
        return "bg-blue-100 text-blue-700";
      case "puzzle":
        return "bg-purple-100 text-purple-700";
      case "shooter":
        return "bg-red-100 text-red-700";
      case "racing":
        return "bg-amber-100 text-amber-700";
      case "custom":
      default:
        return "bg-slate-100 text-slate-700";
    }
  }, [game.metadata.template]);

  const difficultyBadgeColor = useMemo(() => {
    switch (game.metadata.difficulty.toLowerCase()) {
      case "easy":
        return "bg-emerald-100 text-emerald-700";
      case "hard":
        return "bg-rose-100 text-rose-700";
      case "medium":
      default:
        return "bg-amber-100 text-amber-700";
    }
  }, [game.metadata.difficulty]);

  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const loadGame = useCallback(() => {
    setGameStatus("validating");
    setErrorMessage("");
    setLoadTime(null);

    cleanupBlobUrl();

    const sanitizedCode = game.code.replace(/<\/script>/gi, "<\\/script>");
    const pageTitle = (game.metadata.title || "Game Preview")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${pageTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #000;
        color: #fff;
        width: 100%;
        height: 100%;
        overflow: hidden;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      #game-root, canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"><\/script>
  </head>
  <body>
    <div id="game-root"></div>
    <script>
      (function () {
        const parentWindow = window.parent;
        function send(type, payload) {
          if (!parentWindow) return;
          parentWindow.postMessage({ type, payload }, "*");
        }

        function wrapConsole() {
          const originalLog = console.log;
          const originalError = console.error;
          console.log = function (...args) {
            send("log", { level: "info", message: args.map(String).join(" ") });
            originalLog.apply(console, args);
          };
          console.error = function (...args) {
            send("log", { level: "error", message: args.map(String).join(" ") });
            originalError.apply(console, args);
          };
        }

        window.addEventListener("error", function (event) {
          send("game-error", { message: event.message || "Runtime error" });
        });

        send("game-loading");
        wrapConsole();

        function startGame() {
          if (typeof Phaser === "undefined") {
            throw new Error("Phaser failed to load.");
          }

          try {
            ${sanitizedCode}
            send("game-loaded");
          } catch (error) {
            send("game-error", { message: error && error.message ? error.message : String(error) });
          }
        }

        if (document.readyState === "complete") {
          startGame();
        } else {
          window.addEventListener("load", startGame);
        }
      })();
    <\/script>
  </body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    loadStartRef.current = performance.now();
    setTimeout(() => setGameStatus("loading"), 150);
  }, [cleanupBlobUrl, game]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, [cleanupBlobUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data as GameIframeMessage;
      if (!message || typeof message !== "object") return;

      switch (message.type) {
        case "game-loading":
          setGameStatus("loading");
          break;
        case "game-loaded":
          setGameStatus("running");
          setLoadTime(Math.max(0, Math.round(performance.now() - loadStartRef.current)));
          break;
        case "game-error":
          setGameStatus("error");
          setErrorMessage(message.payload?.message ?? "Unknown runtime error.");
          break;
        case "log":
          if (message.payload?.level === "error") {
            console.error("[Game Preview]", message.payload.message);
          } else {
            console.log("[Game Preview]", message.payload?.message);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const containerClasses = [
    "relative mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300 sm:p-8",
    isFullscreen ? "fixed inset-4 z-50 overflow-y-auto bg-white" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderOverlay = () => {
    if (gameStatus === "running") return null;

    const baseClasses =
      "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/80 text-center text-white backdrop-blur-sm";

    if (gameStatus === "validating") {
      return (
        <div className={baseClasses}>
          <span className="text-4xl animate-pulse">🔒</span>
          <p className="text-lg font-semibold">Validating game code...</p>
          <p className="text-sm text-white/70">
            Running safety checks and preparing the sandbox.
          </p>
        </div>
      );
    }

    if (gameStatus === "loading") {
      return (
        <div className={baseClasses}>
          <span className={SPINNER} aria-hidden />
          <p className="text-lg font-semibold">Loading game...</p>
          <p className="text-sm text-white/70">Booting Phaser engine inside the sandbox.</p>
        </div>
      );
    }

    if (gameStatus === "error") {
      return (
        <div className={baseClasses}>
          <span className="text-4xl">❌</span>
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="max-w-md text-sm text-white/80">{errorMessage}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadGame}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Retry
            </button>
            {onRegenerate ? (
              <button
                type="button"
                onClick={onRegenerate}
                className="rounded-full bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              >
                Regenerate game
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    return null;
  };

  const actionButtons = [
    {
      label: "Reload",
      icon: "⟳",
      onClick: loadGame,
      disabled: gameStatus === "loading" || gameStatus === "validating",
      className:
        "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400",
    },
    {
      label: "Save",
      icon: "💾",
      onClick: onSave,
      disabled: !onSave,
      className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 focus-visible:ring-emerald-400",
    },
    {
      label: "Share",
      icon: "📤",
      onClick: onShare,
      disabled: !onShare,
      className: "bg-sky-100 text-sky-700 hover:bg-sky-200 focus-visible:ring-sky-400",
    },
    {
      label: "Regenerate",
      icon: "✨",
      onClick: onRegenerate,
      disabled: !onRegenerate,
      className: "bg-violet-100 text-violet-700 hover:bg-violet-200 focus-visible:ring-violet-400",
    },
  ];

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            {game.metadata.title || "Generated Game"}
          </h2>
          <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
            {game.metadata.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${templateBadgeColor}`}
            >
              Template: {game.metadata.template}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${difficultyBadgeColor}`}
            >
              Difficulty: {game.metadata.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Playtime: {game.metadata.estimatedPlayTime}
            </span>
            {loadTime !== null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Load time: {loadTime}ms
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsFullscreen((state) => !state)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        >
          {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-black shadow-2xl">
        <div className="aspect-video w-full">
          <iframe
            ref={iframeRef}
            title={game.metadata.title || "Game Preview"}
            sandbox="allow-scripts"
            className="h-full w-full border-0"
          />
        </div>
        {renderOverlay()}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actionButtons.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={[
              "group inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all",
              "shadow hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              action.className,
              action.disabled ? "cursor-not-allowed opacity-50" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span aria-hidden>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      <details className="group rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 shadow-inner transition hover:border-slate-300">
        <summary className="cursor-pointer list-none rounded-2xl px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition group-open:rounded-b-none group-open:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-400">
          View Source Code
        </summary>
        <pre className="overflow-auto rounded-b-2xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          <code className="language-javascript whitespace-pre-wrap break-words">
            {game.code}
          </code>
        </pre>
      </details>
    </div>
  );
};

export default GamePreview;
