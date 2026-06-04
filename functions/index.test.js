'use strict';

// ── Mocks (hoisted by Jest before all require calls) ─────────────

jest.mock('firebase-functions', () => ({
  config: () => ({
    sendgrid: { key: 'sg-test-key' },
    twilio: {
      account_sid: 'ACtest000000000000000000000000001',
      auth_token: 'test-auth-token-local',
      phone_number: '+15005550006',
    },
  }),
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  firestore: {
    document: () => ({ onCreate: fn => fn, onUpdate: fn => fn }),
  },
  pubsub: {
    // Support both .schedule().onRun() and .schedule().timeZone().onRun()
    schedule: () => ({ onRun: fn => fn, timeZone: () => ({ onRun: fn => fn }) }),
  },
  https: { onRequest: fn => fn },
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

// twilio() is called inside function bodies to create a client.
// twilio.validateRequest() is called for signature validation.
// Both are exposed on the mock for test assertions.
jest.mock('twilio', () => {
  const smsCreate = jest.fn().mockResolvedValue({ sid: 'SM123' });
  const validateRequest = jest.fn().mockReturnValue(true);
  const twilioFn = jest.fn(() => ({ messages: { create: smsCreate } }));
  twilioFn.validateRequest = validateRequest;
  twilioFn._smsCreate = smsCreate; // exposed for assertions
  return twilioFn;
});

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(),
}));

// ── Module under test ─────────────────────────────────────────────

const fn = require('./index');
const twilio = require('twilio');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// ── Helpers ───────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

