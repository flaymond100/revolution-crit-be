'use strict';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

const request = require('supertest');

const mockParticipantsMaybeSingle = jest.fn();
const mockParticipantsSingle = jest.fn();
const mockRaceEntriesUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockParticipantsInsertSelectSingle = jest.fn(() => ({
  single: mockParticipantsSingle,
}));
const mockParticipantsInsert = jest.fn(() => ({
  select: mockParticipantsInsertSelectSingle,
}));
const mockParticipantsSelectEq = jest.fn(() => ({
  maybeSingle: mockParticipantsMaybeSingle,
}));
const mockParticipantsSelect = jest.fn(() => ({
  eq: mockParticipantsSelectEq,
}));

// Mock supabase and stripe before requiring app
jest.mock('../src/config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn((table) => {
      if (table === 'participants') {
        return {
          select: mockParticipantsSelect,
          insert: mockParticipantsInsert,
        };
      }

      if (table === 'race_entries') {
        return {
          upsert: mockRaceEntriesUpsert,
        };
      }

      return {
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
    }),
  },
}));

jest.mock('../src/config/stripe', () => {
  const stripeMock = {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  return stripeMock;
});

const app = require('../src/app');
const { supabase } = require('../src/config/supabase');
const stripe = require('../src/config/stripe');

beforeEach(() => {
  mockParticipantsMaybeSingle.mockReset();
  mockParticipantsSingle.mockReset();
  mockRaceEntriesUpsert.mockClear();

  mockParticipantsMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockParticipantsSingle.mockResolvedValue({
    data: { id: 'participant-1', full_name: 'Test User', email: 'test@example.com' },
    error: null,
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------
describe('404 fallback', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  it('returns 422 when body is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 201 on successful registration', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'a@a.com' }, session: null },
      error: null,
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@a.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
  });

  it('returns 400 when supabase returns an error', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: {},
      error: { message: 'Email already registered' },
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@a.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 on invalid credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: 'Invalid login credentials' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('returns 200 with session on success', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'u1', email: 'a@a.com' },
        session: { access_token: 'tok123' },
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.session).toHaveProperty('access_token', 'tok123');
  });
});

// ---------------------------------------------------------------------------
// Payment routes
// ---------------------------------------------------------------------------
describe('POST /api/payments/create-payment-intent', () => {
  it('returns 422 when required registration fields are missing', async () => {
    const res = await request(app)
      .post('/api/payments/create-payment-intent')
      .send({ amount: 1000, currency: 'usd' });

    expect(res.status).toBe(422);
  });

  it('returns 422 when amount is missing', async () => {
    const res = await request(app)
      .post('/api/payments/create-payment-intent')
      .send({
        currency: 'usd',
        subRaceId: '8d0b0b84-c0fd-4796-8ee5-0fa1ec3d494e',
        participant: { fullName: 'Test User', email: 'test@example.com' },
        successUrl: 'http://localhost:5173/success',
        cancelUrl: 'http://localhost:5173/cancel',
      });

    expect(res.status).toBe(422);
  });

  it('returns 201 with checkoutUrl on success', async () => {
    stripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });

    const res = await request(app)
      .post('/api/payments/create-payment-intent')
      .send({
        amount: 1000,
        currency: 'usd',
        subRaceId: '8d0b0b84-c0fd-4796-8ee5-0fa1ec3d494e',
        participant: {
          fullName: 'Test User',
          email: 'test@example.com',
          gender: 'male',
        },
        successUrl: 'http://localhost:5173/success',
        cancelUrl: 'http://localhost:5173/cancel',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('checkoutUrl', 'https://checkout.stripe.com/c/pay/cs_test_123');
  });
});

describe('POST /api/payments/webhook', () => {
  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('returns 400 if stripe signature verification fails', async () => {
    stripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'bad-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })));

    expect(res.status).toBe(400);
  });

  it('returns 200 with received:true on valid webhook', async () => {
    stripe.webhooks.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          payment_intent: 'pi_1',
          payment_status: 'paid',
          amount_total: 1000,
          currency: 'usd',
          customer_email: 'test@example.com',
          metadata: {
            sub_race_id: '8d0b0b84-c0fd-4796-8ee5-0fa1ec3d494e',
            registration_payload: JSON.stringify({
              subRaceId: '8d0b0b84-c0fd-4796-8ee5-0fa1ec3d494e',
              participant: {
                fullName: 'Test User',
                email: 'test@example.com',
                gender: 'male',
              },
            }),
          },
        },
      },
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mockRaceEntriesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sub_race_id: '8d0b0b84-c0fd-4796-8ee5-0fa1ec3d494e',
        participant_id: 'participant-1',
        is_paid: true,
        payment_amount: 10,
        payment_currency: 'USD',
      }),
      { onConflict: 'sub_race_id,participant_id' }
    );
  });
});
