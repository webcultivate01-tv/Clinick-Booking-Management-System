import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', isAuth, me);

// Only an admin can create new users (admin or staff).
router.post('/register', isAuth, authorizeRoles('admin'), register);

export default router;
