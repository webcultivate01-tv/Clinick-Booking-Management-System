import { Router } from 'express';
import { list, create, update, remove } from '../controllers/gallery.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/', list);

// Admin + staff can both manage the gallery (staff handles day-to-day uploads
// like before/after photos; admin retains delete authority).
router.use(isAuth, authorizeRoles('admin', 'staff'));
router.post('/', upload.single('image'), create);
router.patch('/:id', update);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
