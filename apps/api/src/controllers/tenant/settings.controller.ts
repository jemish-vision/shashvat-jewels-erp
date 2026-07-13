import { Request, Response, NextFunction } from 'express';
import * as sequencesService from '../../services/sequences.service.js';

export async function listSequencesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    await sequencesService.seedDefaultSequences(companyId);
    const sequences = await sequencesService.listSequences(companyId);
    res.json({ success: true, data: sequences });
  } catch (err) {
    next(err);
  }
}

export async function updateSequencePrefixHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const sequenceId = req.params.id as string;
    const { prefix } = req.body;

    const updated = await sequencesService.updateSequencePrefix(
      companyId,
      userId,
      sequenceId,
      prefix || ''
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
