import { Router } from 'express';
import {
  dashboardStats,
  analytics,
  listAllPatients, patientDetails,
  listStaff, createStaff, updateStaff, deleteStaff,
  listAdmins, createAdmin, deleteAdmin,
} from '../controllers/admin.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// Every route here requires an admin.
router.use(isAuth, authorizeRoles('admin'));

router.get('/dashboard-stats', dashboardStats);
router.get('/analytics',       analytics);

router.get('/patients',     listAllPatients);
router.get('/patients/:id', patientDetails);

router.get('/staff',         listStaff);
router.post('/staff',        createStaff);
router.patch('/staff/:id',   updateStaff);
router.delete('/staff/:id',  deleteStaff);

router.get('/admins',        listAdmins);
router.post('/admins',       createAdmin);
router.delete('/admins/:id', deleteAdmin);

export default router;
