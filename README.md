# Production-Ready WhatsApp CRM Web Application

A full-featured, production-ready WhatsApp CRM built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and the **Official Meta WhatsApp Business Cloud API**.

This platform allows customer support and sales teams to manage multi-channel WhatsApp inquiries, review complete message histories, dispatch live replies, and track delivery receipts in real time—all while storing messages permanently in your own database.

---

## 🌟 Key Architecture Highlights

1. **Official Meta WhatsApp Business Cloud API**:
   - Uses Meta's Graph API endpoints (`v21.0`).
   - Fully compliant with Meta messaging policies, opt-in rules, and the 24-hour customer service window.
   - Strictly avoids unauthorized scrapers, unofficial libraries, or session-hijacking tools.

2. **Permanent Source of Truth in Your Database**:
   - Every incoming and outgoing message is permanently persisted in your CRM database with Meta message IDs (`wamid`), statuses (`SENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`), timestamps, and error codes.
   - The application does not rely solely on WhatsApp for chat history.

3. **Zero Data Loss on WhatsApp Number Replacement (Requirement 8)**:
   - WhatsApp numbers are decoupled from Customer records and Conversation history via the `WhatsAppAccount` relational model.
   - If an old WhatsApp number (e.g. `+91 11 1111 1111`) is replaced or deactivated and a new number (e.g. `+91 22 2222 2222`) is connected, **all customer chat history is 100% preserved**.
   - New messages sent to or received from the customer are automatically merged into the customer's existing conversation thread, with in-chat channel migration notices indicating which WhatsApp number was active.

4. **Real-Time Live Updates**:
   - Implements Server-Sent Events (SSE) via `/api/realtime` and an in-memory event bus with automatic reconnection.
   - New incoming messages, delivery receipts (double checks), and read receipts (blue double checks) update instantly without requiring manual page reloads.

5. **Built-in Webhook Simulator**:
   - Complete local test bench on the Dashboard and Settings pages to simulate incoming customer messages and delivery/read receipts with 1 click without needing a public tunnel or Meta credentials right away.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14.2 (App Router with Server Components & Route Handlers)
- **Language**: TypeScript 5.0 (Strict mode enabled)
- **Styling**: Tailwind CSS with dark theme WhatsApp aesthetic
- **Database & ORM**: Prisma ORM 6.4 (SQLite for zero-setup local dev; single-variable switch to PostgreSQL for production)
- **Authentication**: Secure JWT sessions with HTTP-only cookies and bcryptjs password hashing
- **Real-Time Communication**: Server-Sent Events (SSE) with auto-reconnecting client hook
- **Icons**: Lucide React

---

## 📂 Project Structure

```
├── prisma/
│   ├── schema.prisma        # Database schema (User, Customer, Conversation, Message, WhatsAppAccount, WebhookEvent)
│   ├── dev.db               # SQLite database (for local dev)
│   └── seed.ts              # Seed script with demo admin, accounts & customer threads
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/        # Login, Logout, Me authentication routes
│   │   │   ├── contacts/    # Customer contact CRUD API
│   │   │   ├── conversations/# Thread listing and pagination API
│   │   │   ├── messages/    # Outgoing message dispatching API
│   │   │   ├── realtime/    # Server-Sent Events (SSE) streaming endpoint
│   │   │   ├── webhook/     # Meta webhook verification (GET) and ingestion (POST)
│   │   │   └── whatsapp-accounts/ # Number management & connection test API
│   │   ├── chat/            # WhatsApp-style 3-column Chat Inbox
│   │   ├── contacts/        # Contact directory & management page
│   │   ├── dashboard/       # CRM operational metrics & connection health
│   │   ├── login/           # Admin authentication login portal
│   │   ├── numbers/         # WhatsApp Number replacement & channel manager
│   │   ├── settings/        # Webhook configuration & Meta Cloud API settings
│   │   ├── layout.tsx       # Root layout with ClientProviders
│   │   └── page.tsx         # Root redirect to Dashboard
│   ├── components/
│   │   ├── layout/          # Responsive AppLayout with collapsible sidebar
│   │   └── providers/       # Client context providers
│   ├── context/
│   │   ├── AuthContext.tsx  # Authentication context & hooks
│   │   └── ToastContext.tsx # Toast alerts context & notification container
│   ├── hooks/
│   │   └── useRealtime.ts   # SSE real-time client hook
│   └── lib/
│       ├── auth.ts          # JWT signing, password verification, cookie extraction
│       ├── prisma.ts        # Prisma client singleton
│       ├── realtime.ts      # Event bus for streaming real-time events
│       └── whatsapp.ts      # Meta WhatsApp Cloud API dispatcher & signature verification
├── tests/
│   └── verify-all.ts        # End-to-end integration test suite
├── .env.example             # Documented environment variables template
└── README.md                # Comprehensive documentation
```

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm** or **yarn**

