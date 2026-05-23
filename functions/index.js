const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// MS365 SMTP transporter — credentials set via Firebase config
// firebase functions:config:set mail.user="..." mail.pass="..."
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: functions.config().mail.user,
    pass: functions.config().mail.pass
  },
  tls: { ciphers: 'SSLv3' }
});

const ADMIN_EMAIL = functions.config().mail.user;
const FROM = `"The Blessed Baker and Son" <${ADMIN_EMAIL}>`;

// ── NEW ORDER → email admin + customer ──────────────────────────
exports.onNewOrder = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    if (!order || order.type === undefined) return null;  // skip _settings_

    const isPickup = order.type === 'micro-bakery';
    const typeLabel = isPickup ? 'Pickup' : 'Custom Drop-Off';
    const customerName = order.name || 'Customer';
    const customerEmail = order.email;

    // Email to admin
    await transporter.sendMail({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `New ${typeLabel} Order — ${customerName}`,
      text: [
        `New ${typeLabel} order received.`,
        '',
        `Name:  ${order.name || '—'}`,
        `Email: ${order.email || '—'}`,
        `Phone: ${order.phone || '—'}`,
        `Items: ${order.items || '—'}`,
        `Total: ${order.total || '—'}`,
        order.school ? `School: ${order.school}` : '',
        order.deliveryDate ? `Delivery Date: ${order.deliveryDate}` : '',
        order.deliveryWindow ? `Delivery Window: ${order.deliveryWindow}` : '',
        order.notes ? `Notes: ${order.notes}` : '',
        '',
        'Log in to the admin panel to review and confirm this order.',
      ].filter(Boolean).join('\n')
    });

    // Email to customer
    if (!customerEmail) return null;
    await transporter.sendMail({
      from: FROM,
      to: customerEmail,
      subject: 'We received your order request!',
      text: [
        `Hi ${customerName.split(' ')[0]},`,
        '',
        'Thank you for placing an order with The Blessed Baker and Son! We have received your request and will review it shortly.',
        '',
        'Order summary:',
        order.items || '—',
        `Estimated total: ${order.total || '—'}`,
        '',
        'We will send you a confirmation email once your order is reviewed. In the meantime, feel free to reach out at info@theblessedbakerandson.com with any questions.',
        '',
        '— The Blessed Baker and Son',
      ].join('\n')
    });

    return null;
  });

// ── STATUS → CONFIRMED → email customer ─────────────────────────
exports.onOrderConfirmed = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only act when status changes to 'confirmed'
    if (before.status === after.status || after.status !== 'confirmed') return null;

    const customerEmail = after.email;
    if (!customerEmail) return null;

    const customerName = after.name || 'Customer';

    await transporter.sendMail({
      from: FROM,
      to: customerEmail,
      subject: 'Your order is confirmed!',
      text: [
        `Hi ${customerName.split(' ')[0]},`,
        '',
        'Great news — your order has been confirmed and is now in our baking queue!',
        '',
        'Order details:',
        after.items || '—',
        `Estimated total: ${after.total || '—'}`,
        '',
        'We will be in touch if we have any questions. Thank you for ordering with The Blessed Baker and Son!',
        '',
        '— The Blessed Baker and Son',
        'info@theblessedbakerandson.com',
      ].join('\n')
    });

    return null;
  });
