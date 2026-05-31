import { Router } from 'express';
import {
  create, list, detail, stats,
  update, updateStatus, remove,
  bulkStatus, bulkRemove,
} from '../controllers/enquiry.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// Public — submit an enquiry via the contact form.
router.post('/', create);

// Everything below requires admin or staff.
router.use(isAuth, authorizeRoles('admin', 'staff'));

router.get('/stats',       stats);
router.get('/',            list);

// Bulk actions — admin only since they can affect many rows at once.
router.post('/bulk/status',  authorizeRoles('admin'), bulkStatus);
router.post('/bulk/delete',  authorizeRoles('admin'), bulkRemove);

router.get('/:id',           detail);
router.patch('/:id',         update);          // status / priority / internal_note
router.patch('/:id/status',  updateStatus);    // legacy back-compat
router.delete('/:id',        authorizeRoles('admin'), remove);

export default router;
