import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@upstash/redis", () => {
  const store = new Map<string, string>();

  class MockRedis {
    constructor() {
      // no-op
    }

    async set(key: string, value: string) {
      store.set(key, value);
      return "OK";
    }

    async get<T extends string | null>(key: string): Promise<T | null> {
      return (store.get(key) as T | undefined) ?? null;
    }

    async flushdb() {
      store.clear();
      return "OK";
    }
  }

  return { Redis: MockRedis };
});

import { cacheGameCode, getCachedGameCode, redis } from "../cache";

describe("Cache System", () => {
  beforeEach(async () => {
    const client = redis as unknown as { flushdb?: () => Promise<unknown> };
    await client.flushdb?.();
  });

  it("should cache and retrieve game code", async () => {
    const gameData = { code: "test", title: "Test" };

    await cacheGameCode("test prompt", "platformer", gameData);
    const cached = await getCachedGameCode<typeof gameData>("test prompt", "platformer");

    expect(cached).toEqual(gameData);
  });

  it("should return null for cache miss", async () => {
    const cached = await getCachedGameCode("nonexistent", "platformer");
    expect(cached).toBeNull();
  });
});
