"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

const UserMenu = () => {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
        <div className="hidden h-3 w-20 animate-pulse rounded-full bg-slate-200 md:block" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => void signIn()}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        Sign In
      </button>
    );
  }

  const { user } = session;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 pr-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <Image
          src={user.image ?? "https://avatar.vercel.sh/placeholder"}
          alt={user.name ?? "User avatar"}
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
        />
        <span className="hidden md:block">{user.name ?? "Player"}</span>
        <svg
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : "rotate-0"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.4a.75.75 0 0 1-1.08 0l-4.25-4.4a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 h-full w-full cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Close user menu"
          />

          <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
              <Image
                src={user.image ?? "https://avatar.vercel.sh/placeholder"}
                alt={user.name ?? "User avatar"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="truncate">
                <p className="text-sm font-semibold text-slate-900">{user.name ?? "Player"}</p>
                <p className="truncate text-xs text-slate-500">{user.email ?? "No email"}</p>
              </div>
            </div>

            <div className="flex flex-col px-2 py-2">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
              >
                🎮 My Games
              </Link>
              <Link
                href="/settings"
                className="rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
              >
                ⚙️ Settings
              </Link>
            </div>

            <div className="border-t border-slate-100 px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default UserMenu;

