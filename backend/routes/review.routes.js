import { Router } from 'express';
import { create, listPublic, list, updateStatus, remove } from '../controllers/review.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

router.post('/', create);
router.get('/public', listPublic);

router.use(isAuth, authorizeRoles('admin', 'staff'));
router.get('/', list);
router.patch('/:id/status', updateStatus);
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
