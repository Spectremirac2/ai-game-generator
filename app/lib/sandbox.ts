/**
 * Utilities for validating, wrapping, and sandboxing AI-generated game code.
 */

export interface SandboxOptions {
  /**
   * Raw JavaScript (Phaser) game code to execute.
   */
  code: string;
  /**
   * Maximum execution time in milliseconds before the sandbox times out.
   * Defaults to 5 seconds.
   */
  timeout?: number;
  /**
   * Optional list of approved global APIs. Currently informational only.
   */
  allowedAPIs?: string[];
}

export interface SandboxResult {
  /**
   * Indicates whether the sandboxed game booted successfully.
   */
  success: boolean;
  /**
   * Error message when execution fails.
   */
  error?: string;
  /**
   * Collected console logs sent from the sandboxed iframe.
   */
  logs?: string[];
}

/**
 * Validates game code against a predefined set of unsafe patterns.
 *
 * @param code - Source code to validate.
 * @returns Validation result containing a boolean flag and list of errors.
 */
export function validateGameCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const dangerousPatterns: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /\beval\s*\(/gi, description: "Usage of eval() is disallowed." },
    { pattern: /new\s+Function\s*\(/gi, description: "Function constructor is disallowed." },
    { pattern: /\bfetch\s*\(/gi, description: "Network requests via fetch() are disallowed." },
    {
      pattern: /\bXMLHttpRequest\b/gi,
      description: "Network requests via XMLHttpRequest are disallowed.",
    },
    { pattern: /\bimport\s*[("']/gi, description: "Dynamic imports are not allowed." },
    { pattern: /\brequire\s*\(/gi, description: "CommonJS require() is disallowed." },
    {
      pattern: /\blocalStorage\b|\bsessionStorage\b/gi,
      description: "Access to local/session storage is disallowed.",
    },
    { pattern: /document\.cookie/gi, description: "document.cookie access is disallowed." },
    {
      pattern: /window\.location\s*(=|\.|assign|replace)/gi,
      description: "Manipulating window.location is disallowed.",
    },
    {
      pattern: /__proto__|constructor\.\s*prototype/gi,
      description: "Prototype pollution access is disallowed.",
    },
  ];

  for (const { pattern, description } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(description);
    }
  }

  if (!/Phaser/.test(code)) {
    errors.push("Code must reference Phaser to run inside the generator.");
  }

  const sizeInBytes = new TextEncoder().encode(code).length;
  if (sizeInBytes > 50 * 1024) {
    errors.push("Code exceeds the maximum size of 50KB.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Wraps raw game code in a secure HTML scaffold suitable for sandboxed execution.
 *
 * @param code - JavaScript game code to embed.
 * @returns Complete HTML document as a string.
 */
export function wrapGameCode(code: string): string {
  const sanitizedCode = code.replace(/<\/script>/gi, "<\\/script>");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sandboxed Game Preview</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: #000;
        color: #fff;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        overflow: hidden;
      }
      #game-root, canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      #error-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        color: #ff6b6b;
        display: none;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;
        font-size: 1rem;
      }
      #error-overlay.active {
        display: flex;
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"><\/script>
  </head>
  <body>
    <div id="game-root"></div>
    <div id="error-overlay"></div>
    <script>
      (function () {
        const parentWindow = window.parent;
        const errorOverlay = document.getElementById("error-overlay");

        function postMessage(type, payload) {
          if (!parentWindow) return;
          parentWindow.postMessage({ type, payload }, "*");
        }

        function showError(message) {
          if (errorOverlay) {
            errorOverlay.textContent = message;
            errorOverlay.classList.add("active");
          }
        }

        function wrapConsole() {
          const originalLog = console.log;
          const originalError = console.error;

          console.log = function (...args) {
            postMessage("log", { level: "info", message: args.map(String).join(" ") });
            originalLog.apply(console, args);
          };

          console.error = function (...args) {
            postMessage("log", { level: "error", message: args.map(String).join(" ") });
            originalError.apply(console, args);
          };
        }

        window.addEventListener("error", (event) => {
          const message = event.message || "Unexpected runtime error.";
          showError(message);
          postMessage("game-error", { message });
        });

        postMessage("game-loading", {});
        wrapConsole();

        function bootstrap() {
          if (typeof Phaser === "undefined") {
            const message = "Phaser failed to load inside the sandbox.";
            showError(message);
            postMessage("game-error", { message });
            return;
          }

          try {
            ${sanitizedCode}
            postMessage("game-loaded", {});
          } catch (error) {
            const message = error && error.message ? error.message : String(error);
            showError(message);
            postMessage("game-error", { message });
          }
        }

        if (document.readyState === "complete") {
          bootstrap();
        } else {
          window.addEventListener("load", bootstrap, { once: true });
        }
      })();
    <\/script>
  </body>
</html>`;
}

/**
 * Creates a sandboxed iframe with a strict security configuration.
 *
 * @returns The configured iframe element.
 */
export function createSandboxedIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("referrerpolicy", "no-referrer");
  iframe.style.border = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.display = "block";
  return iframe;
}

/**
 * Executes code inside a sandboxed iframe and resolves with the outcome.
 *
 * @param options - Sandbox execution options.
 * @returns Promise resolving to the sandbox result.
 */
export async function executeSandboxedCode({
  code,
  timeout = 5000,
}: SandboxOptions): Promise<SandboxResult> {
  const validation = validateGameCode(code);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(" "),
    };
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      success: false,
      error: "Sandboxed execution is only available in a browser environment.",
    };
  }

  const iframe = createSandboxedIframe();
  const logs: string[] = [];

  const wrappedHtml = wrapGameCode(code);
  const blob = new Blob([wrappedHtml], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolved = false;

  return new Promise<SandboxResult>((resolve) => {
    function cleanup(result: SandboxResult) {
      if (resolved) return;
      resolved = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      window.removeEventListener("message", handleMessage);
      URL.revokeObjectURL(blobUrl);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }

      resolve(result);
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) {
        return;
      }

      const data = event.data as { type?: string; payload?: unknown };
      if (!data || typeof data !== "object") {
        return;
      }

      switch (data.type) {
        case "game-loaded":
          cleanup({ success: true, logs });
          break;
        case "game-error":
          cleanup({
            success: false,
            error:
              (data.payload as { message?: string } | undefined)?.message ??
              "Unknown error from sandboxed game.",
            logs,
          });
          break;
        case "log":
          logs.push(
            (data.payload as { message?: string } | undefined)?.message ??
              "[sandbox] log message without payload"
          );
          break;
        default:
          break;
      }
    }

    timeoutId = setTimeout(() => {
      cleanup({
        success: false,
        error: "Sandbox execution timed out.",
        logs,
      });
    }, timeout);

    window.addEventListener("message", handleMessage);
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  });
}