### 2. Clone and Install Dependencies
```bash
git clone <repository-url>
cd api
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Default local `.env` content:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="whatsapp-crm-super-secret-jwt-key-change-this-in-production-998877"
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_BUSINESS_ACCOUNT_ID=""
WHATSAPP_VERIFY_TOKEN="whatsapp_crm_verify_token_secure_2025"
WHATSAPP_APP_SECRET=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Note**: Even if you do not have Meta credentials yet, the application runs out of the box in **Simulator Mode**. You can test full inbox flows, sending replies, and receiving webhooks locally!

### 4. Database Setup & Seeding
Push the Prisma schema to create the local database tables and run the seed script:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

This seeds:
- **Admin User**:
  - Email: `admin@example.com`
  - Password: `admin123456`
- **WhatsApp Accounts**:
  - `Primary Business Line` (`+1 (555) 019-2834` • Default Active)
  - `Old Support Line (Replaced)` (`+91 11 1111 1111` • Inactive)
  - `New Support Desk` (`+91 22 2222 2222` • Active)
- **Pre-populated Customers & Historical Conversations**:
  - `Rahul Sharma` (Demonstrating multi-number history preservation across both `+91 11...` and `+91 22...`)
  - `Sarah Jenkins`
  - `Alex Rivera`

### 5. Run the Application
Start the development server:
```bash
npm run dev
```
Or run the production build:
```bash
npm run build
npm run start
```
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Admin Credentials

On the login page, you can either click the **"Use Demo Admin Credentials"** button or enter:
- **Email**: `admin@example.com`
- **Password**: `admin123456`

---

## 🔗 Meta Developer Portal & WhatsApp Cloud API Setup

To connect live WhatsApp numbers and process real messages from actual devices, follow these steps:

### Step 1: Create a Meta Developer App
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Log in and navigate to **My Apps** &gt; **Create App**.
3. Select **Other** as the use case, click Next, and select **Business** as the app type.
4. Give your app a name and associate your Meta Business Account.

### Step 2: Add WhatsApp to Your App
1. On the App Dashboard, scroll down and find **WhatsApp** under "Add products to your app".
2. Click **Set up**.
3. Meta will open the **WhatsApp &gt; API Setup** page.

### Step 3: Copy Credentials to `.env`
On the **API Setup** page:
1. **Temporary or Permanent Access Token**:
   - Copy the token and paste it into `.env` as `WHATSAPP_ACCESS_TOKEN`.
   - *For production, create a System User in Meta Business Settings &gt; Users &gt; System Users with `whatsapp_business_messaging` permissions to get a permanent token that does not expire in 24 hours.*
2. **Phone Number ID**:
   - Copy the number ID under "Step 1: Select phone numbers" and set `WHATSAPP_PHONE_NUMBER_ID` in `.env`.
3. **WhatsApp Business Account ID**:
   - Copy the WABA ID and set `WHATSAPP_BUSINESS_ACCOUNT_ID` in `.env`.
4. **App Secret** (Optional but recommended for HMAC security):
   - Navigate to **App Settings &gt; Basic**, click **Show** next to **App Secret**, and copy it to `WHATSAPP_APP_SECRET`.

### Step 4: Configure the Webhook
1. In Meta Developer Console, navigate to **WhatsApp &gt; Configuration** in the left sidebar.
2. Under **Webhook**, click **Edit**.
3. Enter the following:
   - **Callback URL**: `https://<YOUR-PUBLIC-DOMAIN>/api/webhook/whatsapp`
     *(For local development, use an ngrok or Cloudflare tunnel URL, e.g. `https://xyz.ngrok-free.app/api/webhook/whatsapp`).*
   - **Verify Token**: Enter the exact same string configured in `.env` (default: `whatsapp_crm_verify_token_secure_2025`).
