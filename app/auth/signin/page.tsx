"use client";

import { Suspense, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  OAuthAccountNotLinked: "Email already used with different provider",
  default: "Authentication error occurred",
};

const SignInPageContent = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");

  const errorMessage = useMemo(() => {
    if (!errorParam) return null;
    return errorMessages[errorParam] ?? errorMessages.default;
  }, [errorParam]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl transition-transform duration-300 hover:-translate-y-1">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🎮</span>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-600">Sign in to continue creating games</p>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => void signIn("github", { callbackUrl })}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 0a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.35-1.76-1.35-1.76-1.1-.75.08-.74.08-.74 1.22.09 1.86 1.25 1.86 1.25 1.08 1.86 2.83 1.33 3.52 1.02.11-.79.42-1.33.76-1.63-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.44 11.44 0 0 1 3-.41c1.02 0 2.04.14 3 .41 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.47 5.92.43.37.81 1.1.81 2.23v3.31c0 .32.21.7.83.58A12 12 0 0 0 12 0Z" />
            </svg>
            Continue with GitHub
          </button>

          <button
            type="button"
            onClick={() => void signIn("google", { callbackUrl })}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.87-6.87C35.89 2.42 30.47 0 24 0 14.62 0 6.51 5.4 2.56 13.26l7.98 6.21C12.43 13.07 17.7 9.5 24 9.5Z" />
              <path fill="#4285F4" d="M46.5 24c0-1.52-.15-2.98-.42-4.39H24v8.3h12.65c-.55 3-2.18 5.55-4.65 7.26l7.56 5.87C42.69 37.05 46.5 31.11 46.5 24Z" />
              <path fill="#FBBC05" d="M10.54 28.45A14.5 14.5 0 0 1 9.5 24c0-1.53.26-3 .74-4.45l-7.98-6.21A23.94 23.94 0 0 0 0 24c0 3.8.87 7.4 2.41 10.6l8.13-6.15Z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.89-5.79l-7.56-5.87C30.36 37.53 27.38 38.5 24 38.5c-6.3 0-11.57-3.57-14.46-8.76l-8.13 6.15C6.51 42.6 14.62 48 24 48Z" />
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          By signing in, you agree to our <span className="font-medium">Terms of Service</span> and <span className="font-medium">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

const SignInPage = () => (
  <Suspense
    fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    }
  >
    <SignInPageContent />
  </Suspense>
);

export default SignInPage;
