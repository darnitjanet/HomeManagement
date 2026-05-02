import { Router } from 'express';
import * as paybackController from '../controllers/payback.controller';

const router = Router();

// Accounts
router.get('/accounts', paybackController.getAllAccounts);
router.get('/accounts/:id', paybackController.getAccount);
router.post('/accounts', paybackController.createAccount);
router.put('/accounts/:id', paybackController.updateAccount);

// Chores
router.post('/accounts/:id/chores', paybackController.addChore);
router.get('/accounts/:id/chores', paybackController.getChores);
router.delete('/chores/:id', paybackController.deleteChore);

// Reset
router.post('/accounts/:id/reset', paybackController.resetAccount);

export default router;
