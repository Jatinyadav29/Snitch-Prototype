# Snitch Server — E-Commerce REST API

A Node.js / Express 5 backend for a clothing e-commerce prototype. It provides JWT authentication (access + refresh tokens), role-based access (`user` / `seller`), product management with image uploads to ImageKit, and a per-user shopping cart. Data is stored in MongoDB via Mongoose.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Architecture & Request Lifecycle](#architecture--request-lifecycle)
6. [Authentication Flow](#authentication-flow)
7. [Data Models](#data-models)
8. [API Reference](#api-reference)
9. [Validation](#validation)
10. [Image Upload Flow](#image-upload-flow)
11. [Module-by-Module Breakdown](#module-by-module-breakdown)
12. [Known Issues & Improvement Notes](#known-issues--improvement-notes)

---

## Tech Stack

| Concern | Library |
|---|---|
| Runtime / Module system | Node.js, ES Modules (`"type": "module"`) |
| Web framework | Express `^5.2.1` |
| Database / ODM | MongoDB, Mongoose `^9.10.2` |
| Auth | `jsonwebtoken`, `bcryptjs` (12 salt rounds), `cookie-parser` |
| Validation | Zod `^4.6.5` |
| File upload | Multer `^2.4.0` (memory storage) |
| Image hosting | ImageKit (`@imagekit/nodejs`) |
| Config | `dotenv` |
| Dev tooling | `nodemon` |

---

## Project Structure

```
Server/
├── server.js                      # Entry point: loads config, connects DB, starts HTTP server
├── package.json
├── .env                           # Environment variables (git-ignored)
├── .gitignore
└── src/
    ├── app/
    │   └── app.js                 # Express app: global middleware + route mounting
    ├── config/
    │   ├── config.js              # Central env-var config object
    │   ├── db.js                  # MongoDB connection
    │   └── multer.js              # Multer instance (memory storage, limits)
    ├── routes/
    │   ├── auth.routes.js         # /api/auth/*
    │   ├── product.routes.js      # /api/product/*
    │   └── cart.routes.js         # /api/cart/*
    ├── controllers/
    │   ├── auth.controller.js     # register, login, refresh, me
    │   ├── product.controller.js  # create, list/unlist, fetch products
    │   └── cart.controller.js     # add to cart, get cart
    ├── middlewares/
    │   ├── auth.middleware.js     # authenticate (JWT) + isSeller (role guard)
    │   ├── validator.middleware.js        # Zod validation for req.body
    │   └── paramsValidator.middleware.js  # Zod validation for req.params
    ├── validator/
    │   ├── auth.zod.js            # registerSchema, loginSchema
    │   ├── product.zod.js         # productSchema, list/unlist param schemas
    │   └── cart.zod.js            # cartSchema
    ├── models/
    │   ├── user.model.js          # "users" collection
    │   ├── product.model.js       # "product" collection
    │   └── cart.model.js          # "carts" collection
    ├── services/
    │   └── storage.service.js     # ImageKit upload wrapper
    └── utils/
        └── auth.js                # JWT sign / verify helpers
```

---

## Getting Started

**Prerequisites:** Node.js 18+ (20+ recommended), a MongoDB instance (local or Atlas), and an ImageKit account.

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file (see "Environment Variables" below)

# 3. Start in development mode (auto-reload via nodemon)
npm run dev

# or start normally
node server.js
```

The server prints `Database connected successfully` and `Server running on port - <PORT>` when ready.

> There is no `start` script or test suite yet (`npm test` is a placeholder).

---

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
ACCESS_TOKEN_SECRET=<long-random-string>
REFRESH_TOKEN_SECRET=<different-long-random-string>
IMAGEKIT_PUBLIC_KEY=<imagekit-public-key>
IMAGEKIT_PRIVATE_KEY=<imagekit-private-key>
```

| Variable | Used for |
|---|---|
| `PORT` | HTTP port the server listens on |
| `MONGO_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Signing/verifying 15-minute access tokens |
| `REFRESH_TOKEN_SECRET` | Signing/verifying 7-day refresh tokens |
| `IMAGEKIT_PUBLIC_KEY` | Loaded into config (not used by the SDK call currently) |
| `IMAGEKIT_PRIVATE_KEY` | Authenticates ImageKit uploads |

All variables are read once in `src/config/config.js` and imported from there — no other file touches `process.env`.

---

## Architecture & Request Lifecycle

The app follows a layered structure: **Route → Middleware → Controller → Model/Service**.

```
Client
  │
  ▼
Express app (app.js)
  ├─ express.json()          parse JSON bodies
  ├─ cookieParser()          parse cookies (refresh token)
  │
  ├─ /api/auth     → auth.routes.js
  ├─ /api/product  → product.routes.js
  └─ /api/cart     → cart.routes.js
        │
        ▼
  Route-level middleware chain, e.g.
  authenticate → isSeller → multer → (body parsing) → Zod validation
        │
        ▼
  Controller (business logic) ──► Mongoose models ──► MongoDB
                             └──► storage.service ──► ImageKit
        │
        ▼
  JSON response  { message, data? , errors? }
```

**Startup sequence (`server.js`):**
1. Imports `config` (which runs `dotenv/config`).
2. Awaits `connectToDB()` (top-level await). A connection failure is logged but does **not** stop the server.
3. Calls `app.listen(PORT)`.

**Response conventions:** every response is JSON with a `message` field. Successful responses carry a `data` object; validation errors carry an `errors` array of `{ field, message }`.

---

## Authentication Flow

Auth uses a two-token scheme:

| Token | Lifetime | Where it lives | Payload |
|---|---|---|---|
| Access token | 15 minutes | Returned in JSON; client sends `Authorization: Bearer <token>` | `{ id, role }` |
| Refresh token | 7 days | `httpOnly` cookie named `refreshToken`; also stored on the user document | `{ id, role }` |

**Register / Login**
1. Body is validated by Zod (email trimmed + lowercased, password ≥ 8 chars).
2. Register: rejects duplicate emails (400), hashes password with bcrypt (12 rounds), creates the user.
3. Login: looks up the user, compares the bcrypt hash; the same generic message ("Invalid email or password") is returned for unknown email or wrong password.
4. Both generate an access + refresh token, save the refresh token on the user document, set it as an `httpOnly` cookie, and return the access token in the body.

**Protected routes** — `authenticate` middleware:
- Reads `Authorization: Bearer <token>`, verifies it with `ACCESS_TOKEN_SECRET`, and attaches the decoded payload to `req.user` (`{ id, role, iat, exp }`).
- Invalid/expired token → `401`.

**Role guard** — `isSeller` runs after `authenticate` and returns `403 Access Forbidden` unless `req.user.role === "seller"`.

**Token refresh** — `POST /api/auth/refresh`:
1. Reads the `refreshToken` cookie (401 if missing).
2. Verifies it with `REFRESH_TOKEN_SECRET`, loads the user.
3. Compares it with the token stored in the DB. On mismatch the stored token is wiped (`null`) and a 400 is returned — this is a reuse-detection mechanism.
4. Otherwise issues a brand-new pair (**refresh token rotation**), stores the new refresh token, resets the cookie, and returns a new access token.

---

## Data Models

### `users` (`user.model.js`)

| Field | Type | Notes |
|---|---|---|
| `email` | String | required, unique, regex-validated |
| `name` | String | required |
| `passwordHash` | String | required (bcrypt hash) |
| `role` | String | enum `user` \| `seller`, default `user` |
| `refreshToken` | String | currently valid refresh token |

### `product` (`product.model.js`)

| Field | Type | Notes |
|---|---|---|
| `title` | String | required, 2–100 chars |
| `discription` | String | required, 20–500 chars (*field name is spelled this way throughout the codebase*) |
| `images` | [String] | ImageKit URLs, max 5 |
| `price.amount` | Number | required |
| `price.currency` | String | enum `INR` \| `USD`, default `INR` |
| `sizes[]` | `{ size, stock }` | `size` ∈ `XS,S,M,L,XL,XXL` (required); `stock` ≥ 0, default 0 |
| `seller` | ObjectId → `users` | required |
| `published` | Boolean | default `false` — only published products are visible to buyers |

### `carts` (`cart.model.js`)

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → `users` | required; one cart per user |
| `products[]` | `{ product, quantity, size }` | `product` is an ObjectId, `quantity` ≥ 1 (default 1), `size` from the same size enum |

---

## API Reference

Base URL: `http://localhost:<PORT>`

Legend: 🔓 public · 🔐 requires access token · 🛍️ requires `seller` role

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | 🔓 | Create account, returns user + access token, sets refresh cookie |
| POST | `/login` | 🔓 | Authenticate, returns access token, sets refresh cookie |
| POST | `/refresh` | 🔓 (cookie) | Rotate tokens using the refresh cookie |
| GET | `/me` | 🔐 | Returns `name`, `email`, `role` of the current user |

**POST `/api/auth/register`**
```json
// request
{ "name": "Jatin Kumar", "email": "jatin@example.com", "password": "secret123" }

// 201 response
{
  "message": "User registered successfully",
  "data": {
    "user": { "name": "Jatin Kumar", "email": "jatin@example.com", "id": "<id>" },
    "accessToken": "<jwt>"
  }
}
```

**POST `/api/auth/login`**
```json
// request
{ "email": "jatin@example.com", "password": "secret123" }

// 200 response
{ "message": "Login Successful", "data": { "user": { "email": "...", "id": "..." }, "accessToken": "<jwt>" } }
```

### Products — `/api/product`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/create` | 🔐🛍️ | Create a product with up to 5 images (`multipart/form-data`) |
| GET | `/getAll` | 🔐 | List all **published** products |
| GET | `/seller/getAll` | 🔐🛍️ | List **all** products (published and unpublished) |
| PATCH | `/list/:id` | 🔐🛍️ | Publish a product (`published = true`) |
| PATCH | `/unlist/:id` | 🔐🛍️ | Unpublish a product (`published = false`) |

**POST `/api/product/create`** — `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `title` | text | 3–100 chars, English letters and spaces only |
| `discription` | text | 20–500 chars |
| `price` | text (JSON string) | e.g. `{"amount": 1999, "currency": "INR"}` |
| `sizes` | text (JSON string) | e.g. `[{"size":"M","stock":10},{"size":"L","stock":5}]` |
| `images` | file(s) | up to 5 files, 1 MB each |

New products are created **unpublished**; call `PATCH /list/:id` to make them visible.

### Cart — `/api/cart`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | 🔐 | Add a product (size + quantity) to the user's cart |
| GET | `/` | 🔐 | Get the user's cart (auto-created if none exists) |

**Add-to-cart logic (`addToCartController`):**
1. Look up the product → 404 if missing.
2. Check the requested size exists on the product → 400 `Invalid size`.
3. Check `stock >= quantity` → 400 `Insufficient stock`.
4. Find or create the user's cart.
5. If the item is already in the cart, verify `existing + new <= stock`, then `$inc` its quantity; otherwise `$push` a new line item.

### Common error responses

| Status | Meaning |
|---|---|
| 400 | Validation failure, duplicate user, bad credentials, insufficient stock |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but not a seller |
| 404 | Resource not found |
| 500 | Unhandled server error (details logged to console only) |

Validation errors look like:
```json
{
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Enter a valid Email address" }]
}
```

---

## Validation

Validation is done with Zod through two reusable middleware factories:

- **`validateBody(schema)`** — runs `schema.safeParse(req.body)`; on failure returns 400 with the issue list; on success **replaces `req.body` with the parsed (trimmed/normalised) data**.
- **`paramsValidator(schema)`** — same, for `req.params` (used to confirm `:id` is a valid Mongo ObjectId).

Schemas live in `src/validator/`:

- `auth.zod.js` — `registerSchema` (email, name ≥ 3, password ≥ 8), `loginSchema`.
- `product.zod.js` — `productSchema`, `listProductSchema`, `unlistProductSchema`.
- `cart.zod.js` — `cartSchema`.

---

## Image Upload Flow

1. `multer` (memory storage, max **5 files**, max **1 MB** each) parses `images` — files stay in RAM as buffers; nothing is written to disk.
2. A small inline middleware `JSON.parse`s the `price` and `sizes` form fields (multipart sends everything as strings).
3. Body validation runs via `productSchema`.
4. In `createProductController`, each file buffer is uploaded sequentially to ImageKit through `uploadFiles()` in `storage.service.js` (folder: `Snitch-Prototype`).
5. The returned URLs are saved in `product.images`.

---

## Module-by-Module Breakdown

| File | Responsibility |
|---|---|
| `server.js` | Boots the app: connect DB, then listen |
| `src/app/app.js` | Creates Express app, registers JSON + cookie parsers, mounts the three routers |
| `src/config/config.js` | Single source of truth for env vars |
| `src/config/db.js` | `mongoose.connect` with try/catch logging |
| `src/config/multer.js` | Upload limits and memory storage |
| `src/utils/auth.js` | `generateToken`, `verifyAccessToken`, `verifyRefreshToken` |
| `src/middlewares/auth.middleware.js` | `authenticate` (JWT → `req.user`), `isSeller` (role gate) |
| `src/middlewares/validator.middleware.js` | Body validation factory |
| `src/middlewares/paramsValidator.middleware.js` | Params validation factory |
| `src/services/storage.service.js` | ImageKit client + `uploadFiles({ buffer, fileName })` |
| `src/controllers/*.js` | Request handlers containing business logic and try/catch error handling |
| `src/routes/*.js` | Wires endpoints → middleware chains → controllers |
| `src/models/*.js` | Mongoose schemas/models |

---

## Known Issues & Improvement Notes

Issues spotted while reading the code, roughly in order of importance:

1. **Cart validator doesn't match the controller.** `cartSchema` expects `{ products: [{ product, quantity, size }] }`, but `addToCartController` reads `{ productId, quantity, size }` from the body. As written, a request that satisfies the controller fails validation (and vice versa). Align the two.
2. **Cart "already in cart" lookup is buggy.** In `cart.controller.js`, `find(((p) => p.product.toString() === productId) && p.size === size)` — the `&&` is applied to the arrow function itself, not inside it, so the product-ID check is effectively ignored. It should be `find((p) => p.product.toString() === productId && p.size === size)`. Also, the follow-up `updateOne` with two separate `products.product` / `products.size` conditions can increment the wrong line item; use `$elemMatch` instead.
3. **No way to become a seller.** `role` defaults to `user` and registration doesn't accept a role, so seller-only routes are only reachable by editing the DB manually. Add a seller-registration path or an admin action.
4. **No ownership checks on seller actions.** `/seller/getAll` returns every seller's products, and `list`/`unlist` don't verify `product.seller === req.user.id`, so any seller can publish/unpublish another seller's product.
5. **`authenticate` crashes without a header.** `req.headers.authorization.split(" ")` throws if the header is absent. Use optional chaining and return 401 (it also returns 400 for a missing token; 401 is more appropriate).
6. **Unguarded `JSON.parse`** in the product create route — malformed `price`/`sizes` strings throw and aren't caught by any handler.
7. **Cookie hardening.** The refresh cookie is `httpOnly` only; add `secure`, `sameSite`, and `maxAge` for production.
8. **Sequential image uploads.** A `TODO` in `createProductController` already notes this — switch to `Promise.all` for speed (and clean up already-uploaded files if one fails).
9. **Missing pieces for production:** no CORS, no rate limiting, no `helmet`, no global error handler, no logging library, no tests, no `start` script, no `.env.example`.
10. **Minor inconsistencies:** `discription` spelling (consistent, but a typo for "description"); the `feild` typo in the register duplicate-user response; the login response omits `name` while register includes it; the product Zod title regex rejects digits and punctuation (e.g. "Slim Fit 2.0"); the model allows 2-char titles while Zod requires 3.
11. **DB failure doesn't stop startup.** If MongoDB is unreachable the server still starts and every DB call will fail.
12. **Secrets:** a `.env` file is included in the project archive. It is git-ignored, but make sure it is never shared or committed, and rotate any credentials that have been exposed.

---

## License

ISC
