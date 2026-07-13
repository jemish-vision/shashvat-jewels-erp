import { Request, Response, NextFunction } from 'express';
import * as currencyService from '../../services/currency.service.js';

export async function listCurrenciesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const currencies = await currencyService.listCurrencies(companyId);
    res.json({ success: true, data: currencies });
  } catch (err) {
    next(err);
  }
}

export async function createCurrencyHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const { code, name, symbol, decimals, isBase, initialRate } = req.body;

    const currency = await currencyService.createCurrency(companyId, userId, {
      code,
      name,
      symbol,
      decimals: Number(decimals ?? 2),
      isBase: Boolean(isBase),
      initialRate: initialRate ? Number(initialRate) : undefined,
    });

    res.status(201).json({ success: true, data: currency });
  } catch (err) {
    next(err);
  }
}

export async function updateCurrencyHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const id = req.params.id as string;
    const { name, symbol, decimals, isActive } = req.body;

    const currency = await currencyService.updateCurrency(companyId, userId, id, {
      name,
      symbol,
      decimals: decimals !== undefined ? Number(decimals) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    res.json({ success: true, data: currency });
  } catch (err) {
    next(err);
  }
}

export async function addExchangeRateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const currencyId = req.params.id as string;
    const { rateToBase, effectiveDate } = req.body;

    const rate = await currencyService.addExchangeRate(
      companyId,
      userId,
      currencyId,
      Number(rateToBase),
      effectiveDate ? new Date(effectiveDate) : new Date()
    );

    res.status(201).json({ success: true, data: rate });
  } catch (err) {
    next(err);
  }
}

export async function getRateHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const currencyId = req.params.id as string;
    const history = await currencyService.getExchangeRateHistory(companyId, currencyId);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

export async function deleteCurrencyHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const currencyId = req.params.id as string;
    const result = await currencyService.deleteCurrency(companyId, userId, currencyId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
