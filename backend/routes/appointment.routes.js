import { Router } from 'express';
import {
  createOrderForAppointment,
  verifyAppointmentPayment,
  staffCreateAppointment,
  listAll,
  listToday,
  getOne,
  updateStatus,
  reschedule,
  cancelAppointment,
  remove,
  dashboardStats,
  resendConfirmation,
} from '../controllers/appointment.controller.js';
import { getDaySlots } from '../controllers/opd.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

/* ---- public booking flow ---- */
router.get('/slots', getDaySlots);
router.post('/create-order', createOrderForAppointment);
router.post('/verify-payment', verifyAppointmentPayment);

/* ---- dashboard (admin + staff) ---- */
router.use(isAuth, authorizeRoles('admin', 'staff'));

router.post('/staff-create', staffCreateAppointment);
router.get('/stats', dashboardStats);
router.get('/today', listToday);
router.get('/', listAll);
router.get('/:id', getOne);

router.patch('/:id/status', updateStatus);
router.patch('/:id/reschedule', reschedule);
router.post('/:id/cancel', cancelAppointment);
router.post('/:id/resend-confirmation', resendConfirmation);

// Only admins can permanently delete an appointment.
router.delete('/:id', authorizeRoles('admin'), remove);

export default router;
