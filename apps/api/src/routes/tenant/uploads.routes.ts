import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantScope } from '../../middleware/tenant-scope.js';
import {
  uploadFileHandler,
  serveFileHandler,
} from '../../controllers/tenant/uploads.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

const router = Router();

// Publicly serve uploaded media files by safe name
router.get('/files/:fileName', serveFileHandler);

// Protected upload endpoint
router.post('/', authenticate, tenantScope, upload.single('file'), uploadFileHandler);

export default router;
