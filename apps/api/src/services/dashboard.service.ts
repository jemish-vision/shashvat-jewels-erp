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
