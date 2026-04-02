import { body, validationResult, ValidationChain } from 'express-validator'; // typed
import { Request, Response, NextFunction, RequestHandler } from 'express'; // typed

/**
 * Returns a middleware that validates the request and sends a 422 response
 * with the validation errors if any are found.
 */
function validate(rules: ValidationChain[]): RequestHandler[] { // typed
  return [
    ...rules, // typed — ValidationChain implements RequestHandler in express-validator v7
    (req: Request, res: Response, next: NextFunction): void => { // typed
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return; // typed — return void instead of return res.status()
      }
      next();
    },
  ];
}

export { validate, body }; // typed
