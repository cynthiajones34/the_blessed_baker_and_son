const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

admin.initializeApp();

sgMail.setApiKey(functions.config().sendgrid.key);

const FROM = { name: 'The Blessed Baker and Son', email: 'info@theblessedbakerandson.com' };
const ADMIN_EMAIL = 'info@theblessedbakerandson.com';

function baseTemplate(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EDE3;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDE3;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#F5EDE3;padding:36px 40px 24px;text-align:center;">
            <img src="https://theblessedbakerandson.com/logo.png" alt="The Blessed Baker and Son" width="180" style="display:block;margin:0 auto;width:180px;height:auto;mix-blend-mode:multiply;" />
          </td>
        </tr>
        <tr><td style="background:#C9AA72;height:3px;"></td></tr>
        <tr>
          <td style="background:#FFFFFF;padding:40px;border-radius:0 0 6px 6px;">
            ${bodyContent}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#9B8275;">The Blessed Baker and Son &nbsp;·&nbsp; Atlanta, GA</p>
            <p style="margin:0;font-size:12px;color:#9B8275;"><a href="mailto:info@theblessedbakerandson.com" style="color:#C9AA72;text-decoration:none;">info@theblessedbakerandson.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function orderTable(order) {
  const rows = (order.items || '—').split(';').map(item => item.trim()).filter(Boolean).map(item =>
    `<tr><td style="padding:8px 0;font-size:14px;color:#3B1F0E;border-bottom:1px solid #F0E8DF;">${item}</td></tr>`
  ).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #F0E8DF;">
      ${rows}
      <tr>
        <td style="padding:12px 0 0;font-size:14px;font-weight:700;color:#3B1F0E;">
          Estimated Total: <span style="color:#8B3A52;">${order.total || '—'}</span>
        </td>
      </tr>
    </table>`;
}

function detailRow(label, value) {
  if (!value) return '';
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#9B8275;width:130px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#3B1F0E;vertical-align:top;">${value}</td>
  </tr>`;
}

// ── NEW ORDER → email admin + customer ──────────────────────────
exports.onNewOrder = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    if (!order || order.type === undefined) return null;
    // Standing-order-created orders: Ina sees them in the Standing Orders admin
    // tab. Suppress the "New Order Received" admin email and "We got your order"
    // customer email — they would fire for every customer every Thursday morning.
    if (order.source === 'standing-order') return null;

    const isPickup = order.type === 'micro-bakery';
    const typeLabel = isPickup ? 'Pickup' : 'Custom Drop-Off';
    const customerName = order.name || 'Customer';
    const firstName = customerName.split(' ')[0];
    const customerEmail = order.email;

    const adminHtml = baseTemplate(`
      <div style="display:inline-block;background:#FDF6EE;border:1px solid #E8D9C8;border-radius:4px;padding:6px 14px;margin-bottom:24px;">
        <span style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8B3A52;">${typeLabel} Order</span>
      </div>
      <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#3B1F0E;">New Order Received</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#9B8275;">A new order request has been submitted.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        ${detailRow('Customer', order.name)}
        ${detailRow('Email', order.email)}
        ${detailRow('Phone', order.phone)}
        ${order.school ? detailRow('School', order.school) : ''}
        ${order.deliveryDate ? detailRow('Delivery Date', order.deliveryDate) : ''}
        ${order.deliveryWindow ? detailRow('Delivery Window', order.deliveryWindow) : ''}
        ${order.notes ? detailRow('Notes', order.notes) : ''}
      </table>
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9B8275;">Order Items</p>
      ${orderTable(order)}
      <div style="margin-top:28px;text-align:center;">
        <a href="https://theblessedbakerandson.com/admin.html" style="display:inline-block;background:#3B1F0E;color:#FAF5EE;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:4px;">View in Admin Panel</a>
      </div>
    `);

    await sgMail.send({
      from: FROM, to: ADMIN_EMAIL,
      subject: `New ${typeLabel} Order — ${customerName}`,
      text: `New ${typeLabel} order from ${customerName}.`,
      html: adminHtml,
    });

    if (!customerEmail) return null;

    const customerHtml = baseTemplate(`
      <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;color:#3B1F0E;">We got your order!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#9B8275;line-height:1.6;">Hi ${firstName}, thank you for ordering with us. We've received your request and will review it shortly.</p>
      <div style="background:#FDF6EE;border-left:3px solid #C9AA72;padding:20px 24px;border-radius:0 4px 4px 0;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9AA72;">What happens next?</p>
        <p style="margin:0;font-size:14px;color:#3B1F0E;line-height:1.7;">We'll review your order and send a confirmation email once it's approved. Payment instructions will be included at that time.</p>
      </div>
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9B8275;">Your Order Summary</p>
      ${orderTable(order)}
      <p style="margin:24px 0 0;font-size:13px;color:#9B8275;line-height:1.7;">Questions? Reply to this email or reach us at <a href="mailto:info@theblessedbakerandson.com" style="color:#C9AA72;">info@theblessedbakerandson.com</a>.</p>
    `);

    await sgMail.send({
      from: FROM, to: customerEmail,
      subject: 'We received your order request!',
      text: `Hi ${firstName}, we received your order. We'll be in touch soon.`,
      html: customerHtml,
    });

    return null;
  });

