'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AnalyticsData {
  period: {
    days: number;
    since: string;
  };
  dashboard: {
    totals: {
      games: number;
      users: number;
    };
    recentGames: number;
    topTemplates: Array<{
      template: string;
      count: number;
    }>;
  };
  cache: {
    totalKeys: number;
    memoryUsage: number;
    hitRate: number;
  };
  queue: {
    pending: number;
    processing: number;
    recentJobs: number;
  };
}

type MetricCardProps = {
  title: string;
  value: string;
  icon: string;
};

type StatusRowProps = {
  label: string;
  value: string;
};

const MetricCard = ({ title, value, icon }: MetricCardProps) => (
  <div className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

const StatusRow = ({ label, value }: StatusRowProps) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
);

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatPercentage(value: number): string {
  const percentage = Number.isFinite(value) ? value * 100 : 0;
  return `${percentage.toFixed(1)}%`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(1)} ${units[exponent]}`;
}

function formatTemplateName(template: string): string {
  return template
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AnalyticsDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isMountedRef = useRef(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Analytics request failed with status ${response.status}`);
      }

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message ?? 'Analytics request returned an error.');
      }

      if (!isMountedRef.current) {
        return;
      }

      setAnalytics({
        period: payload.period,
        dashboard: payload.data.dashboard,
        cache: payload.data.cache,
        queue: payload.data.queue,
      });
    } catch (error) {
      console.error('[analytics-dashboard] fetch error', error);
      if (!isMountedRef.current) {
        return;
      }
      setAnalytics(null);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30_000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 text-center">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics yüklenemedi</h1>
          <p className="mt-2 text-gray-600">Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
        </div>
      </div>
    );
  }

  const {
    period,
    dashboard: { totals, recentGames, topTemplates },
    cache,
    queue,
  } = analytics;

  const maxTemplateCount =
    topTemplates.length > 0 ? Math.max(...topTemplates.map((template) => template.count)) : 0;

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Son {period.days} gün · Başlangıç {new Date(period.since).toLocaleString()}
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Toplam Oyun" value={formatNumber(totals.games)} icon="🎮" />
          <MetricCard title="Toplam Kullanıcı" value={formatNumber(totals.users)} icon="👥" />
          <MetricCard title="Son Oyunlar" value={formatNumber(recentGames)} icon="⚡" />
          <MetricCard title="Önbellek Başarı" value={formatPercentage(cache.hitRate)} icon="📈" />
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">En Popüler Şablonlar</h2>
          <p className="mt-1 text-sm text-gray-500">
            En çok kullanılan ilk {topTemplates.length} oyun şablonu.
          </p>

          <div className="mt-6 space-y-5">
            {topTemplates.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz şablon analizi için yeterli veri yok.</p>
            ) : (
              topTemplates.map((template) => {
                const percentage =
                  maxTemplateCount > 0 ? Math.round((template.count / maxTemplateCount) * 100) : 0;
                return (
                  <div key={template.template}>
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                      <span>{formatTemplateName(template.template)}</span>
                      <span>{formatNumber(template.count)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Önbellek Durumu</h2>
            <div className="mt-4 space-y-3">
              <StatusRow label="Toplam Anahtar" value={formatNumber(cache.totalKeys)} />
              <StatusRow label="Vuruş Oranı" value={formatPercentage(cache.hitRate)} />
              <StatusRow label="Bellek Kullanımı" value={formatBytes(cache.memoryUsage)} />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Kuyruk Durumu</h2>
            <div className="mt-4 space-y-3">
              <StatusRow label="Bekleyen İşler" value={formatNumber(queue.pending)} />
              <StatusRow label="İşleniyor" value={formatNumber(queue.processing)} />
              <StatusRow label="Son 1 Saat" value={formatNumber(queue.recentJobs)} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
