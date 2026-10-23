# DriveX – Cloud File Manager and Sharing System

A responsive, Google Drive-inspired cloud file management website built with React, Node.js, Google Sheets API, and Google Drive API.

## Features

- **Admin Authentication** — Single admin login with secure session management
- **File Management** — Upload, download, preview, rename, move, and delete files
- **Folder Organization** — Create nested folders, drag-and-drop organization
- **Google Integration** — Google Sheets as database, Google Drive for file storage
- **WhatsApp Sharing** — Share files directly via WhatsApp with secure links
- **Responsive Design** — Works on mobile, tablet, and desktop

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React.js, Vite, Lucide React |
| Backend | Node.js, Express.js |
| Database | Google Sheets API |
| File Storage | Google Drive API |
| Authentication | Session-based & Bearer Admin Token |
| Deployment | Vercel (Unified Full-Stack or Split) |

---

## Deploy to Vercel (One-Click / Full-Stack)

The project is fully configured for Vercel deployment, supporting both frontend (Vite React) and backend (Express serverless functions) on the same domain with **zero CORS issues**.

### Step 1: Import Project to Vercel
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com](https://vercel.com) and click **"Add New"** -> **"Project"**.
3. Import your `cloud` repository.
4. Keep the **Root Directory** as `./` (default).
5. Build and output settings are automatically configured via `vercel.json` (`npm run build` -> `client/dist`).

### Step 2: Configure Environment Variables in Vercel
In the Vercel project configuration screen (or **Project Settings -> Environment Variables**), add the following variables:

| Variable Name | Description | Example / Note |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `SESSION_SECRET` | Secret key for tokens & sessions | Any long random string |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash for admin login | `$2a$10$qS0INoAz8ocSRYAdL1Gbuuf19WcNjgx4o/MybmSroScwFNmmwlSKu` (default: `mukesh188`) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheet ID | ID extracted from `/d/<ID>/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account Email from GCP | `drivex-sa@project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | GCP Service Account Private Key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` |
| `GOOGLE_DRIVE_FOLDER_ID` | Google Drive Root Folder ID | ID extracted from `/folders/<ID>` |

> **Note:** Ensure your Google Sheet and Google Drive folder are shared with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor**.

### Step 3: Deploy!
Click **Deploy**. Vercel will:
1. Install dependencies for both client and backend functions.
2. Build the Vite React frontend into `client/dist`.
3. Deploy the Express backend as a serverless function via `api/index.js` handling all `/api/*` endpoints.

---

## Local Development

### Prerequisites
- Node.js 18+
- Google Cloud Platform service account with Sheets and Drive APIs enabled
- A Google Spreadsheet shared with the service account
- A Google Drive folder shared with the service account

### Installation

```bash
npm run install:all
```

### Environment Setup

1. Copy `.env.example` to `server/.env` (or root `.env`)
2. Copy `client/.env.example` to `client/.env`
3. Fill in your Google API credentials and configuration

### Development

```bash
# Start both client and server simultaneously
npm run dev

# Or run them individually:
npm run dev:client   # Frontend only (http://localhost:5173)
npm run dev:server   # Backend only (http://localhost:5000)
```

### Default Admin Password
`mukesh188` (change in production)

## Project Structure

```
DriveX/
├── api/             # Vercel Serverless Function entry point (api/index.js)
├── client/          # React frontend (Vite)
├── server/          # Node.js/Express backend
├── vercel.json      # Vercel deployment configuration
├── package.json     # Root package.json managing workspaces and builds
└── README.md
```

## License
MIT
