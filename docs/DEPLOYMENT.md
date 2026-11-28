# Going live: checklist

The app is built to run on any Node host (Vercel, DigitalOcean App Platform, Railway, a VPS...).
Everything outside the app is configured through environment variables; `.env.example` lists them
all. A production server **refuses to start** with unsafe settings (see `src/lib/env.ts`), and
checkout and uploads switch themselves **off** rather than run unsafely.

## 1. Database (separate from development)

1. Create a new PostgreSQL database for production (Neon, Supabase, DigitalOcean Managed DB...).
2. Set `DATABASE_URL` to it in the production environment.
3. Create the tables: `npm run db:deploy` (runs `prisma migrate deploy`).
4. Add the product catalog: `npm run db:seed` (safe to run again; it only upserts).
5. Turn on automatic backups with your database provider.

> Never point your local `.env` at the production database. The development database holds test
> orders and the old test admin.

## 2. First admin, and removing the test admin

```bash
npm run admin:create -- you@yourdomain.com "a long passphrase of 12+ characters"
```

On any database that ever had the test admin (`admin@pressroom.test`, default password):

```bash
npm run admin:demote -- admin@pressroom.test
```

## 3. Secrets

| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 48`. Different for every environment. |
| `SITE_URL` | `https://your-domain.com` (no trailing slash) |
| `AUTH_TRUST_HOST` | `true` |

Rotating `AUTH_SECRET` logs everyone out; that's fine.

## 4. Payments: Stripe

1. Create a Stripe account and copy the **secret key** (`sk_live_...`) into `STRIPE_SECRET_KEY`.
2. In Stripe → Developers → Webhooks add the endpoint `https://your-domain.com/api/webhooks/stripe`
   with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
3. Copy its **signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
4. Test first with `sk_test_` keys and card `4242 4242 4242 4242`.

How it works: checkout saves the order as `PENDING`, sends the shopper to Stripe's hosted page, and
the webhook marks it `PAID` (the order page also asks Stripe when the shopper returns, in case the
webhook is a moment late). Cancelling a paid order refunds it automatically. Without
`STRIPE_SECRET_KEY`, production checkout is disabled.

Set `SHIPPING_FLAT`, `FREE_SHIPPING_OVER` and `TAX_RATE` for your prices. If you must collect sales
tax or VAT by region, use Stripe Tax or an accountant's advice instead of the flat rate.

## 5. Uploads: object storage

Without a bucket, uploads are stored in the database (table `UploadedFile`, served from
`/api/files/<id>`). That works on any host with no extra account, but it grows the database and is
slower than a bucket, so use a bucket once you have real traffic. Run `npm run db:deploy` so the
table exists. Guest uploads that never become an order are never deleted automatically.

Create a bucket on any S3-compatible service and set `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (blank
for AWS), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and `S3_PUBLIC_URL`.

- The bucket (or its CDN) must allow **public read** of `uploads/*`.
- Add a **CORS rule** allowing `GET` from your site's origin, because the mockup download reads
  design files in the browser:

  ```json
  [{ "AllowedOrigins": ["https://your-domain.com"], "AllowedMethods": ["GET"], "AllowedHeaders": ["*"] }]
  ```

- Give the access key write permission on the bucket only.

## 6. Email

Create a [Resend](https://resend.com) account, verify your sending domain, and set
`RESEND_API_KEY`, `EMAIL_FROM` and `SUPPORT_EMAIL`. This turns on email confirmation at sign-up,
password reset, order confirmations and shipped notices. (Without it, new accounts are confirmed
automatically and no mail is sent.)

## 7. Abuse protection

Login, sign-up, password reset, uploads and checkout are rate limited. On a single server the
in-memory limiter is enough. On serverless hosts (several instances) create a free
[Upstash Redis](https://upstash.com) database and set `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` so the limits are shared.

## 8. Monitoring

- Point an uptime monitor at `GET /api/health` (200 = app and database are up; it also shows which
  services are configured, never secrets).
- Set `ERROR_WEBHOOK_URL` to a Slack or Discord incoming webhook to be pinged on server errors.
  Errors are also logged as JSON lines (`src/instrumentation.ts`). For full error tracking add
  Sentry's Next.js SDK on top.

## 9. Before you announce

- [ ] Have `/terms`, `/privacy`, `/shipping` and `/returns` reviewed (they are templates).
- [ ] Set `COMPANY_NAME` and `SUPPORT_EMAIL`, and read the shipping and returns pages once.
- [ ] Place a real test order in Stripe test mode, then in live mode with a small amount, and cancel it
      to check the refund.
- [ ] Open the site on a phone, in light and dark theme.
- [ ] Submit `https://your-domain.com/sitemap.xml` to Google Search Console.

## Running a production build locally

```bash
npm run build && npm start
```

`npm start` runs with `NODE_ENV=production`, so it needs every required variable from step 3 (and
shows what is missing). To build while `next dev` is running use `BUILD_DIR=.next-build npx next build`.

## Embedding in another site (later)

By default only this site may frame itself. To let another site embed it set `FRAME_ANCESTORS`
(see `.env.example`).