// ── STATUS → CONFIRMED → email customer ─────────────────────────
exports.onOrderConfirmed = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status || after.status !== 'confirmed') return null;

    const customerEmail = after.email;
    if (!customerEmail) return null;

    const customerName = after.name || 'Customer';
    const firstName = customerName.split(' ')[0];

    const confirmedHtml = baseTemplate(`
      <div style="text-align:center;margin-bottom:28px;"><div style="font-size:48px;">🎉</div></div>
      <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;color:#3B1F0E;text-align:center;">Your order is confirmed!</h2>
      <p style="margin:0 0 28px;font-size:15px;color:#9B8275;line-height:1.6;text-align:center;">Hi ${firstName}, great news — your order is confirmed and now in our baking queue.</p>
      <div style="background:#FDF6EE;border-left:3px solid #C9AA72;padding:20px 24px;border-radius:0 4px 4px 0;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9AA72;">Payment</p>
        <p style="margin:0;font-size:14px;color:#3B1F0E;line-height:1.7;">Payment instructions will be sent separately. We accept Zelle, Venmo, and cash.</p>
      </div>
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9B8275;">Order Details</p>
      ${orderTable(after)}
      <p style="margin:24px 0 0;font-size:13px;color:#9B8275;line-height:1.7;">Questions? Reply to this email or reach us at <a href="mailto:info@theblessedbakerandson.com" style="color:#C9AA72;">info@theblessedbakerandson.com</a>.</p>
    `);

    await sgMail.send({
      from: FROM, to: customerEmail,
      subject: 'Your order is confirmed! 🎉',
      text: `Hi ${firstName}, your order has been confirmed. Thank you!`,
      html: confirmedHtml,
    });

    return null;
  });

// ── NEW SUBSCRIBER → welcome email ──────────────────────────────
exports.onNewSubscriber = functions.firestore
  .document('subscribers/{subscriberId}')
  .onCreate(async (snap, context) => {
    const sub = snap.data();
    if (!sub || !sub.email) return null;

    const html = baseTemplate(`
      <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;color:#3B1F0E;">You're on the list!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#9B8275;line-height:1.6;">Thank you for subscribing to The Blessed Baker and Son. Every Saturday we announce our weekly menu — fresh flavors, made to order.</p>
      <div style="background:#FDF6EE;border-left:3px solid #C9AA72;padding:20px 24px;border-radius:0 4px 4px 0;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9AA72;">How to order</p>
        <p style="margin:0;font-size:14px;color:#3B1F0E;line-height:1.7;">Visit <a href="https://theblessedbakerandson.com" style="color:#C9AA72;">theblessedbakerandson.com</a> to place a pickup or school drop-off order. Orders are accepted weekly while supplies last.</p>
      </div>
      <p style="margin:0;font-size:13px;color:#9B8275;line-height:1.7;">Questions? Reach us at <a href="mailto:info@theblessedbakerandson.com" style="color:#C9AA72;">info@theblessedbakerandson.com</a>.</p>
    `);

    await sgMail.send({
      from: FROM,
      to: sub.email,
      subject: 'You\'re subscribed to The Blessed Baker and Son!',
      text: 'Thank you for subscribing! Every Saturday we announce our weekly menu at theblessedbakerandson.com.',
      html,
    });

    return null;
  });

