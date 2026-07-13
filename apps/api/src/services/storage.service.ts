import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../db/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAudit } from './audit.service.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export interface UploadInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  entityType: string;
  entityId: string;
}

export async function uploadMediaFile(
  companyId: string,
  userId: string | null,
  input: UploadInput
) {
  // Ensure local storage dir exists for fallback / local mode
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const safeName = `${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(UPLOADS_DIR, safeName);

  await fs.writeFile(filePath, input.buffer);

  const url = `/api/tenant/uploads/files/${safeName}`;

  const mediaFile = await prisma.mediaFile.create({
    data: {
      companyId,
      kind: input.kind,
      entityType: input.entityType,
      entityId: input.entityId,
      url,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedById: userId,
    },
  });

  await writeAudit(prisma, {
    companyId,
    userId,
    action: 'UPLOAD_MEDIA',
    entityType: 'MEDIA_FILE',
    entityId: mediaFile.id,
    after: mediaFile,
  });

  return mediaFile;
}

export async function getMediaFile(companyId: string, id: string) {
  const mediaFile = await prisma.mediaFile.findFirst({
    where: { id, companyId, deletedAt: null },
  });

  if (!mediaFile) {
    throw new NotFoundError('Media file not found');
  }

  return mediaFile;
}

export async function listMediaFiles(companyId: string, entityType?: string, entityId?: string) {
  return prisma.mediaFile.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
    },
    orderBy: { createdAt: 'desc' },
  });
}
