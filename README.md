<h1 align="center">OptiDrive 🚀</h1>

<p align="center">
  <strong>A high-performance SaaS platform for dynamic media optimization, delivery, and storage.</strong>
</p>

<p align="center">
  <a href="https://optidrive.app/" target="_blank"><strong>🌐 Live Production: optidrive.app</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
</p>



https://github.com/user-attachments/assets/7910134b-387c-472a-930e-13f892f6e832



## 🧠 Architecture & Complexity

OptiDrive is built as a production-ready **Turborepo monorepo**, strictly separating frontend presentation, backend APIs, and shared business logic. It solves the complex challenge of on-the-fly media transformations while maintaining low latency and scalable storage architectures.

### Key Engineering Features

- **On-the-Fly Image Processing:** Real-time image manipulation (compression, resizing, dynamic SVG watermarking) executed directly in memory via an Express backend using `sharp`. Highly optimized to prevent Node.js event loop blocking during heavy I/O operations.
- **Advanced Frontend Media Editor:** A rich, interactive React-based UI utilizing HTML5 Canvas for real-time panning, zooming, cropping, and visual watermark placement directly in the browser (`MediaPreviewModal`).
- **Asynchronous Storage Migrations:** Custom-built background migration jobs allowing Enterprise users to seamlessly transfer media assets between OptiDrive's default storage and their own Bring Your Own Storage (BYOS) S3 buckets without downtime.
- **Multi-Tenant SaaS Architecture:** Robust Role-Based Access Control (RBAC) and isolated Workspaces. Features hard/soft quota limits tied directly to the billing cycle to prevent infrastructure abuse.
- **Automated Billing Pipeline:** Deep Stripe integration handling Checkout, Customer Portal, Webhook-based subscription synchronization (via cryptographically verified signatures), and automatic grace-period account locking for exceeded tiers.

## 🛠️ Infrastructure & Tech Stack

This project is deployed across a distributed micro-infrastructure designed for high availability and low egress costs.

| Component | Technology / Service |
| :--- | :--- |
| **Frontend** | React, Next.js (Hosted on **Vercel**) |
| **Backend** | Node.js, Express.js (Hosted on **Render**) |
| **Database** | PostgreSQL (Hosted on **Neon** serverless DB) |
| **ORM** | Prisma |
| **Storage & CDN** | **Cloudflare R2** (S3-compatible) + Cloudflare Reverse Proxy |
| **Payments** | **Stripe** API & Webhooks |
| **Authentication** | OAuth 2.0 (GitHub & Google) |
| **Transactional Email** | **Resend** (Prod) / Mailtrap (Dev) |
| **Package Manager** | `pnpm` + Turborepo |

<img width="1920" height="1080" alt="Знімок екрана з 2026-07-08 09-22-43" src="https://github.com/user-attachments/assets/807453f9-045e-40c3-993c-cf9d6ff52781" />

## 🚀 Getting Started

To run the OptiDrive monorepo locally for development:

### Prerequisites
- Node.js (v18+)
- `pnpm` installed globally
- PostgreSQL database (local or cloud)
- S3-compatible storage credentials (e.g., AWS or R2)

### Installation

1. **Clone the repository & install dependencies:**
   ```bash
   git clone https://github.com/Mik00000/OptiDrive.git
   cd OptiDrive
   pnpm install
   ```

2. **Environment Configuration:**
   Copy the example environment files and fill in your keys (Stripe, DB, OAuth, S3).
   ```bash
   cp .env.example .env
   # Or configure .env inside /apps/backend and /apps/frontend accordingly
   ```

3. **Database Setup:**
   Run Prisma migrations and generate the client types.
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

4. **Start the Development Servers:**
   Launch both the Next.js frontend and Express backend concurrently.
   ```bash
   pnpm turbo dev
   ```

<img width="1920" height="1080" alt="Знімок екрана з 2026-07-08 09-24-20" src="https://github.com/user-attachments/assets/df17aa5f-7acf-4977-9acd-e34ec597fc5a" />
