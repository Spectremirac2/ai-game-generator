import prisma from "./prisma";
import logger from "./logger";

/**
 * Describes the payload required to track an analytics event.
 */
export interface AnalyticsEvent {
  event: string;
  userId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

const IMPORTANT_EVENTS = new Set<string>(["game_generated"]);

/**
 * Forwards the analytics event to an external analytics provider.
 * Replace the placeholder logic with Mixpanel, Amplitude, etc.
 */
async function sendToExternalProvider(event: AnalyticsEvent): Promise<void> {
  try {
    // TODO: Integrate with Mixpanel, Amplitude, or another analytics service.
    void event;
  } catch (providerError) {
    await logger.error("Failed to dispatch analytics event to external provider", providerError, {
      scope: "analytics",
    });
  }
}

/**
 * Persists the analytics event to the database when flagged as important.
 *
 * @param event - Structured analytics payload to potentially persist.
 */
async function persistEvent(event: AnalyticsEvent): Promise<void> {
  if (!IMPORTANT_EVENTS.has(event.event)) {
    return;
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        event: event.event,
        userId: event.userId,
        properties: event.properties,
        ...(event.timestamp ? { createdAt: event.timestamp } : {}),
      },
    });
  } catch (databaseError) {
    await logger.error("Failed to persist analytics event", databaseError, {
      scope: "analytics",
      event: event.event,
    });
  }
}

/**
 * Tracks a general analytics event across the application lifecycle.
 *
 * @param event - Event name and associated metadata.
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const payload = {
    ...event,
    timestamp: event.timestamp ?? new Date(),
  };

  console.log(
    JSON.stringify({
      channel: "analytics",
      event: payload.event,
      userId: payload.userId,
      timestamp: payload.timestamp.toISOString(),
      properties: payload.properties,
    }),
  );

  await Promise.allSettled([sendToExternalProvider(payload), persistEvent(payload)]);
}

/**
 * Tracks a page view for navigation analytics.
 *
 * @param path - The visited path.
 * @param userId - Optional user identifier.
 */
export function trackPageView(path: string, userId?: string): Promise<void> {
  return trackEvent({
    event: "page_view",
    userId,
    properties: { path },
  });
}

/**
 * Tracks the completion of a game generation request.
 *
 * @param params - Generation metadata to record in analytics.
 */
export async function trackGeneration(params: {
  userId?: string;
  template: string;
  duration: number;
  cacheHit: boolean;
  success: boolean;
  error?: unknown;
}): Promise<void> {
  const { userId, template, duration, cacheHit, success, error } = params;

  const properties: Record<string, any> = {
    template,
    duration,
    cacheHit,
    success,
  };

  if (error instanceof Error) {
    properties.error = {
      message: error.message,
      stack: error.stack,
    };
  } else if (error !== undefined) {
    properties.error = error;
  }

  await trackEvent({
    event: "game_generated",
    userId,
    properties,
  });
}

/**
 * Aggregates analytics metrics for dashboards within a rolling window.
 *
 * @param days - Number of trailing days to include in the dashboard.
 * @returns Aggregated analytics metrics.
 */
export async function getAnalyticsDashboard(days: number = 7): Promise<{
  since: Date;
  totals: {
    games: number;
    users: number;
  };
  recentGames: number;
  topTemplates: Array<{
    template: string;
    count: number;
  }>;
}> {
  const windowDays = Number.isFinite(days) && days > 0 ? days : 7;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [totalGames, totalUsers, recentGames, topTemplates] = await Promise.all([
    prisma.game.count(),
    prisma.user.count(),
    prisma.game.count({
      where: {
        createdAt: {
          gte: since,
        },
      },
    }),
    prisma.game.groupBy({
      by: ["template"],
      _count: {
        template: true,
      },
      orderBy: {
        _count: {
          template: "desc",
        },
      },
      take: 5,
    }),
  ]);

  return {
    since,
    totals: {
      games: totalGames,
      users: totalUsers,
    },
    recentGames,
    topTemplates: topTemplates.map((entry) => ({
      template: entry.template,
      count: entry._count.template ?? 0,
    })),
  };
}
