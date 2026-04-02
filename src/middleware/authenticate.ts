import { Request, Response, NextFunction } from 'express'; // typed
import { supabase } from '../config/supabase';

/**
 * Extracts the Bearer token from the Authorization header, verifies it with
 * Supabase, and attaches the user to req.user.
 */
async function authenticate(
  req: Request, // typed
  res: Response, // typed
  next: NextFunction // typed
): Promise<void> { // typed
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return; // typed — return void instead of return res.status(), incompatible with Promise<void>
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return; // typed — see above
  }

  req.user = data.user; // typed — user shape defined in src/types/express.d.ts
  next();
}

export { authenticate }; // typed