4. Click **Verify and save**. Meta will issue a `GET` request to your endpoint, and the CRM will verify the challenge token.
5. In the **Webhook fields** table below, click **Manage** and subscribe to:
   - `messages` (Mandatory: triggers for all inbound customer messages and delivery/read receipts).

---

## 🔄 Number Replacement & History Retention (Requirement 8)

The system is designed so that changing or retiring a WhatsApp number **never** removes customer records or conversation logs:

```
Customer (Rahul Sharma)
   │
   ├── Conversation (Thread ID: conv-rahul-sharma)
   │     │
   │     ├── Message 1: "Hello" ───────────────> Received via Old Line (+91 11 1111 1111)
   │     ├── Message 2: "Hi Rahul..." ─────────> Sent via Old Line (+91 11 1111 1111)
   │     │
   │     │   [ADMIN CONNECTS NEW WHATSAPP LINE: +91 22 2222 2222]
   │     │
   │     ├── Message 3: "I want to know price" ─> Received via New Line (+91 22 2222 2222)
   │     └── Message 4: "Sure, here is price" ──> Sent via New Line (+91 22 2222 2222)
```

### How to Replace a Number in the Admin UI:
1. Navigate to **WhatsApp Numbers** in the CRM navigation sidebar (`/numbers`).
2. Click **Add Number** and enter the new line's Display Name, Phone Number, and Meta Phone Number ID. Check **"Set this number as primary default"**.
3. On the old line's card, click **Retire Line** (or **Deactivate**).
4. The system will safely retire the old number from sending while preserving all historical messages and customer records in the database.
5. In the **Chat Inbox** (`/chat`), customer threads show an informational badge indicating when the channel switched, ensuring complete auditability.

---

## 🧪 Testing and Verification

A comprehensive automated test suite is included in `tests/verify-all.ts`.

Run the test suite against the running application:
```bash
npx tsx tests/verify-all.ts
```

The test validates:
- [x] Meta Webhook GET challenge verification
- [x] Admin Login authentication & JWT issuance
- [x] User verification via `/api/auth/me`
- [x] Dashboard metrics computation
- [x] Inbound message webhook processing & customer matching
- [x] Outbound message dispatching & status tracking
- [x] Webhook status receipts (Delivered / Read updates)
- [x] Number replacement history retention (Requirement 8)
- [x] Contact creation and querying

---

## 🚢 Production Deployment to Vercel & PostgreSQL

### 1. Database Configuration
In production, use PostgreSQL (e.g. Supabase, Neon, Railway, or AWS RDS).
1. Open `prisma/schema.prisma` and update the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. In your production `.env` (or Vercel Environment Variables):
   ```env
   DATABASE_URL="postgresql://user:password@db-host:5432/crm?sslmode=require"
   ```
3. Run migration:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

### 2. Deploy to Vercel
1. Push your repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com/), click **Add New Project** and select your repository.
3. In **Environment Variables**, add:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_APP_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL, e.g. `https://my-whatsapp-crm.vercel.app`)
4. Click **Deploy**.
5. Once deployed, update your Meta Developer Webhook Callback URL to:
   `https://my-whatsapp-crm.vercel.app/api/webhook/whatsapp`

---

## 🛡️ Meta Messaging Policy & 24-Hour Customer Window

This CRM complies with official Meta WhatsApp Business Cloud API policies:
- **Customer Care Window**: When a customer sends a message to your WhatsApp number, a **24-hour service window** opens. Within this window, businesses can reply with freeform text messages.
- **Outside the 24-Hour Window**: Once 24 hours have elapsed since the customer's last message, Meta requires businesses to use pre-approved Message Templates to initiate conversations. The CRM chat window features a live indicator warning admins when the 24-hour window has expired.

---

## 🛠️ Troubleshooting

- **Webhook Verification 403 Forbidden**: Ensure the `WHATSAPP_VERIFY_TOKEN` in `.env` matches the token entered in Meta's Webhook configuration modal character-for-character.
- **`(#100) Invalid parameter` from Meta Graph API**: Verify that `WHATSAPP_PHONE_NUMBER_ID` is the numeric Phone Number ID from Meta Developer Console (not the WABA ID or business account ID).
- **Messages Stuck in `SENDING`**: In Simulator Mode, messages are immediately marked `SENT` with simulated IDs. In live mode, verify that your access token is valid and has not expired.
