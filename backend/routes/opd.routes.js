import { Router } from 'express';
import {
  getOpdDefaults, updateOpdDefaults,
  listOpdSchedules, upsertOpdSchedule, removeOpdSchedule,
  getOpdDay,
} from '../controllers/opd.controller.js';
import { isAuth } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// Public — patients can see the resolved schedule for a given day even
// though slot listing is exposed via /api/appointments/slots.
router.get('/day/:date', getOpdDay);

// Everything below requires staff or admin. Staff are the ones opening the
// clinic each day, so they need to set the OPD window — restricting this to
// admins makes day-to-day operations painful.
router.use(isAuth, authorizeRoles('admin', 'staff'));

router.get('/defaults', getOpdDefaults);
router.put('/defaults', updateOpdDefaults);

router.get('/',              listOpdSchedules);
router.put('/:date',         upsertOpdSchedule);
router.delete('/:date',      removeOpdSchedule);

export default router;