// ── NEW STANDING ORDER → email admin + customer ─────────────────
exports.onNewStandingOrder = functions.firestore
  .document('standingOrders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    if (!order) return null;

    const customerName = order.name || 'Customer';
    const firstName = customerName.split(' ')[0];
    const customerEmail = order.email;

    const adminHtml = baseTemplate(`
      <div style="display:inline-block;background:#FDF6EE;border:1px solid #E8D9C8;border-radius:4px;padding:6px 14px;margin-bottom:24px;">
        <span style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8B3A52;">Standing Order Sign-Up</span>
      </div>
      <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#3B1F0E;">New Standing Order</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#9B8275;">A customer has signed up for automatic weekly orders.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        ${detailRow('Customer', order.name)}
        ${detailRow('Email', order.email)}
        ${detailRow('Phone', order.phone)}
        ${detailRow('Frequency', order.frequency || 'weekly')}
      </table>
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9B8275;">Standing Order Items</p>
      ${orderTable(order)}
      <div style="margin-top:28px;text-align:center;">
        <a href="https://theblessedbakerandson.com/admin.html" style="display:inline-block;background:#3B1F0E;color:#FAF5EE;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:14px 32px;border-radius:4px;">View in Admin Panel</a>
      </div>
    `);

    await sgMail.send({
      from: FROM, to: ADMIN_EMAIL,
      subject: `New Standing Order — ${customerName}`,
      text: `${customerName} has signed up for a weekly standing order.`,
      html: adminHtml,
    });

    if (!customerEmail) return null;

    const customerHtml = baseTemplate(`
      <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;color:#3B1F0E;">You're signed up for weekly orders!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#9B8275;line-height:1.6;">Hi ${firstName}, thank you for signing up for a weekly standing order. We're excited to bake for you every week!</p>
      <div style="background:#FDF6EE;border-left:3px solid #C9AA72;padding:20px 24px;border-radius:0 4px 4px 0;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9AA72;">How it works</p>
        <p style="margin:0;font-size:14px;color:#3B1F0E;line-height:1.7;">Every Thursday morning you'll receive a text confirmation for that week's order. Reply <strong>SKIP</strong> to skip a week, or <strong>STOP</strong> to cancel anytime. No action needed to receive your order.</p>
      </div>
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9B8275;">Your Weekly Order</p>
      ${orderTable(order)}
      <p style="margin:24px 0 0;font-size:13px;color:#9B8275;line-height:1.7;">Questions? Reply to this email or reach us at <a href="mailto:info@theblessedbakerandson.com" style="color:#C9AA72;">info@theblessedbakerandson.com</a>.</p>
    `);

    await sgMail.send({
      from: FROM, to: customerEmail,
      subject: 'Your weekly standing order is confirmed!',
      text: `Hi ${firstName}, you're signed up for weekly orders from The Blessed Baker and Son. Text SKIP to skip a week or STOP to cancel.`,
      html: customerHtml,
    });

    return null;
  });

// ── EMAIL CAMPAIGN → triggered when admin saves a campaign ───────
exports.onCampaignCreated = functions.firestore
  .document('emailCampaigns/{campaignId}')
  .onCreate(async (snap, context) => {
    const campaign = snap.data();
    if (!campaign || campaign.status !== 'pending') return null;
    return sendCampaign(snap.ref, campaign);
  });

// ── SCHEDULED CAMPAIGN PROCESSOR (every 5 minutes) ──────────────
exports.processScheduledCampaigns = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = new Date().toISOString();
    const snap = await admin.firestore()
      .collection('emailCampaigns')
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', now)
      .get();
    for (const doc of snap.docs) {
      await sendCampaign(doc.ref, doc.data());
    }
    return null;
  });

