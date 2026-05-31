import { Router } from 'express';
import { list, getOne } from '../controllers/payment.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// Payments dashboard — admin only.
router.use(isAuth, authorizeRoles('admin'));

router.get('/', list);
router.get('/:id', getOne);

export default router;
