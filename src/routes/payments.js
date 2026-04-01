'use strict';

const express = require('express');
const { createIntent, handleWebhook } = require('../controllers/paymentController');
const { validate, body } = require('../middleware/validate');

const router = express.Router();

const createIntentRules = [
  body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer (smallest currency unit)'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter ISO code'),
  body('subRaceId').isUUID().withMessage('subRaceId must be a valid UUID'),
  body('participant').isObject().withMessage('participant must be an object'),
  body('participant.fullName').isString().notEmpty().withMessage('participant.fullName is required'),
  body('participant.email').isEmail().withMessage('participant.email must be a valid email'),
  body('participant.dateOfBirth').optional().isISO8601().withMessage('participant.dateOfBirth must be a valid date'),
  body('participant.gender').optional().isIn(['male', 'female', 'other']).withMessage('participant.gender must be male, female, or other'),
  body('participant.teamName').optional().isString().withMessage('participant.teamName must be a string'),
  body('participant.nationality').optional().isString().withMessage('participant.nationality must be a string'),
  body('participant.phone').optional().isString().withMessage('participant.phone must be a string'),
  body('successUrl').isURL({ require_protocol: true, require_tld: false }).withMessage('successUrl must be a valid URL'),
  body('cancelUrl').isURL({ require_protocol: true, require_tld: false }).withMessage('cancelUrl must be a valid URL'),
];

// Webhook uses raw body – must be mounted BEFORE the json() middleware in app.js
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Public route for race registration checkout
router.post('/create-payment-intent', validate(createIntentRules), createIntent);

module.exports = router;