async function sendCampaign(ref, campaign) {
  const { subject, body, recipients } = campaign;
  if (!recipients || recipients.length === 0) {
    await ref.update({ status: 'sent', sentAt: new Date().toISOString(), sentCount: 0 });
    return;
  }

  const bodyHtml = (body || '').split('\n')
    .map(l => l ? `<p style="margin:0 0 0.9em;font-size:15px;color:#3B1F0E;line-height:1.7;">${l}</p>` : '<br>')
    .join('');

  const html = baseTemplate(bodyHtml);

  const messages = recipients.map(r => ({
    from: FROM,
    to: r.email,
    subject: subject,
    text: body,
    html,
  }));

  // SendGrid supports up to 1000 per batch; chunk to be safe
  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    await sgMail.send(messages.slice(i, i + chunkSize));
  }

  await ref.update({ status: 'sent', sentAt: new Date().toISOString(), sentCount: recipients.length });
}

// ── ISO WEEK HELPER ─────────────────────────────────────────────
// Returns a string like "2026-W23" for the given date.
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ── PROCESS STANDING ORDERS (Thursday 9 AM ET) ──────────────────
//
// Data flow:
//
//   standingOrders (active, status='active')
//          │
//          ▼ for each doc
//   check lastProcessedWeek === currentWeek?  ──YES──► skip (idempotent)
//          │ NO
//          ▼
//   check microBlockedRanges (from _settings_)
//    ├── BLOCKED ──► send "paused" SMS ──► update lastProcessedWeek
//    └── OPEN    ──► create orders/{id} (source:'standing-order')
//                    ──► send "confirmed, reply SKIP" SMS
//                    ──► update lastProcessedWeek + lastOrderDate
//
// Failures are per-customer (try/catch inside loop) — one bad phone
// number doesn't block the rest of the batch.
//
exports.processStandingOrders = functions.pubsub
  .schedule('0 9 * * 4')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentWeek = getISOWeek(now);

    // Load settings to check for blocked date ranges
    const settingsSnap = await db.collection('orders').doc('_settings_').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const blockedRanges = settings.microBlockedRanges || [];
    const isBlocked = blockedRanges.some(r => today >= r.from && today <= (r.to || r.from));

    // Load all active standing orders
    const standingSnap = await db.collection('standingOrders')
      .where('status', '==', 'active')
      .get();

    if (standingSnap.empty) return null;

    const twilioClient = twilio(
      functions.config().twilio.account_sid,
      functions.config().twilio.auth_token
    );
    const TWILIO_FROM = functions.config().twilio.phone_number;

    for (const doc of standingSnap.docs) {
      const standing = doc.data();

      // Idempotency: skip if already processed this week
      if (standing.lastProcessedWeek === currentWeek) continue;

      const firstName = (standing.name || 'Friend').split(' ')[0];

      try {
        if (isBlocked) {
          await twilioClient.messages.create({
            body: `Hi ${firstName}! The Blessed Baker and Son is taking a short break this week — your standing order is paused. We'll be back next week!`,
            from: TWILIO_FROM,
            to: standing.phone,
          });
        } else {
          // Create the order document (onNewOrder will skip emails due to source flag)
          const orderRef = db.collection('orders').doc();
          await orderRef.set({
            name: standing.name || '',
            email: standing.email || '',
            phone: standing.phone || '',
            items: standing.items || '',
            total: standing.total || '',
            type: standing.orderType || 'micro-bakery',
            status: 'pending',
            notes: standing.notes || '',
            source: 'standing-order',
            standingOrderId: doc.id,
            createdAt: now.toISOString(),
          });

          await twilioClient.messages.create({
            body: `Hi ${firstName}! Your usual order from The Blessed Baker and Son is confirmed for Friday pickup. Reply SKIP to skip this week or STOP to cancel your standing order.`,
            from: TWILIO_FROM,
            to: standing.phone,
          });
        }

        await doc.ref.update({
          lastProcessedWeek: currentWeek,
          lastOrderDate: today,
        });
      } catch (err) {
        functions.logger.error('processStandingOrders: failed for standing order', {
          standingOrderId: doc.id,
          error: err.message,
        });
      }
    }

    return null;
  });

