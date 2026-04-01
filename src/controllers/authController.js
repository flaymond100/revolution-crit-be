'use strict';

const { supabase } = require('../config/supabase');

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ user: data.user, session: data.session });
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({ user: data.user, session: data.session });
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    await supabase.auth.admin?.signOut(token).catch(() => {});
  }

  res.json({ message: 'Logged out successfully' });
}

/**
 * GET /api/auth/me
 */
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, logout, me };
