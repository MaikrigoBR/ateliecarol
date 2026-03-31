import type { DashboardMetric } from '@catechesis-saas/types';

export function MetricCard({ metric }: Readonly<{ metric: DashboardMetric }>) {
  return (
    <article className="metric-card">
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <p>{metric.trend}</p>
    </article>
  );
}
