import express, { Router } from 'express'; // typed
import { register, login, logout, me } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { validate, body } from '../middleware/validate';

const router: Router = express.Router(); // typed

const emailPasswordRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

router.post('/register', validate(emailPasswordRules), register);
router.post('/login', validate(emailPasswordRules), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router; // typed
