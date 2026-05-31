import { Router } from 'express';
import { dashboardStats } from '../controllers/staff.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

router.use(isAuth, authorizeRoles('admin', 'staff'));

router.get('/dashboard-stats', dashboardStats);

export default router;
