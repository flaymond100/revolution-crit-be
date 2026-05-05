import express, { Router } from 'express'; // typed
import { createIntent } from '../controllers/paymentController';
import { validate, body } from '../middleware/validate';

const router: Router = express.Router(); // typed

const createIntentRules = [
  body().custom((value) => {
    const subRaceId = value.subRaceId || value.sub_race_id;
    if (!subRaceId) {
      throw new Error('subRaceId or sub_race_id is required');
    }
    return true;
  }),
  body('subRaceId').optional().isUUID().withMessage('subRaceId must be a valid UUID'),
  body('sub_race_id').optional().isUUID().withMessage('sub_race_id must be a valid UUID'),
  body('participant').isObject().withMessage('participant must be an object'),
  body().custom((value) => {
    const participant = value.participant || {};
    const fullName = participant.fullName || participant.full_name;
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      throw new Error('participant.fullName or participant.full_name is required');
    }
    return true;
  }),
  body('participant.fullName').optional().isString().notEmpty().withMessage('participant.fullName is required'),
  body('participant.full_name').optional().isString().notEmpty().withMessage('participant.full_name is required'),
  body('participant.email').isEmail().withMessage('participant.email must be a valid email'),
  body('participant.dateOfBirth').optional().isISO8601().withMessage('participant.dateOfBirth must be a valid date'),
  body('participant.date_of_birth').optional().isISO8601().withMessage('participant.date_of_birth must be a valid date'),
  body('participant.gender').optional().isIn(['male', 'female', 'other']).withMessage('participant.gender must be male, female, or other'),
  body('participant.teamName').optional().isString().withMessage('participant.teamName must be a string'),
  body('participant.team_name').optional().isString().withMessage('participant.team_name must be a string'),
  body('participant.nationality').optional().isString().withMessage('participant.nationality must be a string'),
  body('participant.phone').optional().isString().withMessage('participant.phone must be a string'),
  body().custom((value) => {
    const successUrl = value.successUrl || value.success_url;
    const cancelUrl = value.cancelUrl || value.cancel_url;

    if (!successUrl) {
      throw new Error('successUrl or success_url is required');
    }

    if (!cancelUrl) {
      throw new Error('cancelUrl or cancel_url is required');
    }

    return true;
  }),
  body('successUrl').optional().isURL({ require_protocol: true, require_tld: false }).withMessage('successUrl must be a valid URL'),
  body('success_url').optional().isURL({ require_protocol: true, require_tld: false }).withMessage('success_url must be a valid URL'),
  body('cancelUrl').optional().isURL({ require_protocol: true, require_tld: false }).withMessage('cancelUrl must be a valid URL'),
  body('cancel_url').optional().isURL({ require_protocol: true, require_tld: false }).withMessage('cancel_url must be a valid URL'),
];

// Public route for race registration checkout
router.post('/create-payment-intent', validate(createIntentRules), createIntent);

export default router; // typed
