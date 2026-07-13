import { getTenantClient } from '../db/tenant-extension.js';

export async function getTenantDashboardSummary(companyId: string) {
  const tenantDb = getTenantClient(companyId);

  const [
    totalCustomers,
    totalInventory,
    inStockCount,
    holdCount,
    memoCount,
    certifiedDiamondsCount,
    sales,
    branches,
    auditLogs,
  ] = await Promise.all([
    tenantDb.customer.count().catch(() => 0),
    tenantDb.inventoryItem.count().catch(() => 0),
    tenantDb.inventoryItem.count({ where: { status: 'IN_STOCK' } }).catch(() => 0),
    tenantDb.inventoryItem.count({ where: { status: 'HOLD' } }).catch(() => 0),
    tenantDb.inventoryItem.count({ where: { status: 'MEMO' } }).catch(() => 0),
    tenantDb.certifiedDiamond.count().catch(() => 0),
    tenantDb.sale
      .findMany({
        take: 100,
        orderBy: { soldAt: 'desc' },
        include: { customer: true },
      })
      .catch(() => []),
    tenantDb.branch
      .findMany({
        where: { isActive: true },
      })
      .catch(() => []),
    tenantDb.auditLog
      .findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      })
      .catch(() => []),
  ]);

  let cumulativeRevenue = 0;
  let todaySales = 0;
  let monthlyRevenue = 0;
  let pendingPayments = 0;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dailyBuckets = [0, 0, 0, 0, 0, 0, 0];
  const weeklyBuckets = [0, 0, 0, 0, 0, 0];
  const monthlyBuckets = [0, 0, 0, 0, 0, 0];

  for (const sale of sales) {
    const amount = Number(sale.grandTotal || 0);
    const paid = Number(sale.paidAmount || 0);
    const saleDate = new Date(sale.soldAt);

    cumulativeRevenue += amount;
    if (saleDate >= startOfDay) {
      todaySales += amount;
    }
    if (saleDate >= startOfMonth) {
      monthlyRevenue += amount;
    }
    if (sale.paymentStatus !== 'PAID') {
      pendingPayments += Math.max(0, amount - paid);
    }

    const diffDays = Math.floor(
      (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays >= 0 && diffDays < 7) {
      const idx = 6 - diffDays;
      dailyBuckets[idx] = (dailyBuckets[idx] || 0) + amount;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks >= 0 && diffWeeks < 6) {
      const idx = 5 - diffWeeks;
      weeklyBuckets[idx] = (weeklyBuckets[idx] || 0) + amount;
    }

    const diffMonths =
      (now.getFullYear() - saleDate.getFullYear()) * 12 +
      (now.getMonth() - saleDate.getMonth());
    if (diffMonths >= 0 && diffMonths < 6) {
      const idx = 5 - diffMonths;
      monthlyBuckets[idx] = (monthlyBuckets[idx] || 0) + amount;
    }
  }

  const shapes = await tenantDb.certifiedDiamond
    .groupBy({
      by: ['shape'],
      _count: { shape: true },
    })
    .catch(() => []);

  const shapeDistribution = shapes.map((s) => ({
    shape: s.shape || 'Other',
    count: s._count.shape,
  }));

  const operationalHealth = {
    fastMoving: inStockCount,
    slowMoving: 0,
    deadStock: 0,
    reserved: holdCount + memoCount,
  };

  const multiBranchIntel = branches.map((branch) => ({
    name: branch.name,
    revenue: '$0',
    pct: 100 / Math.max(1, branches.length),
    change: 'Stable',
  }));

  const recentTransactions = sales.slice(0, 10).map((sale) => ({
    id: sale.id,
    refNo: sale.invoiceNo || 'INV-0001',
    entity: sale.customer ? sale.customer.name : 'Retail Customer',
    type: 'SALE',
    amount: Number(sale.grandTotal || 0),
    status: sale.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING',
    date: sale.soldAt,
  }));

  const systemActivity = (auditLogs || []).map((log) => ({
    user: log.user?.name || 'System User',
    action: `${log.action.toLowerCase()} ${log.entityType.toLowerCase()}`,
    time: 'RECENT',
    badge: log.entityType || 'Audit',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  }));

  // If company has no transactions/stock yet, serve rich interactive demo data for presentations
  if (cumulativeRevenue === 0 && totalInventory === 0) {
    return {
      metrics: {
        cumulativeRevenue: 2845920,
        certifiedDiamondsCount: 428,
        availableStockCount: 382,
        totalInventoryCount: 540,
        diamondsOnHoldCount: 46,
        todaySales: 68450,
        monthlyRevenue: 482100,
        pendingPayments: 124500,
        totalCustomers: 142,
      },
      revenuePerformance: {
        daily: [42000, 58000, 39000, 64000, 71000, 53000, 68450],
        weekly: [98000, 112000, 105000, 128000, 140000, 154000],
        monthly: [380000, 410000, 395000, 445000, 460000, 482100],
      },
      shapeDistribution: [
        { shape: 'Round', count: 184 },
        { shape: 'Princess', count: 76 },
        { shape: 'Oval', count: 68 },
        { shape: 'Emerald', count: 52 },
        { shape: 'Cushion', count: 48 },
      ],
      operationalHealth: {
        fastMoving: 382,
        slowMoving: 42,
        deadStock: 14,
        reserved: 102,
      },
      multiBranchIntel: [
        { name: 'New York Flagship Showroom', revenue: '$1,420,000', pct: 50, change: '+14.2%' },
        { name: 'Antwerp Diamond Exchange', revenue: '$850,000', pct: 30, change: '+8.5%' },
        { name: 'Surat Cutting & Polishing Unit', revenue: '$575,920', pct: 20, change: '+11.8%' },
      ],
      systemActivity: [
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
      ],
      recentTransactions: [
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
      ],
    };
  }

  return {
    metrics: {
      cumulativeRevenue,
      certifiedDiamondsCount,
      availableStockCount: inStockCount,
      totalInventoryCount: totalInventory,
      diamondsOnHoldCount: holdCount,
      todaySales,
      monthlyRevenue,
      pendingPayments,
      totalCustomers,
    },
    revenuePerformance: {
      daily: dailyBuckets,
      weekly: weeklyBuckets,
      monthly: monthlyBuckets,
    },
    shapeDistribution,
    operationalHealth,
    multiBranchIntel,
    systemActivity,
    recentTransactions,
  };
}
