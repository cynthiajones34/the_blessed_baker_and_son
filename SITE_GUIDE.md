# The Blessed Baker and Son — Site Guide

**Website:** theblessedbakerandson.com  
**Hosting:** GitHub Pages (static site)  
**Database:** Firebase Firestore  
**Email:** Firebase Functions + SendGrid  
**Last Updated:** May 2026

---

## Table of Contents

1. [Business Operations](#1-business-operations)
2. [Admin Panel](#2-admin-panel)
3. [Customer Ordering Flows](#3-customer-ordering-flows)
4. [Email Automations](#4-email-automations)
5. [Menu & Pricing](#5-menu--pricing)
6. [Site Pages](#6-site-pages)
7. [Technical Setup](#7-technical-setup)
8. [Data Structure](#8-data-structure)

---

## 1. Business Operations

### How Orders Work

**Micro-Bakery Pickup**
- Menu drops Saturday. Orders close Sunday at noon. Pickup Friday.
- Cupcakes sold by the dozen only — no mixed dozens.
- Cake jars sold in minimums of 12 per flavor.
- Customer places order → saved to Firestore → admin and customer receive email automatically.

**Custom School Drop-Off**
- Serves schools managed in the admin panel (default: Lakeside High School cluster).
- Minimum 2-day lead time required.
- Delivery windows: 11:30 AM–12:30 PM or 2:30 PM–4:30 PM.
- Customer selects school, date, and window when ordering.

### Opening and Closing Orders

Go to **Admin Panel → Settings and Controls**.

- Toggle **"Orders Open"** on or off for each order type.
- Add a custom closed message that customers will see.
- Click **Save** — the change takes effect immediately for all customers across all devices.

You can also block specific date ranges (holidays, vacations) with optional custom messages.

### Payment

Final totals are confirmed by Ina before payment is collected. The site calculates an estimated total at order time; that figure is not final. Payment methods: Zelle, Venmo, cash.

### Allergen Notice

All products are made in a home kitchen that contains wheat, dairy, eggs, tree nuts, and soy. Customers can note allergies in the order notes field.

---

## 2. Admin Panel

**URL:** theblessedbakerandson.com/admin.html  
**Password:** Set in Settings panel (default: `blessed2005`)  
**Password storage:** Saved in your browser's local storage — stored per device.

### Dashboard

Shows at a glance:
- Total micro-bakery orders
- Pending drop-off orders
- Revenue from confirmed and paid orders
- Order status breakdown (pending / confirmed / paid / cancelled)

### Orders Panels

Separate panels for **Micro-Bakery Orders** and **Custom Drop-Off Orders**.

Each panel has:
- A filterable table (date, customer, location, product)
- Status badges — click to change an individual order's status
- Checkboxes for bulk status updates
- Repeat customer indicator (flagged by email)

**Order statuses:** `pending` → `confirmed` → `paid` → `cancelled`

> When you mark an order **Confirmed**, the customer automatically receives a confirmation email — no manual action needed.

### Calendar

Visual month-by-month calendar showing which days have orders. Click a date to see orders for that day.

### Reporting & Downloads

Filter orders by any combination of date, customer, location, product, and order type. Download results as a CSV file.

### Email Tab

Send branded emails to customers directly from the admin panel.

#### Recipient Filters
| Filter | Options |
|---|---|
| Audience | All Customers, Pickup Only, Drop-Off Only, Newsletter Subscribers |
| Order Status | All, Pending, Confirmed, Paid, Cancelled |
| School | All Schools or a specific school (drop-off only) |
| Date Range | From / To date pickers |

The recipient count updates live as you change filters. Duplicate emails are automatically removed.

#### Compose
- Enter a **subject line** and **message body**
- Live **preview panel** shows how the email will look in the branded template (logo, gold bar, cream background)

#### Send Options
- **Send Now** — email goes out immediately
- **Schedule** — pick a date and time; the system sends automatically (checks every 5 minutes)

#### Campaign History
Shows all sent and scheduled campaigns with recipient count and status. Scheduled campaigns can be cancelled before they send.

### Settings and Controls

#### Micro-Bakery Settings
| Setting | What It Does |
|---|---|
| Orders Open toggle | Opens or closes the micro-bakery order form for all customers |
| Closed message | Text customers see when orders are closed |
| Max cupcakes | Capacity limit displayed in the capacity bar |
| Max jars | Capacity limit displayed in the capacity bar |
| Blocked date ranges | Block specific dates with an optional custom message |

#### Drop-Off Settings
| Setting | What It Does |
|---|---|
| Drop-Off Orders Open toggle | Opens or closes the drop-off order form for all customers |
| Closed message | Text customers see when drop-off is closed |
| Blocked date ranges | Block specific dates with an optional custom message |

#### Drop-Off Schools
Manage which schools appear in the drop-off order form.
- Type a school name and click **Add School** to add it.
- Click ✕ next to a school to remove it.
- Changes take effect for all customers on next page load.

#### Menu Pricing
Update prices for all item tiers. Changes take effect for all customers on next page load.

| Field | Default | Applies To |
|---|---|---|
| Standard Cupcake — Full Dozen | $35 | Red Velvet, Key Lime, Vanilla, Strawberry |
| Premium Cupcake — Full Dozen | $40 | Oreo, Biscoff |
| Standard Cupcake — Half Dozen | $20 | Red Velvet, Key Lime, Vanilla, Strawberry |
| Premium Cupcake — Half Dozen | $23 | Oreo, Biscoff |
| 4 oz Cake Jar | $4 | All flavors |
| 8 oz Cake Jar | $8 | All flavors |
| Premium Jar Surcharge per 12 | $5 | Oreo, Biscoff jars |

#### Manual Order Entry
Add orders placed by phone or in person directly into the system.

#### Password
Change the admin password. Minimum 6 characters. Stored in your browser only.

---

## 3. Customer Ordering Flows

### Micro-Bakery Pickup (micro-bakery.html)

1. Page loads → checks Firestore for open/closed status and pricing
2. If open: availability dot is green, order form is active
3. If closed: dot turns red, custom message shown, form disabled
4. Customer selects items using +/− quantity buttons (cupcakes by dozen or half dozen, jars by 12)
5. Running order summary and total update automatically
6. Customer enters: first name, last name, email, phone, optional notes
7. On submit: order saved to Firestore → admin notification email sent → customer receives "order received" email
8. Customer sees confirmation screen

### Custom Drop-Off (custom-dropoff.html)

Same as above, plus:
- Customer selects school from dropdown (populated from admin settings)
- Customer picks delivery date (2-day minimum enforced)
- Customer picks delivery window (11:30 AM–12:30 PM or 2:30 PM–4:30 PM)
- Visible order summary panel shows selected items and running total
- School, date, and window are stored with the order

### Newsletter Sign-Up (homepage)

- Customer enters email in the "Get the Weekly Menu" section
- Saved to Firestore `subscribers` collection
- Customer receives a branded welcome email automatically
- Subscriber appears in admin Email tab under "Newsletter Subscribers"

---

## 4. Email Automations

All emails use a branded template: logo on cream background, gold divider bar, white body.

### Automatic Emails

| Trigger | Recipient | Subject |
|---|---|---|
| New order placed (pickup) | Admin | "New Pickup Order — [Customer Name]" |
| New order placed (pickup) | Customer | "We received your order request!" |
| New order placed (drop-off) | Admin | "New Custom Drop-Off Order — [Customer Name]" |
| New order placed (drop-off) | Customer | "We received your order request!" |
| Order status → Confirmed | Customer | "Your order is confirmed! 🎉" |
| Newsletter sign-up | Customer | "You're subscribed to The Blessed Baker and Son!" |

### Admin-Initiated Emails (Email Tab)

Send custom emails to any segment of your audience — customers by order type/status/school, newsletter subscribers, or all contacts. Supports immediate send or scheduled delivery.

### Email Provider

- **SendGrid** — free tier (100 emails/day)
- **From address:** info@theblessedbakerandson.com
- **Domain authenticated** via CNAME records in GoDaddy DNS

---

## 5. Menu & Pricing

Prices are managed in **Admin Panel → Settings and Controls → Menu Pricing** and stored in Firestore. The values below are the defaults.

### Cupcakes

| Flavor | Per Dozen | Per Half Dozen |
|---|---|---|
| Red Velvet | $35 | $20 |
| Key Lime | $35 | $20 |
| Vanilla | $35 | $20 |
| Strawberry | $35 | $20 |
| Oreo Cookies N' Cream | $40 | $23 |
| Biscoff Cookie Butter | $40 | $23 |

No mixed dozens. One flavor per order unit.

### Cake Jars

| Flavor | 4 oz | 8 oz |
|---|---|---|
| Red Velvet | $4 | $8 |
| Key Lime | $4 | $8 |
| Vanilla | $4 | $8 |
| Strawberry | $4 | $8 |
| Oreo Cookies N' Cream | $4 + $5/12 | $8 + $5/12 |
| Biscoff Cookie Butter | $4 + $5/12 | $8 + $5/12 |

Minimum 12 jars per flavor. Premium flavors (Oreo, Biscoff) add $5 per set of 12.

---

## 6. Site Pages

| Page | URL | Purpose |
|---|---|---|
| Homepage | / | Brand intro, menu overview, newsletter signup, order entry points |
| Micro-Bakery Orders | /micro-bakery.html | Customer pickup ordering |
| Custom Drop-Off Orders | /custom-dropoff.html | Customer school drop-off ordering |
| Contact | /contact.html | General inquiries form |
| FAQ | /faq.html | Common questions about ordering, payment, allergies |
| Terms | /terms.html | Terms of service, cancellation policy, allergen notice |
| Admin | /admin.html | Password-protected order and settings management |

---

## 7. Technical Setup

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Plain HTML, CSS, JavaScript — no frameworks |
| Database | Firebase Firestore (compat SDK v10.12.0) |
| Backend | Firebase Functions (Node.js 22, Gen 1) |
| Email delivery | SendGrid (free tier, 100/day) |
| Hosting | GitHub Pages |
| Domain | GoDaddy DNS → GitHub Pages |
| Fonts | Google Fonts — Playfair Display, DM Sans, Pinyon Script |

### Firebase Project

| Field | Value |
|---|---|
| Project ID | the-blessed-baker-and-son |
| Plan | Blaze (pay-as-you-go) |
| Auth Domain | the-blessed-baker-and-son.firebaseapp.com |
| Storage Bucket | the-blessed-baker-and-son.firebasestorage.app |

### Firebase Functions

| Function | Trigger | Purpose |
|---|---|---|
| `onNewOrder` | Firestore: new `orders/{id}` doc | Emails admin + customer on new order |
| `onOrderConfirmed` | Firestore: `orders/{id}` status → confirmed | Emails customer confirmation |
| `onNewSubscriber` | Firestore: new `subscribers/{id}` doc | Emails customer welcome email |
| `onCampaignCreated` | Firestore: new `emailCampaigns/{id}` doc | Sends immediate email campaigns |
| `processScheduledCampaigns` | Pub/Sub: every 5 minutes | Sends scheduled campaigns when due |

### Firebase Config (stored via `functions:config`)

| Key | Purpose |
|---|---|
| `sendgrid.key` | SendGrid API key for email delivery |

### SendGrid

- **Account:** info@theblessedbakerandson.com  
- **Domain authentication:** configured via CNAME records in GoDaddy  
- **Sender:** Verified single sender + domain authenticated  

### Formspree Endpoints

| Page | Purpose |
|---|---|
| micro-bakery.html | Order form submission (backup admin notification) |
| custom-dropoff.html | Order form submission (backup admin notification) |
| contact.html | Contact page inquiries |

### GitHub Repository

`cynthiajones34/the_blessed_baker_and_son`

To deploy: commit and push to `main`. GitHub Pages serves the updated site automatically within a minute or two. Firebase Functions are deployed separately via `firebase deploy --only functions`.

### Firestore Security Rules

```
orders/*       — read/write: public (order forms + admin panel)
subscribers/*  — create: public, read: public, update/delete: blocked
emailCampaigns/* — read/write: public (admin panel)
```

---

## 8. Data Structure

### Firestore Collections

#### `orders` — Customer Orders

```
{
  type:           "micro-bakery" | "custom-dropoff",
  name:           String,
  email:          String,
  phone:          String,
  items:          String,        // semicolon-separated item list
  total:          String,        // e.g. "$75 (estimated)"
  notes:          String,
  status:         "pending" | "confirmed" | "paid" | "cancelled",
  createdAt:      Timestamp,
  school:         String,        // custom-dropoff only
  deliveryDate:   String,        // custom-dropoff only (YYYY-MM-DD)
  deliveryWindow: String         // custom-dropoff only
}
```

#### `orders/_settings_` — Store Settings

A reserved document (ID: `_settings_`) inside the `orders` collection. Written by the admin panel, read by customer-facing pages.

```
{
  microOpen:            Boolean,
  pickupOpen:           Boolean,
  microClosedMsg:       String,
  cupcakeMax:           Number,
  cupcakeOrdered:       Number,
  jarMax:               Number,
  jarOrdered:           Number,
  dropoffOpen:          Boolean,
  dropoffClosedMsg:     String,
  microBlockedRanges:   Array,   // [{from, to, message?}]
  dropoffBlockedRanges: Array,   // [{from, to, message?}]
  schools:              Array,   // ["Briarlake", "Evansdale", ...]
  pricing: {
    cupcakeDoz:         Number,  // default: 35
    cupcakeDozPremium:  Number,  // default: 40
    cupcakeHalf:        Number,  // default: 20
    cupcakeHalfPremium: Number,  // default: 23
    jar4oz:             Number,  // default: 4
    jar8oz:             Number,  // default: 8
    jarPremium:         Number   // default: 5
  }
}
```

Blocked range format: `{ from: "2026-07-04", to: "2026-07-06", message: "July 4th holiday" }`

#### `subscribers` — Newsletter Subscribers

Created when a customer signs up via the homepage newsletter form.

```
{
  email:          String,
  source:         "newsletter",
  subscribedAt:   Timestamp
}
```

#### `emailCampaigns` — Admin Email Campaigns

Created by the admin Email tab when sending or scheduling a campaign.

```
{
  subject:        String,
  body:           String,
  recipients:     Array,         // [{email, name}]
  recipientCount: Number,
  scheduledFor:   String | null, // ISO timestamp or null for immediate
  status:         "pending" | "scheduled" | "sent" | "cancelled",
  createdAt:      Timestamp,
  sentAt:         String,        // ISO timestamp, set when sent
  sentCount:      Number         // set when sent
}
```
