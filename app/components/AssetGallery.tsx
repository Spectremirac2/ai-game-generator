"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AssetData = {
  url: string;
  prompt: string;
  revisedPrompt?: string;
};

interface AssetGalleryProps {
  assets: Record<string, AssetData>;
  onRegenerate: (assetKey: string) => void;
}

const AssetGallery = ({ assets, onRegenerate }: AssetGalleryProps) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);

  const assetEntries = useMemo(() => Object.entries(assets), [assets]);

  const closeModal = useCallback(() => {
    setSelectedKey(null);
  }, []);

  const handleOverlayClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal]);

  const formatAssetName = (key: string) =>
    key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  if (assetEntries.length === 0) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 text-center shadow">
        <p className="text-sm text-slate-500 sm:text-base">
          Game still needs to generate assets. Once sprites are available, they will appear here.
        </p>
      </div>
    );
  }

  const selectedAsset = selectedKey ? assets[selectedKey] : null;

  return (
    <div className="space-y-6 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-xl sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Sprite Gallery</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Review, download, and regenerate AI-generated sprites for your game.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assetEntries.map(([key, asset]) => {
          const name = formatAssetName(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <img
                src={asset.url}
                alt={name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-slate-900/0 transition duration-300 group-hover:bg-slate-900/40" />
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-slate-900/80 px-3 py-2 text-left text-sm font-semibold text-white transition duration-300 group-hover:translate-y-0">
                {name}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRegenerate(key);
                }}
                className="absolute inset-x-3 bottom-3 hidden items-center justify-center gap-2 rounded-full bg-blue-500 px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 group-hover:flex"
              >
                ♻️ Regenerate
              </button>
            </button>
          );
        })}
      </div>

      {selectedAsset && selectedKey ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md transition"
        >
          <div
            ref={modalRef}
            className="relative grid w-full max-w-4xl gap-6 overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300 sm:grid-cols-[1.2fr_1fr] sm:p-8"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 text-slate-600 transition hover:bg-slate-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close preview"
            >
              ✕
            </button>

            <div className="relative overflow-hidden rounded-2xl bg-slate-100 shadow-inner">
              <img
                src={selectedAsset.url}
                alt={formatAssetName(selectedKey)}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {formatAssetName(selectedKey)}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  AI Generated Sprite
                </p>
              </div>

              <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <div>
                  <h4 className="font-semibold text-slate-900">Original prompt</h4>
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">
                    {selectedAsset.prompt}
                  </p>
                </div>
                {selectedAsset.revisedPrompt ? (
                  <div className="rounded-xl bg-white/60 p-3 shadow-inner">
                    <h4 className="font-semibold text-slate-900">Revised prompt</h4>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">
                      {selectedAsset.revisedPrompt}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-auto grid gap-3 sm:grid-cols-2">
                <a
                  href={selectedAsset.url}
                  download={`${selectedKey}.png`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  ⬇️ Download
                </a>
                <button
                  type="button"
                  onClick={() => onRegenerate(selectedKey)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  ♻️ Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AssetGallery;
