# Medical Books & Journals — WhatsApp Agent System

A complete WhatsApp-native pipeline for your business: customers order
through chat, pay via UPI QR code, orders auto-hand off to your dispatch
team only once payment is confirmed, invoices are generated and sent
automatically, tracking flows back to the customer, delivery feedback is
collected on its own, low stock triggers a real-time alert, and you get
daily sales + pending-dispatch reports — all over WhatsApp.

## The six agents

| Agent | Talks to | What it does |
|---|---|---|
| **Sales Agent** | Customers | Answers product questions, checks stock/price, confirms orders, triggers payment |
| **Payments** | Customers | Sends a UPI QR code per order; once the owner verifies payment, sends the PDF invoice automatically |
| **Inventory AI** | Owner | Watches stock on every order and sends a real-time low-stock alert the moment an item crosses your threshold — independent of the daily reports |
| **Dispatch handoff & Logistics** | Dispatch team | Notified only after payment is confirmed; team replies with courier + tracking info, which is relayed to the customer automatically |
| **Feedback Agent** | Customers | Checks in automatically N hours after dispatch, asks if the order arrived and how it went, records the result |
| **Reports Agent** | Owner + dispatch team | Sends a daily sales report (based on confirmed payments) and a pending-dispatch report on a schedule, or on demand |

Everything runs through **one WhatsApp Business number**. The system tells
messages apart by *who's writing*: your dispatch team's numbers, the
owner's number(s), and everyone else (customers) — configured in
`data/contacts.json`.

## How a typical order flows
1. Customer messages the WhatsApp number → **Sales Agent** answers questions,
   confirms items/price, creates the order (stock is reserved immediately).
2. **A UPI QR code is sent to the customer automatically** for the order total.
3. Customer pays and (optionally) tells the bot — the bot pings the owner to
   verify, but does **not** confirm the order itself; only a human can.
4. **Owner checks their UPI/bank app**, then replies `paid ORD1720262626`.
   This automatically:
   - Generates a PDF invoice and sends it to the customer
   - Notifies the dispatch team with the order details
5. Dispatch team packs & ships, then replies:
   `track ORD1720262626 Bluedart 71234567890`
   → the system blocks this if the order isn't marked paid yet, and
   otherwise **automatically messages the customer** their tracking info.
6. After `FEEDBACK_DELAY_HOURS` (default 48h), the **Feedback Agent**
   messages the customer: *"Have you received it, how was everything?"* —
   has a natural back-and-forth, and logs whether it arrived + satisfaction.
7. Every evening at `DAILY_REPORT_TIME`, the **owner** gets a sales report
   (based on confirmed payments) and the **dispatch team** gets a
   pending-dispatch list — both also available on demand.
8. **Any time stock crosses `LOW_STOCK_THRESHOLD`** for an item, the owner
   gets an immediate WhatsApp alert — independent of the evening report.

## What you need before deploying
1. **Meta Developer account** → https://developers.facebook.com
   - Create an App → add "WhatsApp" product → get a **Phone Number ID** and
     access token (temporary for testing; generate a permanent one via a
     System User for production).
2. **Anthropic API key** → https://console.anthropic.com
3. **Your UPI ID** (VPA) to receive payments, e.g. `yourbusiness@okhdfcbank`
4. **Hosting** with a public HTTPS URL (Render, Railway, Fly.io, your own
   VPS) so Meta can reach the webhook. For local testing, use `ngrok http 3000`.

## Setup
```bash
npm install
cp .env.example .env
# fill in .env with your real tokens, UPI VPA, and business details
```

Edit `data/contacts.json` with your real numbers (international format, no
`+` or spaces), e.g.:
```json
{
  "owner": ["919812345678"],
  "dispatch_team": ["919898765432"]
}
```

Then:
```bash
npm start
```

## Connecting the webhook (Meta side)
1. Get your public HTTPS URL (from hosting or ngrok).
2. Meta App Dashboard → WhatsApp → Configuration:
   - **Callback URL**: `https://your-app-url/webhook`
   - **Verify token**: same value as `WHATSAPP_VERIFY_TOKEN` in `.env`
3. Subscribe to the `messages` webhook field.
4. Message your WhatsApp test number to confirm it replies.

## Dispatch team commands (sent as plain WhatsApp messages)
- `track <orderId> <courier> <awb_number>` — mark a **paid** order dispatched
  and notify the customer with tracking info (blocked if payment isn't
  confirmed yet)
  e.g. `track ORD1720262626 Bluedart 71234567890`
- `pending` — list all paid orders currently awaiting dispatch
- `status <orderId>` — check one order's current status
- `help` (or anything unrecognized) — shows this command list

## Owner commands
- `report` — get an on-demand sales + pending-dispatch report immediately
- `paid <orderId>` — confirm you've verified payment for an order; this
  triggers the invoice send and dispatch handoff
  e.g. `paid ORD1720262626`
- `restock <itemId> <quantity>` — add stock back and clear any low-stock
  alert for that item, e.g. `restock B002 20`

## Managing your catalog
Edit `data/inventory.json` directly. Fields: `id`, `title`, `type`
(book/journal), `publisher`, `edition`, `price`, `currency`, `stock`,
`lowStockAlerted` (leave as `false` for new items). Stock is deducted
automatically when an order is placed (before payment, to reserve it).

## Data files (simple JSON — swap for a real DB when you outgrow this)
- `data/inventory.json` — your catalog, stock levels, and low-stock alert flags
- `data/orders.json` — full order lifecycle: awaiting_payment → paid → dispatched → delivered
- `data/feedback.json` — collected delivery/satisfaction feedback
- `data/contacts.json` — owner & dispatch team WhatsApp numbers

## Things worth deciding as you grow
- **Payment verification is manual** (you check your UPI app, then reply
  `paid <orderId>`), since a bare UPI QR code has no payment-confirmation
  webhook. If you later use a payment gateway (Razorpay, Cashfree, etc.)
  instead of a raw UPI ID, that verification step can become automatic.
- **Stock is reserved at order creation**, before payment. If a customer
  never pays, that stock stays reserved. Worth adding an auto-cancel job
  for orders left unpaid beyond, say, 24 hours, to release the stock.
- **Courier API integration**: tracking is entered manually by your dispatch
  team via WhatsApp (works with any courier, e.g. Bluedart, zero setup).
  Once you're ready, this can be upgraded to auto-fetch tracking status
  from a courier's API instead of manual entry — happy to wire that in
  once you share the courier's API details.
- **Conversation memory is in-memory** (resets if the server restarts).
  Fine for launch; move to a real database keyed by phone number for
  higher volume or multi-instance hosting.
- **Invoices don't currently include GST/tax breakdowns** — easy to add if
  you need it for compliance.
- **Multi-language replies** (e.g. Hindi/Punjabi) can be added by adjusting
  the agents' system prompts.

