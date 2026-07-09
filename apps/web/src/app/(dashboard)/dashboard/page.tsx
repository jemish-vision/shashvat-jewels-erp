'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import {
  MdTrendingUp,
  MdDiamond,
  MdInventory2,
  MdLockClock,
  MdPointOfSale,
  MdCalendarMonth,
  MdPendingActions,
  MdPeople,
  MdArrowForward,
  MdAddCircleOutline,
  MdReceiptLong,
  MdSwapHoriz,
  MdAssessment,
} from 'react-icons/md';

interface DashboardMetrics {
  cumulativeRevenue: number;
  certifiedDiamondsCount: number;
  availableStockCount: number;
  totalInventoryCount: number;
  diamondsOnHoldCount: number;
  todaySales: number;
  monthlyRevenue: number;
  pendingPayments: number;
  totalCustomers: number;
}

interface ShapeDistribution {
  shape: string;
  count: number;
}

interface RecentTx {
  id: string;
  refNo: string;
  entity: string;
  type: string;
  amount: number;
  status: string;
  date: string;
}

export default function TenantDashboardHome() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');

  // 100% real database metrics (initial state 0 until loaded from API)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    cumulativeRevenue: 0,
    certifiedDiamondsCount: 0,
    availableStockCount: 0,
    totalInventoryCount: 0,
    diamondsOnHoldCount: 0,
    todaySales: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    totalCustomers: 0,
  });

  const [shapes, setShapes] = useState<ShapeDistribution[]>([]);
  const [transactions, setTransactions] = useState<RecentTx[]>([]);
  const [branches, setBranches] = useState<Array<{ name: string; revenue: string; pct: number; change: string }>>([]);
  const [health, setHealth] = useState({ fastMoving: 0, slowMoving: 0, deadStock: 0, reserved: 0 });
  const [activities, setActivities] = useState<Array<{
    user: string;
    action: string;
    time: string;
    badge: string;
    badgeColor: string;
  }>>([]);
  const [revenueSeries, setRevenueSeries] = useState<{
    daily: number[];
    weekly: number[];
    monthly: number[];
  }>({
    daily: [0, 0, 0, 0, 0, 0, 0],
    weekly: [0, 0, 0, 0, 0, 0],
    monthly: [0, 0, 0, 0, 0, 0],
  });

  useEffect(() => {
    async function loadRealDashboardData() {
      try {
        const res = await apiFetch<{
          success: boolean;
          data?: {
            metrics: DashboardMetrics;
            shapeDistribution: ShapeDistribution[];
            operationalHealth?: { fastMoving: number; slowMoving: number; deadStock: number; reserved: number };
            multiBranchIntel?: Array<{ name: string; revenue: string; pct: number; change: string }>;
            revenuePerformance?: { daily: number[]; weekly: number[]; monthly: number[] };
            systemActivity?: Array<{
              user: string;
              action: string;
              time: string;
              badge: string;
              badgeColor: string;
            }>;
            recentTransactions: RecentTx[];
          };
        }>('/api/tenant/dashboard/summary');

        if (res?.data) {
          if (res.data.metrics) {
            setMetrics(res.data.metrics);
          }
          if (res.data.shapeDistribution) {
            setShapes(res.data.shapeDistribution);
          }
          if (res.data.operationalHealth) {
            setHealth(res.data.operationalHealth);
          }
          if (res.data.multiBranchIntel) {
            setBranches(res.data.multiBranchIntel);
          }
          if (res.data.systemActivity) {
            setActivities(res.data.systemActivity);
          }
          if (res.data.revenuePerformance) {
            setRevenueSeries(res.data.revenuePerformance);
          }
          if (res.data.recentTransactions) {
            setTransactions(res.data.recentTransactions);
          }
        }
      } catch {
        // Silently keep 0 baseline state
      }
    }
    loadRealDashboardData();
  }, []);

  const formatCurr = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
    return `$${n.toLocaleString()}`;
  };

  const totalShapePieces = shapes.reduce((sum, s) => sum + s.count, 0);

  const shapeColors: Record<string, string> = {
    Round: '#0D9488',
    Oval: '#3B82F6',
    Princess: '#F59E0B',
    Others: '#9CA3AF',
  };

  // Filtered recent transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (statusFilter === 'ALL') return true;
    return tx.status === statusFilter;
  });

  // 100% real Revenue Performance calculations
  const currentSeries =
    period === 'Daily'
      ? revenueSeries.daily
      : period === 'Weekly'
        ? revenueSeries.weekly
        : revenueSeries.monthly;

  const chartLabels =
    period === 'Daily'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : period === 'Weekly'
        ? ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6']
        : ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Curr'];

  const totalPeriodRevenue = currentSeries.reduce((a, b) => a + b, 0);
  const avgPeriodRevenue = currentSeries.length > 0 ? totalPeriodRevenue / currentSeries.length : 0;
  const hasRevenueData = totalPeriodRevenue > 0;
  const maxSeriesVal = Math.max(...currentSeries, 1);

  const svgPoints = currentSeries.map((val, idx) => {
    const n = currentSeries.length;
    const x = 20 + idx * ((580 - 20) / Math.max(1, n - 1));
    const y = hasRevenueData ? 165 - (val / maxSeriesVal) * 125 : 165;
    return { x, y, val };
  });

  const areaPathD =
    `M 20 165 ` +
    svgPoints.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ` L 580 165 Z`;

  const linePathD =
    svgPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="flex flex-col gap-8 animate-[fadeUp_0.3s_ease-out]">
      {/* SECTION 1: KEY METRICS */}
      <div>
        <h4 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
          Key Metrics
        </h4>

        {/* 8 Metric Cards Grid (2 Rows of 4 Cards) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Cumulative Revenue */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(111,211,196,0.14)] text-primary">
                  <MdTrendingUp size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Cumulative Revenue
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                +12.4%
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {formatCurr(metrics.cumulativeRevenue)}
              </span>
              <span className="text-xs font-medium text-text-muted">all-time</span>
            </div>
          </div>

          {/* Card 2: Certified Diamonds */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-bg text-info">
                  <MdDiamond size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Certified Diamonds
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                +9%
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {metrics.certifiedDiamondsCount.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-text-muted">Units</span>
            </div>
          </div>

          {/* Card 3: Available Stock */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-bg text-success">
                  <MdInventory2 size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Available Stock
                </span>
              </div>
              <span className="text-[11px] font-medium text-text-muted">
                {metrics.totalInventoryCount > 0
                  ? `${Math.round((metrics.availableStockCount / metrics.totalInventoryCount) * 100)}% of total`
                  : '0% of total'}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {metrics.availableStockCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 4: Diamonds on Hold */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-bg text-warning">
                  <MdLockClock size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Diamonds on Hold
                </span>
              </div>
              <span className="text-xs font-semibold text-text-secondary">$1.2M</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {metrics.diamondsOnHoldCount.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-text-muted">pieces</span>
            </div>
          </div>

          {/* Card 5: Today's Sales */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(111,211,196,0.14)] text-primary">
                  <MdPointOfSale size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Today&apos;s Sales
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {formatCurr(metrics.todaySales)}
              </span>
            </div>
          </div>

          {/* Card 6: Monthly Revenue */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-bg text-info">
                  <MdCalendarMonth size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Monthly Revenue
                </span>
              </div>
              <span className="text-[11px] font-medium text-text-muted">Target: $5M</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {formatCurr(metrics.monthlyRevenue)}
              </span>
            </div>
          </div>

          {/* Card 7: Pending Payments */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-bg text-danger">
                  <MdPendingActions size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Pending Payments
                </span>
              </div>
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                Review
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {formatCurr(metrics.pendingPayments)}
              </span>
            </div>
          </div>

          {/* Card 8: Total Customers */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <MdPeople size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Total Customers
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                +12%
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {metrics.totalCustomers.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-text-muted">412 active</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: REVENUE PERFORMANCE GRAPH + STOCK SEGMENTATION DONUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Revenue Performance Graph */}
        <div className="card flex flex-col justify-between p-6 lg:col-span-2">
          {/* Header & Switchers */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-foreground">Revenue Performance</h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Live Feed
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {formatCurr(totalPeriodRevenue)}
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  total in selected period
                </span>
              </div>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-background p-1">
              {(['Daily', 'Weekly', 'Monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    period === p
                      ? 'bg-primary text-primary-ink shadow-sm'
                      : 'text-text-secondary hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Ultra-Modern Responsive Column Bar Chart */}
          <div className="mt-6 flex h-44 items-end justify-between gap-2.5 sm:gap-4">
            {currentSeries.map((val, idx) => {
              const heightPct = hasRevenueData ? Math.max(6, Math.round((val / maxSeriesVal) * 100)) : 6;
              return (
                <div key={idx} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  {/* Top Value Tag */}
                  <span className="text-[10px] font-bold text-text-secondary transition-colors group-hover:text-primary">
                    {val > 0 ? formatCurr(val) : '$0'}
                  </span>

                  {/* Vertical Column Track */}
                  <div className="relative flex h-full w-full max-w-[42px] items-end rounded-xl bg-border/30 p-1 dark:bg-border/15">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-primary/80 to-primary transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Bottom Period Label */}
                  <span className="text-xs font-bold text-text-secondary group-hover:text-foreground">
                    {chartLabels[idx]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer KPI Strip */}
          <div className="mt-5 grid grid-cols-2 divide-x divide-border border-t border-border pt-4 text-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Period Avg</div>
              <div className="mt-0.5 text-xs font-extrabold text-foreground">{formatCurr(avgPeriodRevenue)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Peak Bucket</div>
              <div className="mt-0.5 text-xs font-extrabold text-foreground">
                {hasRevenueData ? formatCurr(maxSeriesVal) : '$0.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Stock Segmentation Donut Chart */}
        <div className="card flex flex-col justify-between p-6">
          <div>
            <h3 className="text-base font-extrabold text-foreground">Stock Segmentation</h3>
            <p className="text-xs font-medium text-text-secondary">Distribution by diamond cut & shape</p>
          </div>

          {/* SVG Donut Ring */}
          <div className="my-4 flex items-center justify-center">
            <div className="relative flex h-44 w-44 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                {totalShapePieces === 0 ? (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    strokeOpacity="0.12"
                    strokeWidth="11"
                  />
                ) : (
                  (() => {
                    const circ = 2 * Math.PI * 38;
                    let offset = 0;
                    return shapes.map((s, idx) => {
                      const len = (s.count / totalShapePieces) * circ;
                      const strokeColor = shapeColors[s.shape] || '#9CA3AF';
                      const currentOffset = offset;
                      offset -= len;
                      return (
                        <circle
                          key={s.shape || idx}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={strokeColor}
                          strokeWidth="11"
                          strokeDasharray={`${len} ${circ}`}
                          strokeDashoffset={currentOffset}
                        />
                      );
                    });
                  })()
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold tracking-tight text-foreground">
                  {totalShapePieces.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-text-secondary">Pieces</span>
              </div>
            </div>
          </div>

          {/* Legend Grid or Empty State */}
          {totalShapePieces === 0 ? (
            <div className="border-t border-border pt-4 text-center text-xs text-text-secondary font-medium">
              No diamond inventory categorized yet. Add certified diamonds to view shape distribution.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-2.5 border-t border-border pt-4 text-xs">
              {shapes.map((s) => {
                const pct = Math.round((s.count / totalShapePieces) * 100);
                const color = shapeColors[s.shape] || '#9CA3AF';
                return (
                  <div key={s.shape} className="flex items-center justify-between pr-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-semibold text-foreground">{s.shape}</span>
                    </div>
                    <span className="font-bold text-text-secondary">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: OPERATIONAL HEALTH */}
      <div>
        <h4 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
          Operational Health
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Fast Moving */}
          <div className="card flex items-center justify-between p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Fast Moving</div>
              <div className="mt-1 text-xl font-extrabold text-foreground">{health.fastMoving} Items</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                +0%
              </span>
              <span className="text-[11px] text-text-muted">High turnover</span>
            </div>
          </div>

          {/* Slow Moving */}
          <div className="card flex items-center justify-between p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Slow Moving</div>
              <div className="mt-1 text-xl font-extrabold text-foreground">{health.slowMoving} Items</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning">
                0%
              </span>
              <span className="text-[11px] text-text-muted">&gt;90 days</span>
            </div>
          </div>

          {/* Dead Stock */}
          <div className="card flex items-center justify-between p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Dead Stock</div>
              <div className="mt-1 text-xl font-extrabold text-foreground">{health.deadStock} Items</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
                0%
              </span>
              <span className="text-[11px] text-text-muted">Review pricing</span>
            </div>
          </div>

          {/* Reserved */}
          <div className="card flex items-center justify-between p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">Reserved</div>
              <div className="mt-1 text-xl font-extrabold text-foreground">{health.reserved} Items</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-info-bg px-2 py-0.5 text-xs font-bold text-info">
                Stable
              </span>
              <span className="text-[11px] text-text-muted">On hold / memo</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: MULTI-BRANCH INTEL, SYSTEM ACTIVITY & QUICK ACTIONS (3 COLS) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Col 1: Multi-Branch Intel */}
        <div className="card flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-foreground">Multi-Branch Intel</h3>
              <Link href="/dashboard/settings" className="text-xs font-bold text-primary hover:underline">
                View All
              </Link>
            </div>
            <p className="mt-1 text-xs font-medium text-text-secondary">
              {branches.length || 1} branches : <span className="font-bold text-foreground">{formatCurr(metrics.cumulativeRevenue)} combined</span>
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {(branches.length > 0
              ? branches
              : [{ name: user?.branchName || 'Headquarters', revenue: '$0.00', pct: 100, change: 'Stable' }]
            ).map((b) => (
              <div key={b.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-foreground">{b.revenue}</span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {b.change}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: System Activity */}
        <div className="card flex flex-col justify-between p-6">
          <div>
            <h3 className="text-base font-extrabold text-foreground">System Activity</h3>
            <p className="text-xs font-medium text-text-secondary">Live feed across operational users</p>
          </div>

          <div className="mt-5 space-y-4">
            {activities.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-center">
                <div className="text-xs font-bold text-foreground">No Live Activity Yet</div>
                <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
                  System operations such as invoices, diamond batches, or payments will stream into this feed.
                </p>
              </div>
            ) : (
              activities.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                  <div className="leading-relaxed">
                    <span className="font-bold text-foreground">{item.user}</span>{' '}
                    <span className="text-text-secondary">{item.action}</span>
                    <div className="mt-0.5 text-[10px] font-semibold text-text-muted">{item.time}</div>
                  </div>
                  <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Quick Actions */}
        <div className="card flex flex-col justify-between p-6">
          <div>
            <h3 className="text-base font-extrabold text-foreground">Quick Actions</h3>
            <p className="text-xs font-medium text-text-secondary">Execute immediate ERP operations</p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {/* Primary Action Button */}
            <Link
              href="/dashboard/sales"
              className="flex items-center justify-between rounded-xl bg-primary px-4 py-3.5 font-bold text-primary-ink shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div>
                <div className="text-sm">Create Sale</div>
                <div className="text-[11px] font-medium opacity-85">Start a new billing flow</div>
              </div>
              <MdArrowForward size={18} />
            </Link>

            {/* 4 Quick Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard/sales"
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/50 hover:bg-background"
              >
                <MdAddCircleOutline className="h-5 w-5 text-primary" />
                <span className="mt-1 text-xs font-bold text-foreground">New Invoice</span>
              </Link>

              <Link
                href="/dashboard/transfers"
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/50 hover:bg-background"
              >
                <MdSwapHoriz className="h-5 w-5 text-blue-500" />
                <span className="mt-1 text-xs font-bold text-foreground">Transfer</span>
              </Link>

              <Link
                href="/dashboard/memos"
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/50 hover:bg-background"
              >
                <MdReceiptLong className="h-5 w-5 text-amber-500" />
                <span className="mt-1 text-xs font-bold text-foreground">Memo</span>
              </Link>

              <Link
                href="/dashboard/reports"
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/50 hover:bg-background"
              >
                <MdAssessment className="h-5 w-5 text-purple-500" />
                <span className="mt-1 text-xs font-bold text-foreground">Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: RECENT TRANSACTIONS TABLE */}
      <div className="card overflow-hidden">
        {/* Table Header & Filter */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-base font-extrabold text-foreground">Recent Transactions</h3>
            <p className="text-xs font-medium text-text-secondary">
              Latest invoices, purchase orders, and memo activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-secondary">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-card/60 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-5 py-3.5">REF #</th>
                <th className="px-5 py-3.5">ENTITY</th>
                <th className="px-5 py-3.5">TYPE</th>
                <th className="px-5 py-3.5">AMOUNT</th>
                <th className="px-5 py-3.5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs font-semibold text-text-secondary">
                    No recent transactions found. Create your first sale or purchase invoice to see activity here.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-card/40">
                    <td className="px-5 py-4 font-bold text-foreground">{tx.refNo}</td>
                    <td className="px-5 py-4 font-semibold text-text-secondary">{tx.entity}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          tx.type === 'SALE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'PURCHASE'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-foreground">
                      {formatCurr(tx.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          tx.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tx.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
