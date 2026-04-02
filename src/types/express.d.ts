import type { User } from '@supabase/supabase-js'; // typed

declare module 'express-serve-static-core' {
  interface Request {
    user?: User; // typed — set by authenticate middleware
  }
}

export {}; // typed — makes this a module so declare global is valid
