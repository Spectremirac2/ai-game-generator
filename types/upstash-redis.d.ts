declare module "@upstash/redis" {
  type RedisCommandResult<T = unknown> = Promise<T>;

  interface RedisPipeline {
    get<T = string>(key: string): RedisPipeline;
    del(key: string): RedisPipeline;
    exec<T = string | null>(): Promise<Array<T>>;
  }

  interface RedisConstructorConfig {
    url?: string;
    token?: string;
  }

  export class Redis {
    constructor(config?: RedisConstructorConfig);
    static fromEnv(config?: Partial<RedisConstructorConfig>): Redis;
    set(key: string, value: unknown, options?: { ex?: number }): RedisCommandResult<void>;
    get<T = unknown>(key: string): RedisCommandResult<T | null>;
    incr(key: string): RedisCommandResult<number>;
    ttl(key: string): RedisCommandResult<number>;
    keys(pattern: string): RedisCommandResult<string[]>;
    flushdb(): RedisCommandResult<void>;
    info(): RedisCommandResult<string>;
    ping(): RedisCommandResult<string>;
    zadd(key: string, ...args: Array<{ score: number; member: string }>): RedisCommandResult<number | string>;
    zpopmin<T = string[]>(key: string, count?: number): RedisCommandResult<T>;
    sadd(key: string, ...members: string[]): RedisCommandResult<number>;
    srem(key: string, ...members: string[]): RedisCommandResult<number>;
    zcard(key: string): RedisCommandResult<number>;
    scard(key: string): RedisCommandResult<number>;
    pipeline(): RedisPipeline;
  }
}
