# DevNova AI

Full-stack AI chat app: vanilla HTML/CSS/JS frontend, Node + Express backend, Anthropic API for replies.

## Run it
1. Install Node 18 or newer.
2. `npm install`
3. Copy `.env.example` to `.env` and add your `ANTHROPIC_API_KEY` (from console.anthropic.com) and a long random `JWT_SECRET`.
4. `npm start`, then open http://localhost:3000

## What works
- Sign up / sign in (bcrypt + JWT), profile and default-model settings
- Chat via `POST /api/chat`, which calls the Anthropic Messages API. Your key stays on the server.
- Conversation history with search, sort and delete
- Wallet: each reply costs 10 credits. Usage ring and breakdown update live.
- Plans, credit top-ups and invoices (downloadable as text)

## Before going live
- Data is stored in `data.json`. Move to PostgreSQL or MongoDB for real users.
- Payments are simulated. Connect Stripe or Razorpay in `/api/wallet/add` and `/api/plans/upgrade`, confirming through webhooks.
- Google/GitHub sign-in buttons need OAuth credentials (for example with Passport.js).
- Add rate limiting (`express-rate-limit`), HTTPS and helmet.
- Add streaming replies and real image/document features by adding routes that call the matching API.
