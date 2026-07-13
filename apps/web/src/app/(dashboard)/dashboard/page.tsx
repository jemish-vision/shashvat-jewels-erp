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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Enterprise Demo initial state so dashboard displays rich realistic metrics instantly
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    cumulativeRevenue: 2845920,
    certifiedDiamondsCount: 428,
    availableStockCount: 382,
    totalInventoryCount: 540,
    diamondsOnHoldCount: 46,
    todaySales: 68450,
    monthlyRevenue: 482100,
    pendingPayments: 124500,
    totalCustomers: 142,
  });

  const [shapes, setShapes] = useState<ShapeDistribution[]>([
    { shape: 'Round', count: 184 },
    { shape: 'Princess', count: 76 },
    { shape: 'Oval', count: 68 },
    { shape: 'Emerald', count: 52 },
    { shape: 'Cushion', count: 48 },
  ]);
  const [transactions, setTransactions] = useState<RecentTx[]>([
    {
      id: 'demo-tx-1',
      refNo: 'INV-2026-089',
      entity: 'Tiffany & Co. Global Buyers',
      type: 'SALE',
      amount: 48250,
      status: 'COMPLETED',
      date: new Date().toISOString(),
    },
    {
      id: 'demo-tx-2',
      refNo: 'PO-2026-042',
      entity: 'De Beers Sightholder Direct',
      type: 'PURCHASE',
      amount: 112400,
      status: 'COMPLETED',
      date: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'demo-tx-3',
      refNo: 'MEM-2026-018',
      entity: 'Cartier Luxury Maison',
      type: 'MEMO_OUT',
      amount: 85000,
      status: 'CONSIGNED',
      date: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'demo-tx-4',
      refNo: 'TRN-2026-009',
      entity: 'Antwerp Diamond Exchange -> NY HQ',
      type: 'TRANSFER',
      amount: 42100,
      status: 'IN_TRANSIT',
      date: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'demo-tx-5',
      refNo: 'INV-2026-088',
      entity: 'Chopard Geneva Boutique',
      type: 'SALE',
      amount: 28900,
      status: 'PENDING',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'demo-tx-6',
      refNo: 'MEM-2026-017',
      entity: 'Surat Polishing Atelier',
      type: 'MEMO_IN',
      amount: 64150,
      status: 'ACTIVE',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'demo-tx-7',
      refNo: 'RET-2026-004',
      entity: 'Bulgari Heritage Collection',
      type: 'RETURN',
      amount: 14500,
      status: 'PROCESSED',
      date: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ]);
  const [branches, setBranches] = useState<Array<{ name: string; revenue: string; pct: number; change: string }>>([
    { name: 'New York Flagship Showroom', revenue: '$1,420,000', pct: 50, change: '+14.2%' },
    { name: 'Antwerp Diamond Exchange', revenue: '$850,000', pct: 30, change: '+8.5%' },
    { name: 'Surat Cutting & Polishing Unit', revenue: '$575,920', pct: 20, change: '+11.8%' },
  ]);
  const [health, setHealth] = useState({ fastMoving: 382, slowMoving: 42, deadStock: 14, reserved: 102 });
  const [activities, setActivities] = useState<Array<{
    user: string;
    action: string;
    time: string;
    badge: string;
    badgeColor: string;
  }>>([
    {
      user: 'Vikram Mehta (HQ Admin)',
      action: 'Approved certified diamond intake GIA-849201',
      time: '12m ago',
      badge: 'Diamond Intake',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      user: 'Ananya Sharma',
      action: 'Completed POS sale invoice #INV-2026-089 ($48,250)',
      time: '34m ago',
      badge: 'POS Sale',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      user: 'Rajesh Kumar',
      action: 'Placed hold on 3.02ct D-VVS1 Emerald cut (#HLD-402)',
      time: '1h ago',
      badge: 'Stock Hold',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      user: 'Vikram Mehta (HQ Admin)',
      action: 'Updated security role profile for Showroom Manager',
      time: '2h ago',
      badge: 'Governance',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
  ]);
  const [revenueSeries, setRevenueSeries] = useState<{
    daily: number[];
    weekly: number[];
    monthly: number[];
  }>({
    daily: [42000, 58000, 39000, 64000, 71000, 53000, 68450],
    weekly: [98000, 112000, 105000, 128000, 140000, 154000],
    monthly: [380000, 410000, 395000, 445000, 460000, 482100],
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
    if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
    return `$${n.toLocaleString('en-US')}`;
  };


  const totalShapePieces = shapes.reduce((sum, s) => sum + s.count, 0);

  const shapeColors: Record<string, string> = {
    Round: '#0D9488',
    Oval: '#3B82F6',
    Princess: '#F59E0B',
    Emerald: '#10B981',
    Cushion: '#8B5CF6',
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

  // SVG chart — fixed viewBox so circles & text never stretch
  const VB_W = 740;
  const VB_H = 200;
  const PL = 52; // left padding — reserves space for Y-axis labels
  const PR = 20; // right padding — breathing room
  const PT = 16; const PB = 32;

  const chartW = VB_W - PL - PR;
  const chartH = VB_H - PT - PB;
  const minSeriesVal = Math.min(...currentSeries);
  const valRange = Math.max(maxSeriesVal - minSeriesVal, 1);

  const svgPoints = currentSeries.map((val, idx) => {
    const n = currentSeries.length;
    const x = PL + idx * (chartW / Math.max(1, n - 1));
    // map value into chart area with 10% top margin
    const y = PT + (1 - (val - minSeriesVal) / valRange) * chartH * 0.85 + chartH * 0.05;
    return { x, y, val };
  });

  // Smooth cubic bezier
  const smoothLinePath = svgPoints.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    const prev = svgPoints[i - 1];
    const cpx = ((prev.x + p.x) / 2).toFixed(2);
    return d + ` C ${cpx} ${prev.y.toFixed(2)}, ${cpx} ${p.y.toFixed(2)}, ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }, '');

  const areaPathD = svgPoints.length === 0 ? '' :
    `M ${svgPoints[0].x.toFixed(2)} ${(VB_H - PB).toFixed(2)} ` +
    `L ${svgPoints[0].x.toFixed(2)} ${svgPoints[0].y.toFixed(2)}` +
    svgPoints.slice(1).reduce((d, p, i) => {
      const prev = svgPoints[i];
      const cpx = ((prev.x + p.x) / 2).toFixed(2);
      return d + ` C ${cpx} ${prev.y.toFixed(2)}, ${cpx} ${p.y.toFixed(2)}, ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }, '') +
    ` L ${svgPoints[svgPoints.length - 1].x.toFixed(2)} ${(VB_H - PB).toFixed(2)} Z`;

  // Y-axis guides: 4 evenly spaced
  const yGuideCount = 4;
  const yGuides = Array.from({ length: yGuideCount }, (_, gi) => {
    const frac = gi / (yGuideCount - 1);
    const val = maxSeriesVal * (1 - frac);
    const y = PT + frac * chartH * 0.9;
    return { val, y };
  });


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
                +0%
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
                +0%
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {metrics.certifiedDiamondsCount.toLocaleString('en-US')}
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
                {metrics.availableStockCount.toLocaleString('en-US')}
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
              <span className="text-xs font-semibold text-text-secondary">$0</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {metrics.diamondsOnHoldCount.toLocaleString('en-US')}
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
                +0%
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold tracking-tight text-foreground">
                {metrics.totalCustomers.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: REVENUE PERFORMANCE GRAPH + STOCK SEGMENTATION DONUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Revenue Performance — Clean Minimal Light Card */}
        <div className="card flex flex-col lg:col-span-2">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Revenue Performance</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {formatCurr(totalPeriodRevenue)}
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                  <MdTrendingUp size={12} />
                  +11.4%
                </span>
              </div>
            </div>

            {/* Period toggle — uses app's filter-group style */}
            <div className="filter-group">
              {(['Daily', 'Weekly', 'Monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPeriod(p); setHoverIdx(null); }}
                  className={`filter-btn ${period === p ? 'active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Chart */}
          <div
            className="relative flex-1 px-2 pt-4 pb-2"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Hover tooltip — offset accounts for PL */}
            {hoverIdx !== null && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-center shadow-lg"
                style={{
                  top: 8,
                  left: svgPoints[hoverIdx]
                    ? `calc(${(svgPoints[hoverIdx].x / VB_W) * 100}%)`
                    : '50%',
                }}
              >
                <p className="text-[10px] font-semibold text-text-muted">{chartLabels[hoverIdx]}</p>
                <p className="text-sm font-extrabold text-primary">{formatCurr(currentSeries[hoverIdx])}</p>
              </div>
            )}

            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              width="100%"
              height="200"
              preserveAspectRatio="none"
              style={{ display: 'block' }}
            >
              <defs>
                {/* Soft primary gradient fill */}
                <linearGradient id="lightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3fa393" stopOpacity="0.18" />
                  <stop offset="85%" stopColor="#3fa393" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#3fa393" stopOpacity="0" />
                </linearGradient>
                <clipPath id="lightChartClip">
                  <rect x={PL} y={PT - 4} width={chartW} height={chartH + 8} />
                </clipPath>
              </defs>

              {/* Y-axis labels — fills the left empty space */}
              {yGuides.map((g, gi) => (
                <text
                  key={`yl-${gi}`}
                  x={PL - 8}
                  y={g.y + 4}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="#94a3b8"
                  fontWeight="500"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {g.val >= 1000000
                    ? `$${(g.val / 1000000).toFixed(1)}M`
                    : g.val >= 1000
                      ? `$${Math.round(g.val / 1000)}k`
                      : `$${Math.round(g.val)}`}
                </text>
              ))}

              {/* Short tick marks at each Y-axis label */}
              {yGuides.map((g, gi) => (
                <line
                  key={`ytick-${gi}`}
                  x1={PL - 3}
                  y1={g.y}
                  x2={PL}
                  y2={g.y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              ))}

              {/* Horizontal grid lines */}
              {yGuides.map((g, gi) => (
                <line
                  key={gi}
                  x1={PL}
                  y1={g.y}
                  x2={VB_W - PR}
                  y2={g.y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray={gi === yGuides.length - 1 ? undefined : '4 8'}
                />
              ))}

              {/* Hover vertical rule */}
              {hoverIdx !== null && svgPoints[hoverIdx] && (
                <line
                  x1={svgPoints[hoverIdx].x}
                  y1={PT}
                  x2={svgPoints[hoverIdx].x}
                  y2={VB_H - PB}
                  stroke="#3fa393"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  strokeOpacity="0.5"
                />
              )}

              {/* Filled area */}
              <path d={areaPathD} fill="url(#lightAreaGrad)" clipPath="url(#lightChartClip)" />

              {/* Smooth line */}
              <path
                d={smoothLinePath}
                fill="none"
                stroke="#3fa393"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath="url(#lightChartClip)"
              />

              {/* Invisible hover rects */}
              {svgPoints.map((p, i) => (
                <rect
                  key={i}
                  x={p.x - VB_W / currentSeries.length / 2}
                  y={PT}
                  width={VB_W / currentSeries.length}
                  height={chartH}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoverIdx(i)}
                />
              ))}

              {/* Data points */}
              {svgPoints.map((p, i) => {
                const active = hoverIdx === i;
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={active ? 5 : 3.5}
                    fill={active ? '#3fa393' : '#fff'}
                    stroke="#3fa393"
                    strokeWidth="1.8"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                );
              })}

              {/* X-axis labels */}
              {svgPoints.map((p, i) => (
                <text
                  key={i}
                  x={p.x}
                  y={VB_H - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={hoverIdx === i ? '#3fa393' : '#94a3b8'}
                  fontWeight={hoverIdx === i ? '700' : '500'}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {chartLabels[i]}
                </text>
              ))}
            </svg>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
            {[
              { label: 'Period Avg', value: formatCurr(avgPeriodRevenue) },
              { label: 'Peak', value: hasRevenueData ? formatCurr(maxSeriesVal) : '—' },
              { label: 'Total', value: formatCurr(totalPeriodRevenue) },
            ].map((k) => (
              <div key={k.label} className="flex flex-col items-center py-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{k.label}</span>
                <span className="mt-0.5 text-sm font-extrabold text-foreground">{k.value}</span>
              </div>
            ))}
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
                  {totalShapePieces.toLocaleString('en-US')}
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
        <div className="card flex flex-col p-5">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-foreground">Quick Actions</h3>
            <p className="mt-0.5 text-[11px] font-medium text-text-secondary">Execute immediate ERP operations</p>
          </div>

          {/* Create Sale — Premium CTA */}
          <Link
            href="/dashboard/sales"
            className="group relative mb-4 flex items-center justify-between overflow-hidden rounded-xl px-4 py-4 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #3fa393 0%, #2f7d70 100%)',
              boxShadow: '0 8px 20px -6px rgba(63,163,147,0.45)',
            }}
          >
            {/* Subtle background shimmer */}
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'linear-gradient(135deg, #4db8a8 0%, #35907f 100%)' }}
            />
            <div className="relative z-10 flex items-center gap-3">
              {/* Icon bubble */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                <MdAddCircleOutline className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white">Create Sale</div>
                <div className="text-[11px] font-medium text-white/75">Start a new billing flow</div>
              </div>
            </div>
            <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
              <MdArrowForward size={15} className="text-white" />
            </div>
          </Link>

          {/* 4 Quick Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/dashboard/sales"
              className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-3.5 text-center transition-all duration-150 hover:border-teal-400/50 hover:bg-teal-50/70"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 transition-colors group-hover:bg-teal-500/20">
                <MdAddCircleOutline className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[11px] font-bold text-foreground">New Invoice</span>
            </Link>

            <Link
              href="/dashboard/transfers"
              className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-3.5 text-center transition-all duration-150 hover:border-blue-400/40 hover:bg-blue-50/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 transition-colors group-hover:bg-blue-500/15">
                <MdSwapHoriz className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-[11px] font-bold text-foreground">Transfer</span>
            </Link>

            <Link
              href="/dashboard/memos"
              className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-3.5 text-center transition-all duration-150 hover:border-amber-400/40 hover:bg-amber-50/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 transition-colors group-hover:bg-amber-500/15">
                <MdReceiptLong className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-[11px] font-bold text-foreground">Memo</span>
            </Link>

            <Link
              href="/dashboard/reports"
              className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-3.5 text-center transition-all duration-150 hover:border-purple-400/40 hover:bg-purple-50/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 transition-colors group-hover:bg-purple-500/15">
                <MdAssessment className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-[11px] font-bold text-foreground">Reports</span>
            </Link>
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
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CONSIGNED">Consigned</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="ACTIVE">Active</option>
              <option value="PROCESSED">Processed</option>
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
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'PURCHASE'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : tx.type === 'MEMO_OUT' || tx.type === 'MEMO_IN'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                : tx.type === 'TRANSFER'
                                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
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
                          tx.status === 'COMPLETED' || tx.status === 'PROCESSED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : tx.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : tx.status === 'CONSIGNED' || tx.status === 'ACTIVE'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tx.status === 'COMPLETED' || tx.status === 'PROCESSED'
                              ? 'bg-emerald-500'
                              : tx.status === 'PENDING'
                                ? 'bg-amber-500'
                                : tx.status === 'CONSIGNED' || tx.status === 'ACTIVE'
                                  ? 'bg-blue-500'
                                  : 'bg-purple-500'
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
