# The Blessed Baker and Son — Site Guide

**Website:** theblessedbakerandson.com  
**Hosting:** Firebase Hosting  
**Database:** Firebase Firestore  
**Email:** Firebase Functions + SendGrid  
**Location:** Tucker, GA  
**Contact:** info@theblessedbakerandson.com  
**Last Updated:** June 2026

---

## Table of Contents

1. [Business Operations](#1-business-operations)
2. [Admin Panel](#2-admin-panel)
3. [Customer Ordering Flows](#3-customer-ordering-flows)
4. [Email Automations](#4-email-automations)
5. [Menu & Pricing](#5-menu--pricing)
6. [Site Pages](#6-site-pages)
7. [SEO & Accessibility](#7-seo--accessibility)
8. [Technical Setup](#8-technical-setup)
9. [Data Structure](#9-data-structure)

---

## 1. Business Operations

### How Orders Work

**Micro-Bakery Pickup**
- Menu drops Saturday. Orders close Sunday at noon. Pickup Friday.
- Cupcakes sold by the dozen or half dozen — no mixed dozens.
- Cake jars sold in minimums of 12 per flavor, in increments of 12.
- Customer places order → saved to Firestore → admin and customer receive email automatically.

**Custom School Drop-Off**
- Serves schools managed in the admin panel (default: Lakeside High School cluster).
- Minimum 2-day lead time required (enforced by the date picker).
- Delivery windows: 11:30 AM–12:30 PM or 2:30 PM–4:30 PM.
- Customer selects school, date, and window when ordering.

### Opening and Closing Orders

Go to **Admin Panel → Settings and Controls**.

- Toggle **"Orders Open"** on or off for each order type.
- Add a custom closed message that customers will see.
- Click **Save** — the change takes effect immediately for all customers across all devices.

You can also block specific date ranges (holidays, vacations) with optional custom messages per range.

### Payment

Final totals are confirmed by Ina before payment is collected. The site calculates an estimated total at order time; that figure is not final. Payment methods: Zelle, Venmo, cash.

### Allergen Notice

All products are made in a home kitchen that contains wheat, dairy, eggs, tree nuts, and soy. Customers can note allergies in the order notes field.

---

## 2. Admin Panel

**URL:** theblessedbakerandson.com/admin.html  
**Password:** Set in Settings panel (default: `blessed2005`)  
**Password storage:** Saved in browser localStorage (`bb_admin_pw`) — stored per device.

### Dashboard

Shows at a glance:
- Total micro-bakery orders, pending drop-off orders, revenue from confirmed/paid orders
- Order status breakdown (pending / confirmed / paid / cancelled)
- **Weekly Summary** — lists upcoming 7 days of orders with name, type, date, total, and status badge

### Orders Panels

Separate panels for **Micro-Bakery Orders** and **Custom Drop-Off Orders**.

Each panel has:
- A filterable table (date range, customer name, school, product type)
- Status badges — click action buttons to change individual order status (`pending → confirmed → paid → cancelled`)
- **Repeat customer indicator** — 🔁 icon appears next to any customer whose email appears in more than one order
- **Checkboxes** for bulk status updates — select any combination, choose a status, apply to all selected
- Print buttons — print a single prep ticket or all tickets for a specific date

### Calendar

Visual month-by-month grid showing which days have orders. Click any date to see a list of all orders for that day.

### Reporting & Downloads

Filter orders by any combination of date range, customer name, school, product type, and order status. Export results as:
- **CSV** — 10 columns: Order ID, Type, Customer, Email, Phone, Items, Total, Delivery Date, School, Status. Filename: `blessed-bakery-orders-YYYY-MM-DD.csv`
- **PDF** — printable formatted table

### Email Tab

Send branded emails to customers directly from the admin panel.

#### Recipient Filters
| Filter | Options |
|---|---|
| Audience | All Customers, Pickup Only, Drop-Off Only, Newsletter Subscribers |
| Order Status | All, Pending, Confirmed, Paid, Cancelled |
| School | All Schools or a specific school (drop-off only) |
| Date Range | From / To date pickers |

The recipient count updates live as you change filters. Duplicate emails are automatically removed across order customers and newsletter subscribers.

#### Compose
- Enter a **subject line** and **message body**
- Live **preview panel** on the right renders the email in the branded template as you type (logo, gold bar, cream background)

#### Send Options
- **Send Now** — email goes out immediately
- **Schedule** — pick a date and time; the system sends automatically (checks every 5 minutes)

#### Campaign History
Shows all sent and scheduled campaigns with subject, recipient count, date, and status. Scheduled campaigns can be cancelled before they send.

### Settings and Controls

#### Micro-Bakery Settings
| Setting | What It Does |
|---|---|
| Orders Open toggle | Opens or closes the micro-bakery order form for all customers |
| Closed message | Text customers see when orders are closed |
| Max cupcakes (dozens) | Sets capacity limit; capacity bar turns orange at ≥80% |
| Max jars | Sets capacity limit; capacity bar turns orange at ≥80% |
| Blocked date ranges | Block specific dates with optional per-range custom message |

**Capacity bars** show current capacity used vs. maximum. When a session reaches 80% or more, the bar changes color. Displays remaining quantity (e.g., "15 dozen remaining").

#### Drop-Off Settings
| Setting | What It Does |
|---|---|
| Drop-Off Orders Open toggle | Opens or closes the drop-off order form for all customers |
| Closed message | Text customers see when drop-off is closed |
| Blocked date ranges | Block specific dates with optional per-range custom message |

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
Add orders placed by phone or in person directly into the system. Supports both micro-bakery and drop-off order types with full field set (name, email, phone, items, school, delivery date, window, notes).

#### Password
Change the admin password. Minimum 6 characters. Stored in browser localStorage only — clearing browser data resets to the last saved password.

---

## 3. Customer Ordering Flows

### Micro-Bakery Pickup (micro-bakery.html)

1. Page loads → reads Firestore `_settings_` for open/closed status, blocked dates, and current pricing
2. If open: availability dot is green, order form is active
3. If closed or date blocked: dot turns red, custom message shown, form is disabled
4. Customer selects items using +/− buttons:
   - Cupcakes: in dozens or half dozens per flavor
   - Cake jars: in increments of 12 per flavor
   - Premium flavors (Oreo, Biscoff) add a surcharge per set of 12
5. Running **order summary panel** updates live — shows each line item with quantity and price, plus running total
6. Customer fills in: first name, last name, email, phone, optional notes
7. On submit → order saved to Firestore → admin notification email sent → customer receives "order received" email
8. Customer sees confirmation screen

### Custom Drop-Off (custom-dropoff.html)

Same item selection and summary as pickup, plus:
- Customer selects **school** from dropdown (populated dynamically from admin settings)
- Customer picks **delivery date** (minimum 2 business days from today, enforced by date picker)
- Customer picks **delivery window** (11:30 AM–12:30 PM or 2:30 PM–4:30 PM)
- Visible order summary panel shows selected items and running total before submission
- School, date, and window are stored with the order in Firestore

### Newsletter Sign-Up (homepage)

- Customer enters email in the "Get the Weekly Menu" section on the homepage
- Saved to Firestore `subscribers` collection
- Customer receives a branded welcome email automatically
- Subscriber appears in admin Email tab under "Newsletter Subscribers"

### Contact Form (contact.html)

Fields: first name, last name, email, phone (optional), subject, message.  
Submits to Formspree → displays confirmation screen. Also recognizes `?sent=1` URL parameter to show confirmation on direct link.

---

## 4. Email Automations

All emails use a branded template: bakery logo on cream background, gold divider bar, white body, footer with contact info.

### Automatic Emails

| Trigger | Recipient | Subject |
|---|---|---|
| New pickup order placed | Admin | "New Pickup Order — [Customer Name]" |
| New pickup order placed | Customer | "We received your order request!" |
| New drop-off order placed | Admin | "New Custom Drop-Off Order — [Customer Name]" |
| New drop-off order placed | Customer | "We received your order request!" |
| Order status set to Confirmed | Customer | "Your order is confirmed! 🎉" |
| Newsletter sign-up | Customer | "You're subscribed to The Blessed Baker and Son!" |

### Admin-Initiated Emails (Email Tab)

Send custom emails to any segment — customers filtered by order type, status, school, date range, newsletter subscribers, or all contacts combined. Supports immediate send or future scheduled delivery.

### Email Provider

- **SendGrid** — free tier (100 emails/day)
- **From address:** info@theblessedbakerandson.com
- **Domain authenticated** via CNAME records in GoDaddy DNS (eliminates spam risk)

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

Minimum 12 jars per flavor, ordered in multiples of 12. Premium flavors (Oreo, Biscoff) add $5 per set of 12.

---

## 6. Site Pages

| Page | URL | Purpose |
|---|---|---|
| Homepage | / | Brand intro, how it works, menu overview, schools info, story, newsletter signup, order entry points |
| Micro-Bakery Orders | /micro-bakery.html | Customer pickup ordering with live order summary |
| Custom Drop-Off Orders | /custom-dropoff.html | Customer school drop-off ordering with live order summary |
| Contact | /contact.html | 6-field inquiry form (submits via Formspree) |
| FAQ | /faq.html | 10 accordion-style Q&As covering ordering, schools, payment, allergies, cancellations |
| Terms | /terms.html | Terms of service, cancellation policy, allergen notice |
| Admin | /admin.html | Password-protected order and settings management (excluded from search indexing) |
| Sitemap | /sitemap.xml | XML sitemap submitted to Google Search Console |
| Robots | /robots.txt | Crawl rules — allows all public pages, blocks /admin.html |

### Homepage Sections (in order)
1. **Hero** — brand name, tagline, CTA buttons, decorative logo
2. **Intro Band** — brand statement quote
3. **How It Works** — 3-step ordering process
4. **Menu** — price list overview with item categories
5. **Order Types** — two cards: Pickup vs. Drop-Off with links
6. **Schools** — Lakeside High School cluster listing with school chips
7. **Story** — brand story with 4 feature cards (faith, frosting, model, community)
8. **Newsletter** — email sign-up for weekly menu announcements
9. **Footer** — navigation links and copyright

### FAQ Topics
1. How do I place a pick-up order?
2. How do I place a school drop-off order?
3. What is the minimum order for cake jars?
4. Do you offer custom flavors or themes?
5. How far in advance should I order?
6. What schools do you deliver to?
7. What payment methods do you accept?
8. Can I cancel or modify my order?
9. Do you accommodate allergies?
10. How do I contact you?

### Shared Elements (all pages)
- **Favicon** — cupcake emoji 🧁
- **Footer** — location (Tucker, GA), email (info@theblessedbakerandson.com), navigation links, "© 2026 The Blessed Baker and Son | Designed by The Builders' Ops Studio"
- **Color palette** — 9 CSS custom properties: cream, blush, rose, terracotta, berry, chocolate, gold, white, muted
- **Fonts** — Playfair Display (headings), DM Sans (body), Pinyon Script (script accents)
- **Mobile nav** — hamburger menu on homepage (≤768px); sub-pages use a "← Back" link

---

## 7. SEO & Accessibility

### SEO Implementation

All public pages include:
- Unique `<title>` tags with business name, location (Tucker, GA), and primary keyword
- `<meta name="description">` — unique per page, 150–160 characters
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical">` pointing to the absolute URL
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`)
- Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)

**Structured Data (JSON-LD)**
- `index.html` — `@type: "Bakery"` (LocalBusiness subtype) with name, URL, email, Tucker GA address, and DeKalb County service area
- `faq.html` — `@type: "FAQPage"` with all 10 Question/Answer pairs for Google rich snippets

**Sitemap & Crawling**
- `sitemap.xml` — lists all 6 public pages with `<changefreq>` and `<priority>`
- `robots.txt` — allows all crawlers, blocks `/admin.html`, references sitemap
- Submitted to Google Search Console (verified June 2026)

**Performance**
- Firebase scripts moved from `<head>` to end of `<body>` on all pages that use Firestore — eliminates render-blocking

### Accessibility

- All image `alt` attributes are descriptive (no generic "Logo" text)
- All form inputs have associated `<label>` elements with `for`/`id` matching
- Newsletter email input uses a visually-hidden `<label>` (`.visually-hidden` CSS class)
- FAQ accordion buttons use `aria-expanded` (updated on open/close)
- Hamburger menu button uses `aria-expanded`, `aria-label`, and `aria-controls`
- `<html lang="en">` on all pages
- One `<h1>` per page

### Google Search Console

- **Property:** theblessedbakerandson.com
- **Verified:** June 2026 (HTML meta tag method)
- **Sitemap submitted:** sitemap.xml

---

## 8. Technical Setup

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Plain HTML, CSS, JavaScript — no frameworks |
| Database | Firebase Firestore (compat SDK v10.12.0) |
| Backend | Firebase Functions (Node.js 22, Gen 1) |
| Email delivery | SendGrid (free tier, 100/day) |
| Hosting | Firebase Hosting |
| Domain | GoDaddy DNS → Firebase Hosting |
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

### Firebase Config

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
| micro-bakery.html | Order form backup notification |
| custom-dropoff.html | Order form backup notification |
| contact.html | Contact page inquiries |

### GitHub Repository

`cynthiajones34/the_blessed_baker_and_son`

**Deploy site changes (HTML/CSS/JS):**
```
git add . && git commit -m "your message" && git push origin main
firebase deploy --only hosting
```

**Deploy function changes:**
```
firebase --project the-blessed-baker-and-son deploy --only functions --force
```

**Deploy Firestore rules:**
```
firebase --project the-blessed-baker-and-son deploy --only firestore:rules
```

Note: Pushing to GitHub alone does NOT update the live site — Firebase deploy is required.

### Firestore Security Rules

| Collection | Read | Write |
|---|---|---|
| `orders/*` | Public | Public (order forms + admin panel) |
| `subscribers/*` | Public | Create only (sign-up form); no update/delete |
| `emailCampaigns/*` | Public | Public (admin panel) |

---

## 9. Data Structure

### `orders` Collection — Customer Orders

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

### `orders/_settings_` — Store Settings

Reserved document (ID: `_settings_`) inside the `orders` collection. Written by the admin panel, read by customer-facing pages on every load.

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
Use the same date for `from` and `to` to block a single day.

### `subscribers` Collection — Newsletter Subscribers

```
{
  email:          String,
  source:         "newsletter",
  subscribedAt:   Timestamp
}
```

### `emailCampaigns` Collection — Admin Email Campaigns

```
{
  subject:        String,
  body:           String,
  recipients:     Array,         // [{email, name}]
  recipientCount: Number,
  scheduledFor:   String | null, // ISO timestamp or null for immediate
  status:         "pending" | "scheduled" | "sent" | "cancelled",
  createdAt:      Timestamp,
  sentAt:         String,        // set when sent
  sentCount:      Number         // set when sent
}
```
