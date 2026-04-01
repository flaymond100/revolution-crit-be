'use strict';

const express = require('express');
const { createIntent, handleWebhook } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authenticate');
const { validate, body } = require('../middleware/validate');

const router = express.Router();

const createIntentRules = [
  body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer (smallest currency unit)'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter ISO code'),
];

// Webhook uses raw body – must be mounted BEFORE the json() middleware in app.js
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-payment-intent', authenticate, validate(createIntentRules), createIntent);

module.exports = router;
