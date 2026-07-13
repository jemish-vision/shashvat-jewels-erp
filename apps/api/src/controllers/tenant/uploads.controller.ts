import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import * as storageService from '../../services/storage.service.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function uploadFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;

    if (!req.file) {
      throw new BusinessRuleError('No file uploaded');
    }

    const { kind = 'GENERAL', entityType = 'UNKNOWN', entityId = companyId } = req.body;

    const media = await storageService.uploadMediaFile(companyId, userId, {
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      kind,
      entityType,
      entityId,
    });

    res.status(201).json({ success: true, data: media });
  } catch (err) {
    next(err);
  }
}

export async function serveFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const fileName = req.params.fileName as string;
    // Sanitize fileName against directory traversal
    const safeName = path.basename(fileName);
    const filePath = path.join(UPLOADS_DIR, safeName);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundError('File not found');
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}
