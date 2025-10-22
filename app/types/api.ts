/**
 * Generic API response wrapper capable of returning successful data or an error structure.
 *
 * @example
 * ```ts
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: user,
 *   meta: { timestamp: new Date().toISOString(), requestId: "req_123" },
 * };
 * ```
 *
 * @example
 * ```ts
 * const response: ApiResponse<User> = {
 *   success: false,
 *   error: { code: "NOT_FOUND", message: "User not found" },
 *   meta: { timestamp: new Date().toISOString(), requestId: "req_456" },
 * };
 * ```
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    duration?: string;
  };
}

/**
 * Describes rate limiting metadata typically surfaced via headers.
 *
 * @example
 * ```ts
 * const rateLimit: RateLimitInfo = {
 *   limit: 100,
 *   remaining: 42,
 *   reset: new Date(Date.now() + 60_000).toISOString(),
 * };
 * ```
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string;
}

/**
 * Provides insight into cache behavior for API responses.
 *
 * @example
 * ```ts
 * const cacheInfo: CacheInfo = { hit: true, key: "user:42", ttl: 120 };
 * ```
 */
export interface CacheInfo {
  hit: boolean;
  key?: string;
  ttl?: number;
}

/**
 * Standardized pagination query parameters for collection endpoints.
 *
 * @example
 * ```ts
 * const params: PaginationParams = { page: 2, limit: 25 };
 * ```
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Canonical structure for paginated data responses.
 *
 * @example
 * ```ts
 * const usersPage: PaginatedResponse<User> = {
 *   items: users,
 *   total: 250,
 *   page: 3,
 *   limit: 25,
 *   hasMore: true,
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