// ── TWILIO INBOUND WEBHOOK ───────────────────────────────────────
//
// Handles SMS replies from standing order customers.
//
// Request flow:
//
//   Twilio POST
//    └── validate X-Twilio-Signature ──INVALID──► 403
//        │ VALID
//        ▼
//   parse From (phone) + Body (keyword)
//    ├── SKIP
//    │    └── look up active standingOrder by phone
//    │         ├── not found ──────────────────► "no standing order" reply
//    │         └── found
//    │              └── find this-week pending order by standingOrderId
//    │                   ├── status='confirmed' ──► "already confirmed" reply
//    │                   ├── order exists ────────► delete order doc ──► "skipped" reply
//    │                   └── no order yet ────────► "skipped" reply
//    ├── STOP
//    │    └── look up active standingOrder by phone
//    │         ├── not found ──────────────────► "no standing order" reply
//    │         └── found ──► mark cancelled ──► "cancelled" reply
//    └── other ──► "did you mean SKIP or STOP?" reply
//
exports.twilioWebhook = functions.https.onRequest(async (req, res) => {
  // Validate Twilio request signature — rejects spoofed webhooks
  const authToken = functions.config().twilio.auth_token;
  const signature = req.headers['x-twilio-signature'] || '';
  const url = `https://${req.headers.host}${req.originalUrl}`;
  const isValid = twilio.validateRequest(authToken, signature, url, req.body);
  if (!isValid) {
    functions.logger.warn('twilioWebhook: invalid signature rejected', { url });
    res.status(403).send('Forbidden');
    return;
  }

  const from = req.body.From || '';
  const keyword = (req.body.Body || '').trim().toUpperCase();
  const db = admin.firestore();

  function twimlReply(text) {
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${text}</Message></Response>`);
  }

  // Resolve the standing order for this phone number
  const standingSnap = await db.collection('standingOrders')
    .where('phone', '==', from)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (keyword === 'SKIP') {
    if (standingSnap.empty) {
      twimlReply("We don't have an active standing order for your number. Questions? Email info@theblessedbakerandson.com");
      return;
    }
    const standingDoc = standingSnap.docs[0];

    // Find the most recent standing-order-created order for this customer.
    // Query by standingOrderId only (single-field index, no composite needed)
    // then filter in code — at most 1-2 docs at any time with idempotency in place.
    const ordersSnap = await db.collection('orders')
      .where('standingOrderId', '==', standingDoc.id)
      .get();

    const pending = ordersSnap.docs
      .filter(d => d.data().source === 'standing-order')
      .sort((a, b) => (b.data().createdAt || '').localeCompare(a.data().createdAt || ''));

    if (pending.length > 0) {
      const orderDoc = pending[0];
      if (orderDoc.data().status === 'confirmed') {
        // Ina already confirmed — can't silently delete
        twimlReply("Your order was already confirmed by the baker — please email info@theblessedbakerandson.com to make changes. 🎂");
        return;
      }
      await orderDoc.ref.delete();
    }

    await standingDoc.ref.update({ lastSkippedWeek: getISOWeek(new Date()) });
    twimlReply("Got it! We'll skip your order this week. See you next Friday! 🎂");
    return;
  }

  if (keyword === 'STOP') {
    if (standingSnap.empty) {
      twimlReply("We don't have an active standing order for your number. Questions? Email info@theblessedbakerandson.com");
      return;
    }
    await standingSnap.docs[0].ref.update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    });
    twimlReply("Your standing order has been cancelled. Thank you for being a customer — you can always place a one-time order at theblessedbakerandson.com! 🎂");
    return;
  }

  // Unknown keyword
  twimlReply("Hi! Reply SKIP to skip this week's order, or STOP to cancel your standing order. Questions? Email info@theblessedbakerandson.com");
});
