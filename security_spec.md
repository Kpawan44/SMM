# Security Spec for GrowSocials SMM Reseller Platform

This spec defines the zero-trust invariants and security policies to safeguard all customer wallets, transaction ledgers, orders, and administrative parameters.

## 1. Zero-Trust Data Invariants

- **Wallets (`wallets/{uid}`)**: No user may read, write, or modify another user's wallet. A user can only initialize or update their own wallet.
- **Wallet Transactions (`wallet_transactions/{txId}`)**: A user is only permitted to create transactions tied to their own authenticated UID and read transactions they own. Transactions are immutable once created.
- **Orders (`orders/{orderId}`)**: Users can only query their own orders. Only users authenticated with the verified administrative email (`pawan.kummar16@gmail.com`) can list all platform orders or transition order statuses.
- **Settings (`settings/payment_config`)**: Any authenticated user can read configurations safely, but absolutely no non-admin user is allowed to write or modify payments settings or markup values.

---

## 2. The "Dirty Dozen" Threat Payloads

The following attack vectors represent severe security violations of the application boundaries. The security rules must strictly block all 12:

### T01 - Cross-User Wallet Read
An attacker authenticated as `user_alice` attempts to listen to or retrieve the wallet document of `user_bob` (`wallets/user_bob`).
*Expected Result: `PERMISSION_DENIED`*

### T02 - Cross-User Wallet Update
An attacker authenticated as `user_alice` attempts to overwrite or increment the balance of `user_bob` (`wallets/user_bob`).
*Expected Result: `PERMISSION_DENIED`*

### T03 - Privilege Escalation Settings Override
A standard authenticated user attempts to modify UPI payment gateway destinations or minimum refills inside `settings/payment_config`.
*Expected Result: `PERMISSION_DENIED`*

### T04 - Order Query Scraping (Client-Side Delegation Attack)
An attacker attempts to read all document ids on the `/orders` collection without a where filter restricting queries to their own UID.
*Expected Result: `PERMISSION_DENIED`*

### T05 - Cross-User Order Read
An attacker authenticated as `user_alice` attempts to read a specific order document owned by `user_bob`.
*Expected Result: `PERMISSION_DENIED`*

### T06 - Identity Spoofing Order Creation
An attacker authenticated as `user_alice` attempts to place an order under `userId: "user_bob"`.
*Expected Result: `PERMISSION_DENIED`*

### T07 - Order Status Shortcutting / Forgery
A standard user attempts to directly deliver or complete their own pending order by patching the `status` field of `orders/{orderId}` to `"completed"`.
*Expected Result: `PERMISSION_DENIED`*

### T08 - Identity Spoofing Ledger Fraud
An attacker attempts to insert a record into `/wallet_transactions` with `userId` set to someone else's UID to spoof a payment.
*Expected Result: `PERMISSION_DENIED`*

### T09 - Document ID Poisoning (Wallet Denial-of-Wallet Service)
An attacker attempts to submit a document with a 1MB malformed or excessively long document ID to flood or break indexes.
*Expected Result: `PERMISSION_DENIED`*

### T10 - Temporal Integrity Fraud (Timestamp Spoofing)
An attacker attempts to set `createdAt` in `orders` or `wallet_transactions` to a back-dated or future-dated client timestamp instead of using the mandatory `request.time` server variable.
*Expected Result: `PERMISSION_DENIED`*

### T11 - Immutable Field Alteration
A user attempts to modify their `userId` or `createdAt` fields on an existing order or historical transaction ledger document.
*Expected Result: `PERMISSION_DENIED`*

### T12 - Ghost Field Injection (Shadow Update)
An attacker tries to update their profile wallet document by sending extra unvalidated keys (e.g., `isAdmin: true` or `role: "admin"`).
*Expected Result: `PERMISSION_DENIED`*
