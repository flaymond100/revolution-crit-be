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
| POST | `/api/payments/create-payment-intent` | Public | Create a Stripe Checkout Session for race registration |
| POST | `/api/payments/webhook` | Stripe signature | Handle Stripe webhook events |

**Create Checkout Session body:**
```json
{
  "amount": 1000,
  "currency": "usd",
  "subRaceId": "8d0b0b84-c0fd-4796-8ee5-0fa1ec3d494e",
  "participant": {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "dateOfBirth": "1994-08-20",
    "gender": "female",
    "teamName": "City Runners",
    "nationality": "CZ",
    "phone": "+420123456789"
  },
  "successUrl": "https://your-frontend.com/checkout/success",
  "cancelUrl": "https://your-frontend.com/checkout/cancel"
}
```

`amount` is in the **smallest currency unit** (e.g. cents for USD).

**Response:**
```json
{ "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_xxx", "sessionId": "cs_xxx" }
```

Redirect the user to `checkoutUrl` so Stripe hosts the payment page.

**Webhook setup:**  
Point your Stripe webhook to `https://your-domain.com/api/payments/webhook` and set `STRIPE_WEBHOOK_SECRET`.

---

## Supabase Database

When Stripe confirms payment (`checkout.session.completed`), the backend:

1. finds or creates a record in `participants` using the submitted participant data
2. creates or updates a paid record in `race_entries` for the selected `subRaceId`

Expected schema fields used by the backend:

```sql
participants.full_name
participants.date_of_birth
participants.gender
participants.team_name
participants.nationality
participants.email
participants.phone

race_entries.sub_race_id
race_entries.participant_id
race_entries.is_paid
race_entries.payment_amount
race_entries.payment_currency
race_entries.payment_date
race_entries.notes
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