// Mirror the getISOWeek helper from index.js so tests can assert idempotency
function currentISOWeek() {
  const d = new Date();
  const dc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dc.getUTCDay() || 7;
  dc.setUTCDate(dc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dc - yearStart) / 86400000) + 1) / 7);
  return `${dc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Build a Firestore db mock for a given scenario.
// standingOrders: [{ id, data: {...} }]
// orders:         [{ source, standingOrderId, status, createdAt, ... }]
// settings:       microBlockedRanges array, etc.
// Returns { standingDocs, orderDocs, newOrderRef } for assertions.
function buildDb({ settings = {}, standingOrders = [], orders = [] } = {}) {
  const standingDocs = standingOrders.map(({ id, data }) => ({
    id: id || 'so-id',
    data: () => data,
    ref: { update: jest.fn().mockResolvedValue(), delete: jest.fn().mockResolvedValue() },
  }));

  const orderDocs = orders.map((o, i) => ({
    id: o.id || `order-${i}`,
    data: () => o,
    ref: { update: jest.fn().mockResolvedValue(), delete: jest.fn().mockResolvedValue() },
  }));

  const newOrderRef = { id: 'new-order-id', set: jest.fn().mockResolvedValue() };

  const ordersCol = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: orderDocs.length === 0, docs: orderDocs }),
    doc: jest.fn(docId => {
      if (docId === '_settings_') {
        return { get: jest.fn().mockResolvedValue({ exists: true, data: () => settings }) };
      }
      return newOrderRef;
    }),
  };

  const standingCol = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: standingDocs.length === 0, docs: standingDocs }),
  };

  admin.firestore.mockReturnValue({
    collection: jest.fn(name => name === 'orders' ? ordersCol : standingCol),
  });

  return { standingDocs, orderDocs, newOrderRef };
}

function makeTwilioReq(body) {
  return {
    headers: { host: 'us-central1-project.cloudfunctions.net', 'x-twilio-signature': 'valid' },
    originalUrl: '/twilioWebhook',
    body,
  };
}

function makeMockRes() {
  return { status: jest.fn().mockReturnThis(), send: jest.fn(), set: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  twilio.validateRequest.mockReturnValue(true); // valid signature by default
});

// ─────────────────────────────────────────────────────────────────
// processStandingOrders
// ─────────────────────────────────────────────────────────────────

describe('processStandingOrders', () => {
  test('1. returns early with no active standing orders', async () => {
    buildDb();
    await fn.processStandingOrders({});
    expect(twilio._smsCreate).not.toHaveBeenCalled();
  });

  test('2. skips orders already processed this week (idempotency)', async () => {
    buildDb({
      standingOrders: [{
        id: 'so1',
        data: { name: 'Jane', phone: '+15551234567', status: 'active', lastProcessedWeek: currentISOWeek() },
      }],
    });
    await fn.processStandingOrders({});
    expect(twilio._smsCreate).not.toHaveBeenCalled();
  });

  test('3. blocked week: sends paused SMS, does not create order', async () => {
    const { newOrderRef } = buildDb({
      settings: { microBlockedRanges: [{ from: TODAY, to: TODAY }] },
      standingOrders: [{
        id: 'so1',
        data: { name: 'Jane', phone: '+15551234567', status: 'active' },
      }],
    });
    await fn.processStandingOrders({});
    expect(twilio._smsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+15551234567', body: expect.stringContaining('break') })
    );
    expect(newOrderRef.set).not.toHaveBeenCalled();
  });

  test('4. normal week: creates order with source flag and sends confirmation SMS', async () => {
    const { newOrderRef } = buildDb({
      standingOrders: [{
        id: 'so1',
        data: { name: 'Jane', phone: '+15551234567', status: 'active', items: 'Banana bread x2', total: '$18' },
      }],
    });
    await fn.processStandingOrders({});
    expect(newOrderRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'standing-order', standingOrderId: 'so1', status: 'pending' })
    );
    expect(twilio._smsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+15551234567', body: expect.stringContaining('SKIP') })
    );
  });
});

// ─────────────────────────────────────────────────────────────────
// twilioWebhook
// ─────────────────────────────────────────────────────────────────

describe('twilioWebhook', () => {
  test('5. invalid Twilio signature returns 403', async () => {
    buildDb();
    twilio.validateRequest.mockReturnValue(false);
    const req = makeTwilioReq({ From: '+15551234567', Body: 'SKIP' });
    const res = makeMockRes();
    await fn.twilioWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Forbidden');
  });

  test('6. SKIP deletes pending order and replies with confirmation', async () => {
    const { orderDocs } = buildDb({
      standingOrders: [{ id: 'so1', data: { name: 'Jane', phone: '+15551234567', status: 'active' } }],
      orders: [{ source: 'standing-order', standingOrderId: 'so1', status: 'pending', createdAt: new Date().toISOString() }],
    });
    const res = makeMockRes();
    await fn.twilioWebhook(makeTwilioReq({ From: '+15551234567', Body: 'SKIP' }), res);
    expect(orderDocs[0].ref.delete).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/xml');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('skip'));
  });

  test('7. SKIP when order already confirmed: does not delete, replies with already-confirmed message', async () => {
    const { orderDocs } = buildDb({
      standingOrders: [{ id: 'so1', data: { name: 'Jane', phone: '+15551234567', status: 'active' } }],
      orders: [{ source: 'standing-order', standingOrderId: 'so1', status: 'confirmed', createdAt: new Date().toISOString() }],
    });
    const res = makeMockRes();
    await fn.twilioWebhook(makeTwilioReq({ From: '+15551234567', Body: 'SKIP' }), res);
    expect(orderDocs[0].ref.delete).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('confirmed'));
  });

  test('8. STOP marks standing order as cancelled', async () => {
    const { standingDocs } = buildDb({
      standingOrders: [{ id: 'so1', data: { name: 'Jane', phone: '+15551234567', status: 'active' } }],
    });
    const res = makeMockRes();
    await fn.twilioWebhook(makeTwilioReq({ From: '+15551234567', Body: 'STOP' }), res);
    expect(standingDocs[0].ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    );
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
  });

  test('9. STOP with no standing order replies gracefully', async () => {
    buildDb({ standingOrders: [] });
    const res = makeMockRes();
    await fn.twilioWebhook(makeTwilioReq({ From: '+15551234567', Body: 'STOP' }), res);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("don't have"));
  });

  test('10. unknown keyword replies with SKIP/STOP instructions', async () => {
    buildDb({ standingOrders: [] });
    const res = makeMockRes();
    await fn.twilioWebhook(makeTwilioReq({ From: '+15551234567', Body: 'HELLO' }), res);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('SKIP'));
  });
});

// ─────────────────────────────────────────────────────────────────
// onNewOrder
// ─────────────────────────────────────────────────────────────────

describe('onNewOrder', () => {
  test('11. source:standing-order returns null without sending emails', async () => {
    const snap = {
      data: () => ({
        source: 'standing-order',
        type: 'micro-bakery',
        name: 'Jane',
        email: 'jane@example.com',
      }),
    };
    const result = await fn.onNewOrder(snap, {});
    expect(result).toBeNull();
    expect(sgMail.send).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────
// onNewStandingOrder
// ─────────────────────────────────────────────────────────────────

describe('onNewStandingOrder', () => {
  test('12. sends admin + customer emails on standing order signup', async () => {
    const snap = {
      data: () => ({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+15551234567',
        items: 'Red Velvet Cupcakes (doz)',
        total: '$35',
        frequency: 'weekly',
        status: 'active',
      }),
    };
    await fn.onNewStandingOrder(snap, {});
    expect(sgMail.send).toHaveBeenCalledTimes(2);
    // Admin email
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'New Standing Order — Jane Doe' })
    );
    // Customer email
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: 'Your weekly standing order is confirmed!',
      })
    );
  });

  test('13. skips customer email if no email on standing order', async () => {
    const snap = {
      data: () => ({
        name: 'Jane Doe',
        phone: '+15551234567',
        items: 'Red Velvet Cupcakes (doz)',
        total: '$35',
      }),
    };
    await fn.onNewStandingOrder(snap, {});
    // Only admin email sent, no customer email
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'New Standing Order — Jane Doe' })
    );
  });
});
