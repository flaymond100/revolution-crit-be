'use strict';

const express = require('express');
const { register, login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { validate, body } = require('../middleware/validate');

const router = express.Router();

const emailPasswordRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

router.post('/register', validate(emailPasswordRules), register);
router.post('/login', validate(emailPasswordRules), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
