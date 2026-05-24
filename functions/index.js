const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

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
          <td style="background:#3B1F0E;padding:32px 40px;text-align:center;border-radius:6px 6px 0 0;">
            <img src="https://theblessedbakerandson.com/logo.png" alt="The Blessed Baker and Son" width="160" style="display:block;margin:0 auto;width:160px;height:auto;" />
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
