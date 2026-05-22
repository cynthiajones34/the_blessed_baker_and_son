# The Blessed Baker and Son — Site Guide

**Website:** theblessedbakerandson.com  
**Hosting:** GitHub Pages (static site)  
**Database:** Firebase Firestore  
**Last Updated:** May 2026

---

## Table of Contents

1. [Business Operations](#1-business-operations)
2. [Admin Panel](#2-admin-panel)
3. [Customer Ordering Flows](#3-customer-ordering-flows)
4. [Menu & Pricing](#4-menu--pricing)
5. [Site Pages](#5-site-pages)
6. [Technical Setup](#6-technical-setup)
7. [Data Structure](#7-data-structure)

---

## 1. Business Operations

### How Orders Work

**Micro-Bakery Pickup**
- Menu drops Saturday. Orders close Sunday at noon. Pickup Friday.
- Cupcakes sold by the dozen only — no mixed dozens.
- Cake jars sold in minimums of 12 per flavor.
- Customer places order on the site → email arrives via Formspree → order appears in admin panel.

**Custom School Drop-Off**
- Serves the Lakeside High School cluster: Briarlake, Evansdale, Hawthorne, Henderson, Henderson Mill, Johnson's Learning Center, Lakeside, Oak Grove, Pleasantdale, Sagamore Hills.
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

Final totals are confirmed by Ina before payment is collected. The site calculates an estimated total at order time; that figure is not final.

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

Use the filter bar to narrow by date range, customer name, school, or product.

### Orders Panels

Separate panels for **Micro-Bakery Orders** and **Custom Drop-Off Orders**.

Each panel has:
- A filterable table (date, customer, location, product)
- Status badges — click to change an individual order's status
- Checkboxes for bulk status updates
- Repeat customer indicator (flagged by email)

**Order statuses:** `pending` → `confirmed` → `paid` → `cancelled`

### Calendar

Visual month-by-month calendar showing which days have orders. Click a date to see orders for that day.

### Reporting & Downloads

Filter orders by any combination of date, customer, location, product, and order type. Download results as a CSV file.

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

#### Blocked Date Ranges
Add a From date, To date (or same date for single day), and an optional message. The customer sees the message instead of the standard closed message on those dates.

#### Manual Order Entry
Add orders placed by phone or in person directly into the system. Supports both micro-bakery and drop-off order types.

#### Password
Change the admin password. Minimum 6 characters. Stored in your browser only — if you clear browser data, use the new password you set, or change it again.

---

## 3. Customer Ordering Flows

### Micro-Bakery Pickup (micro-bakery.html)

1. Page loads → checks Firestore for open/closed status and blocked dates
2. If open: availability dot is green, order form is active
3. If closed: dot turns red, custom message shown, form disabled
4. Customer selects items using +/- quantity buttons (cupcakes by dozen, jars by 12)
5. Running total updates automatically
6. Customer enters: first name, last name, email, phone, optional notes
7. On submit: order saved to Firestore + confirmation email sent via Formspree
8. Customer sees confirmation screen

### Custom Drop-Off (custom-dropoff.html)

Same as above, plus:
- Customer selects school from dropdown (required)
- Customer picks delivery date (2-day minimum enforced)
- Customer picks delivery window (11:30 AM–12:30 PM or 2:30 PM–4:30 PM)
- School, date, and window are stored with the order

---

## 4. Menu & Pricing

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

## 5. Site Pages

| Page | URL | Purpose |
|---|---|---|
| Homepage | / | Brand introduction, menu overview, order entry points |
| Micro-Bakery Orders | /micro-bakery.html | Customer pickup ordering |
| Custom Drop-Off Orders | /custom-dropoff.html | Customer school drop-off ordering |
| Contact | /contact.html | General inquiries form |
| FAQ | /faq.html | Common questions about ordering, payment, allergies |
| Terms | /terms.html | Terms of service, cancellation policy, allergen notice |
| Admin | /admin.html | Password-protected order and settings management |

---

## 6. Technical Setup

### Tech Stack

- **Frontend:** Plain HTML, CSS, JavaScript — no frameworks
- **Database:** Firebase Firestore (compat SDK v10.12.0)
- **Email handling:** Formspree
- **Fonts:** Google Fonts — Playfair Display, DM Sans, Pinyon Script
- **Hosting:** GitHub Pages
- **Domain:** Custom domain via CNAME → theblessedbakerandson.com

### Firebase Project

| Field | Value |
|---|---|
| Project ID | the-blessed-baker-and-son |
| Auth Domain | the-blessed-baker-and-son.firebaseapp.com |
| Storage Bucket | the-blessed-baker-and-son.firebasestorage.app |

### Formspree Endpoints

| Page | Endpoint |
|---|---|
| micro-bakery.html | (configured in form action) |
| custom-dropoff.html | (configured in form action) |
| contact.html | f/xdajgjdz |

### GitHub Repository

`cynthiajones34/the_blessed_baker_and_son`

To deploy: commit and push to `main`. GitHub Pages serves the updated site automatically within a minute or two.

---

## 7. Data Structure

### Firestore Collections

Only one collection is used: **`orders`**

#### Customer Order Documents

Created automatically when a customer submits an order.

```
{
  type:           "micro-bakery" | "custom-dropoff",
  name:           String,
  email:          String,
  phone:          String,
  items:          String,        // comma-separated item list
  total:          String,        // e.g. "$75"
  notes:          String,
  status:         "pending" | "confirmed" | "paid" | "cancelled",
  createdAt:      Timestamp,
  school:         String,        // custom-dropoff only
  deliveryDate:   String,        // custom-dropoff only (YYYY-MM-DD)
  deliveryWindow: String         // custom-dropoff only
}
```

#### `_settings_` Document

A reserved document (ID: `_settings_`) inside the `orders` collection. Written by the admin panel and read by customer-facing pages to control open/closed status.

```
{
  microOpen:            Boolean,   // true = orders open
  pickupOpen:           Boolean,   // mirrors microOpen
  microClosedMsg:       String,
  cupcakeMax:           Number,
  cupcakeOrdered:       Number,
  jarMax:               Number,
  jarOrdered:           Number,
  dropoffOpen:          Boolean,
  dropoffClosedMsg:     String,
  microBlockedRanges:   Array,     // [{from, to, message?}]
  dropoffBlockedRanges: Array      // [{from, to, message?}]
}
```

Blocked range format:
```
{ from: "2026-07-04", to: "2026-07-06", message: "July 4th holiday" }
```
Use the same date for `from` and `to` to block a single day.
