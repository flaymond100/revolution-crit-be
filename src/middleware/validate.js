'use strict';

const { body, validationResult } = require('express-validator');

/**
 * Returns a middleware that validates the request and sends a 422 response
 * with the validation errors if any are found.
 */
function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      next();
    },
  ];
}

module.exports = { validate, body };
