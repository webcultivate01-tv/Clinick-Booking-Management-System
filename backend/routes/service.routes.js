import { Router } from 'express';
import { list, getBySlug, create, update, remove } from '../controllers/service.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// Public
router.get('/', list);
router.get('/:slug', getBySlug);

// Admin-only writes; multer handles a single optional 'image' field.
router.post('/', isAuth, authorizeRoles('admin'), upload.single('image'), create);
router.patch('/:id', isAuth, authorizeRoles('admin'), upload.single('image'), update);
router.delete('/:id', isAuth, authorizeRoles('admin'), remove);

export default router;
