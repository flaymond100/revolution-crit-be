import { Request, Response } from 'express'; // typed
import { supabase } from '../config/supabase';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface AuthBody { // typed
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/register
 */
async function register(
  req: Request<Record<string, string>, unknown, AuthBody>, // typed
  res: Response // typed
): Promise<void> { // typed
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    res.status(400).json({ error: error.message });
    return; // typed — return void instead of return res.status()
  }

  res.status(201).json({ user: data.user, session: data.session });
}

/**
 * POST /api/auth/login
 */
async function login(
  req: Request<Record<string, string>, unknown, AuthBody>, // typed
  res: Response // typed
): Promise<void> { // typed
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    res.status(401).json({ error: error.message });
    return; // typed — return void instead of return res.status()
  }

  res.json({ user: data.user, session: data.session });
}

/**
 * POST /api/auth/logout
 */
async function logout(
  req: Request, // typed
  res: Response // typed
): Promise<void> { // typed
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    await supabase.auth.admin?.signOut(token).catch(() => {}); // typed — admin.signOut(uid: string); optional chain preserved from original
  }

  res.json({ message: 'Logged out successfully' });
}

/**
 * GET /api/auth/me
 */
async function me(
  req: Request, // typed
  res: Response // typed
): Promise<void> { // typed
  res.json({ user: req.user }); // typed — req.user augmented in src/types/express.d.ts
}

export { register, login, logout, me }; // typed
