# Betting Platform MVP (Simple Demo)

This is a minimal, educational MVP for a betting-like platform (for testing and learning only).
**Important legal note:** This is a technical demo. Do NOT use this in production or for real gambling
without licenses, legal review, and strong security.

## What's included
- Express backend (server.js) using SQLite for simple storage.
- Static frontend (public/index.html + public/app.js) that interacts with the backend.
- Simple endpoints: register/login (very basic), deposit, wallet, place-bet, list events.

## How to run (on your machine)
1. Install Node.js (v18+ recommended).
2. Extract the project and open a terminal in the project folder.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   node server.js
   ```
5. Open http://localhost:3000 in your browser.

## Security & production notes
- This demo is intentionally simple and **not secure**: passwords are stored in plaintext, no JWT,
  no rate-limiting, no KYC, no input sanitization, and no production hardening.
- For production: use HTTPS, password hashing (bcrypt), proper authentication (JWT/OAuth), validate inputs,
  use a robust DB (Postgres), implement KYC/AML, licenses, and legal compliance.

Enjoy testing the demo locally.

