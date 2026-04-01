# revolution-crit-be

A Node.js + Express REST API backend with **Supabase** (auth & database) and **Stripe** (payments) integration.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (default `3000`) |
| `NODE_ENV` | `development` or `production` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (e.g. `http://localhost:5173`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (used for admin operations) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) |

### 3. Run the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## API Reference

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Server health check |

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Log in and receive a session token |
| POST | `/api/auth/logout` | — | Log out |
| GET | `/api/auth/me` | Bearer token | Get the current authenticated user |

**Register / Login body:**
```json
{ "email": "user@example.com", "password": "yourpassword" }
```

**Login / Register response:**
```json
{ "user": { ... }, "session": { "access_token": "...", ... } }
```

Pass the `access_token` as a `Bearer` token in the `Authorization` header for protected routes.

### Payments (`/api/payments`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/create-payment-intent` | Bearer token | Create a Stripe Payment Intent |
| POST | `/api/payments/webhook` | Stripe signature | Handle Stripe webhook events |

**Create Payment Intent body:**
```json
{ "amount": 1000, "currency": "usd", "metadata": {} }
```

`amount` is in the **smallest currency unit** (e.g. cents for USD).

**Response:**
```json
{ "clientSecret": "pi_xxx_secret_xxx" }
```

Use the `clientSecret` on your frontend with [Stripe.js](https://stripe.com/docs/js) to confirm the payment.

**Webhook setup:**  
Point your Stripe webhook to `https://your-domain.com/api/payments/webhook` and set `STRIPE_WEBHOOK_SECRET`.

---

## Supabase Database

When a Payment Intent is created via the API it is saved to a `payment_intents` table (requires `supabaseAdmin`). Create the table in your Supabase project:

```sql
create table payment_intents (
  id               uuid primary key default gen_random_uuid(),
  stripe_payment_intent_id text unique not null,
  amount           integer not null,
  currency         text not null,
  status           text not null,
  metadata         jsonb,
  created_at       timestamptz default now()
);
```

---

## Frontend Integration (CORS)

Set `ALLOWED_ORIGINS` to the URL(s) of your frontend, e.g.:

```
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
```

All requests with a matching `Origin` header are allowed, and credentials are supported.

---

## Running Tests

```bash
npm test
```
