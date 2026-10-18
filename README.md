<h2 align="center">Diary AI</h2>
<p align="center">
	<img src="images/logo.png" width="80" alt="Diary-AI Logo">
</p>

**A private, AI-assisted diary for capturing personal reflections, understanding patterns, and preserving entries through backup and restore.**

Diary AI is a full-stack TypeScript application built with Next.js, React, PostgreSQL, and Prisma. The current source includes diary entry management, voice transcription, AI-assisted entry cleanup and analysis, trend reports, text-to-speech narration, account security and recovery workflows, Google Drive backup/restore, and a Windows desktop application built with Electron and an embedded PostgreSQL runtime.

## Contents
- [Features](#features)
- [System Demo](#system-demo)
- [Architecture](#architecture)
- [Prerequisites](#PREREQUISITES)
- [Configure Diary AI](#configure-diary-ai)
- [Roadmap](#roadmap)
- [Source Code Setup](#local-development-setup)
- [Configure Web Development](#configure-web-development)
- [Requirements](#requirements)
- [License](#license)

# Features
### (i). Diary and AI
- Create, view, edit, and delete diary entries.
- Store text entries and voice-origin entries, with an original transcript field and a cleaned entry field.
- Record audio in the browser and submit it for transcription through the configured [Cohere tts](https://docs.cohere.com/reference/about) API integration.
- Request AI-assisted cleanup of diary content.
- Generate structured entry analysis, including summaries, mood labels and confidence, topics, important events, action items, and recommendations when returned by the configured model.
- Generate and display trend reports across diary entries.
- Respect per-account privacy preferences for voice transcription, AI processing, and AI trend analysis.
- Use responsive forms, loading states, status feedback, error boundaries, and reusable UI components.

### (ii). Text-to-speech
- Includes a [Sherpa-ONNX](https://k2-fsa.github.io/sherpa/onnx/tts/all/) WebAssembly-based TTS engine and related voice, segmentation, PCM playback, and WAV conversion utilities.
- Provides listen/narration controls and a narration modal.
- TTS runs through the local application assets rather than requiring every narration request to be sent to Cohere.

### (iii). Accounts and recovery
- Account registration and credentials-based login using Auth.js / NextAuth and password hashing with `bcryptjs`.
- Account profile editing and password changes.
- JWT session validation with a database-backed `sessionVersion` check to support invalidating older sessions when the version changes.
- Multi-step account recovery routes for Google verification, backup verification, email OTP verification, and password reset.
- OTP attempt and send-count fields, expiry timestamps, and recovery-session expiry data in the database schema.
- Separate portable-account-restore sessions for restoring an account/diary onto another installation.

### (iv). Backup and Google Drive
- Backup export and encrypted-export routes.
- Backup verification routes.
- Google Drive connection and disconnection flows.
- Google Drive backup listing/restore, restore planning, and verification endpoints.
- Restore account preview, backup selection, email verification, and portable restore flows.
- Encryption helpers for Google tokens and backup payloads.

### (v). Polished UI/UX
- Dark/Light/System theme toggle available
- Clear fonts, colors, text and navigation.


## SYSTEM DEMO
![Diary AI](images/1.png)

![Diary AI](images/1b.png)


![Diary AI](images/2a.png)


![Diary AI](images/2.png)


![Diary AI](images/2b.png)


![Diary AI](images/2c.png)


![Diary AI](images/2d.png)


![Diary AI](images/2e.png)


![Diary AI](images/2f.png)

![Diary AI](images/2g.png)


![Diary AI](images/2h.png)


![Diary AI](images/2i.png)


![Diary AI](images/4.png)

![Diary AI](images/5.png)


![Diary AI](images/6.png)


![Diary AI](images/7.png)

![Diary AI](images/8.png)

![Diary AI](images/9.png)


![Diary AI](images/10.png)

![Diary AI](images/11.png)


![Diary AI](images/12.png)


![Diary AI](images/13.png)


![Diary AI](images/14.png)


![Diary AI](images/15.png)


![Diary AI](images/16.png)


![Diary AI](images/17.png)

![Diary AI](images/18.png)


![Diary AI](images/19.png)


![Diary AI](images/20.png)


![Diary AI](images/21.png)

![Diary AI](images/22.png)


![Diary AI](images/23.png)


![Diary AI](images/24.png)

![Diary AI](images/25.png)


![Diary AI](images/26.png)


## Technology stack

| Area                      | Technology                         | Role                                                                  |
| ------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| Language                  | TypeScript, JavaScript             | Application and desktop code                                          |
| UI                        | React 19                           | Component-based interface                                             |
| Web framework             | Next.js 16.3.3                     | Routing, server/client components, API routes, production server      |
| CSS                       | Tailwind CSS 4, PostCSS            | Responsive interface styling                                          |
| Runtime / package manager | Node.js, npm                       | Development and build runtime; dependency installation                |
| Database                  | PostgreSQL                         | Relational storage                                                    |
| ORM                       | Prisma 7.10.0                      | Typed data access and schema/migration tooling                        |
| PostgreSQL adapter        | `@prisma/adapter-pg`, `pg`         | Prisma's PostgreSQL connection                                        |
| Authentication            | Auth.js / `next-auth` v5 beta      | Credentials authentication and JWT sessions                           |
| Password hashing          | `bcryptjs`                         | Password hash verification and hashing                                |
| Validation                | Zod 4                              | Runtime validation                                                    |
| AI integration            | Cohere API                         | AI processing and transcription integration used by configured routes |
| Google integration        | `googleapis`                       | OAuth and Google Drive operations                                     |
| Email                     | Nodemailer                         | SMTP mail delivery for recovery flows                                 |
| Desktop shell             | Electron 44                        | Windows desktop runtime                                               |
| Embedded database         | `embedded-postgres` 18.4.0-beta.17 | Local PostgreSQL runtime for desktop                                  |
| Desktop packaging         | Electron Builder 26                | NSIS Windows installer                                                |
| TTS                       | Sherpa-ONNX WebAssembly assets     | Local/Offline narration engine                                        |
| Linting / types           | ESLint 9, TypeScript 5.9           | Static checks and type safety                                         |
| CI                        | GitHub Actions                     | Windows installer build and artifact/release workflow                 |

## Architecture

### Web application
```text
Browser
  |
  v
Next.js App Router
  ├── Pages and React components
  ├── Server actions
  └── API routes
         |
         v
  Domain schemas (Zod)
         |
         v
  Services / application logic
         |
         v
  Repositories
         |
         v
  Prisma Client + PostgreSQL
```

### External integrations
```text
Diary AI application
  ├── Cohere API
  │     └── Configured AI / transcription operations
  ├── Google OAuth + Google Drive API
  │     └── Backup, restore, and recovery verification
  ├── SMTP provider through Nodemailer
  │     └── Recovery email OTP
  └── Sherpa-ONNX WebAssembly
        └── Local text-to-speech narration
```

### Desktop startup
```text
Electron main process
  ├── Load persistent desktop runtime configuration
  ├── Initialize/start embedded PostgreSQL
  ├── Create diary_ai database if missing
  ├── Construct DATABASE_URL for the local database
  ├── Apply committed Prisma migrations
  ├── Start Next.js standalone server on localhost:3210
  └── Open the login page in a desktop window
```

In the current `electron/main.ts`, the desktop HTTP port defaults to `3210`, while PostgreSQL uses a separately selected local port. `APP_HOST` is `127.0.0.1`; the application URL and OAuth callbacks use `localhost`. 

### Database configuration
- `electron/main.ts` constructs `DATABASE_URL` dynamically for its embedded PostgreSQL process. Do not add the web development database URL to the desktop `.env` without a specific reason grounded in the current implementation.

## Repository layout
```text
.
├── app/
│   ├── (authenticated)/
│   │   ├── dashboard/
│   │   ├── entries/
│   │   ├── settings/
│   │   └── trends/
│   ├── actions/
│   ├── api/
│   │   ├── account/
│   │   ├── ai/
│   │   ├── auth/recovery/
│   │   ├── backup/
│   │   ├── entries/
│   │   ├── google-drive/
│   │   ├── register/
│   │   ├── restore/
│   │   ├── settings/
│   │   └── transcribe/
│   ├── login/
│   ├── recover/
│   ├── register/
│   └── restore/
├── components/
│   ├── auth/
│   ├── branding/
│   ├── diary/
│   ├── navigation/
│   ├── restore/
│   ├── settings/
│   ├── theme/
│   ├── tts/
│   └── ui/
├── domain/
│   ├── ai/
│   ├── auth/
│   ├── backup/
│   ├── diary/
│   └── settings/
├── electron/
│   └── main.ts
├── lib/
│   ├── auth/
│   ├── backup/
│   ├── email/
│   ├── google/
│   ├── tts/
│   └── ...
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── repositories/
├── services/
├── scripts/
│   └── prepare-desktop.mjs
├── public/
│   └── tts/sherpa/
│   └── images/favicons/
├── workers/
├── build/
│   └── icon.ico
├── .github/workflows/
│   └── build-windows.yml
├── auth.ts
├── auth.config.ts
├── next.config.ts
├── prisma.config.ts
├── package.json
├── package-lock.json
├── electron-builder.yml
├── tsconfig.json
└── tsconfig.electron.json
```

Some directories contain additional files beyond those illustrated above. Generated Prisma client output is written to `generated/prisma/` and is excluded by the repository's `.gitignore`; it is regenerated during setup/build.

## PREREQUISITES
## Configure Diary-AI
### 1. Create `.env`
- Diary AI application loads `.env` from its Electron user-data directory. The current `electron/main.ts` uses port `3210` by default, starts its own embedded PostgreSQL instance, and generates/persists these runtime secrets in `desktop-runtime.json` when that file does not already exist
- For this Windows install, the desktop `.env` is typically located at:
```text
%APPDATA%\Diary AI\.env
```

- To create an empty `.env`, open `Terminal` and run the command below. Ensure you're inside Drive C:
  ```bash
  if not exist "%APPDATA%\Diary AI" mkdir "%APPDATA%\Diary AI" & type nul > "%APPDATA%\Diary AI\.env"
  ```

> [!NOTE]
> To locate the `.env` file, navigate to: C:\Users\<YourWindowsUsername>\AppData\Roaming\Diary AI\ .env

- Copy-paste the contents of the sample `.env` below to your `.env`:
```dotenv
# The desktop main process generates DATABASE_URL dynamically.
# Do not set the web-development DATABASE_URL here.

AUTH_SECRET=""
AUTH_TRUST_HOST=true

COHERE_API_KEY="YOUR_COHERE_API_KEY"

GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"

GOOGLE_RESTORE_REDIRECT_URI="http://localhost:3210/api/restore/google/callback"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3210/api/google-drive/callback"
GOOGLE_RECOVERY_REDIRECT_URI="http://localhost:3210/api/auth/recovery/google/callback"

GOOGLE_TOKEN_ENCRYPTION_KEY="YOUR_BASE64_32_BYTE_KEY"
GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY=""

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="YOUR_DEDICATED_GMAIL@gmail.com"
SMTP_APP_PASSWORD="YOUR_GOOGLE_APP_PASSWORD"
SMTP_FROM_NAME="Diary AI"

RECOVERY_OTP_SECRET=""
```

> [!IMPORTANT]
> Empty `AUTH_SECRET`, `RECOVERY_OTP_SECRET`, and `GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY` values are intentional only because the desktop main process falls back to the persistent generated values for those keys. 

> [!CAUTION]
> Do not delete `desktop-runtime.json` casually: the existing PostgreSQL password and encryption/authentication secrets are tied to the user's local installation.

### 2. Generate application secrets
Run these commands in PowerShell from the project directory. They generate values locally.
> [!NOTE]
> - This step may require you to install Node.js. 
> - If not already installed, Install Node.js from the official download page: <https://nodejs.org/en/download>.
> - Once installed, open terminal and change directory to git-cloned directory `Diary-AI`

- Ensure it is added to [`PATH`](https://gist.github.com/ScribbleGhost/752ec213b57eef5f232053e04f9d0d54), close and reopen PowerShell, and run:
```powershell
node --version
npm --version
```
### Google token encryption key
- Run the command below to generate the `GOOGLE_TOKEN_ENCRYPTION_KEY` and copy-paste the key inside the `.env`:
```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

- This produces Base64 for 32 random bytes. Use it for `GOOGLE_TOKEN_ENCRYPTION_KEY` only if that code path expects Base64-encoded 32-byte material. 

### 3. Configure Google OAuth and Drive
Google OAuth is used by the Drive connection, backup/restore, and account-recovery flows. The project defines three callback routes per environment. To configure it:
#### 1. Create a Google Cloud project
1. Open <https://console.cloud.google.com/>.
2. Create or select a project dedicated to `Diary AI`.
3. Open **APIs & Services → Library**.
4. Enable **Google Drive API**.

#### 2. Configure OAuth consent
In **Google Auth Platform** (or **APIs & Services → OAuth consent screen**, depending on the console UI):
![Configure Google Oauth|496](images/google-oauth.png)
1. Set the app name `Diary AI` and support/developer contact email.
2. Select the audience appropriate for testing and release.
3. Add tester Google accounts.
4. Review the requested OAuth scopes and request only the access needed by the app.
5. Complete required branding or verification steps.

#### 3. Create OAuth credentials
1. Open **Google Auth Platform → Clients** or **APIs & Services → Credentials**.
2. Create an OAuth client ID of type **Web application** for the current localhost callback architecture.
3. Add `http://localhost:3000` as an authorized JavaScript origin if the Google OAuth flow used by the app requires it.
4. Add these exact URIs to the same OAuth client (as used in the`.env`):
```text
http://localhost:3210/api/restore/google/callback
http://localhost:3210/api/google-drive/callback
http://localhost:3210/api/auth/recovery/google/callback
```

6. Save and copy the client ID and secret into the `.env` file.

#### 4. Configure the environment
```dotenv
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3000/api/google-drive/callback"
GOOGLE_RECOVERY_REDIRECT_URI="http://localhost:3000/api/auth/recovery/google/callback"
GOOGLE_RESTORE_REDIRECT_URI="http://localhost:3000/api/restore/google/callback"
```

### 5. Configure Cohere
1. Create/sign in to a Cohere account at <https://dashboard.cohere.com/>.
2. Open the API key section and create/copy a key for Diary AI.
3. Add it to the `.env` file:
```dotenv
COHERE_API_KEY="YOUR_COHERE_API_KEY"
```

> [!NOTE]
>  Cohere features require internet connectivity and are subject to the provider's model availability, rate limits, account settings, and pricing. Choose the free trial API Key.

### 6. Configure Gmail SMTP
- The project uses Nodemailer and SMTP settings for recovery email delivery. 
- A Gmail App Password is different from the normal Google account password.
1. Sign in to the Google account (`your-dedicated-account`) that will send recovery messages.
2. Enable 2-Step Verification.
3. Open <https://myaccount.google.com/apppasswords>.
4. Create an app password for Diary AI. The exact Google UI may change.
5. Copy the generated password and replace the value for `SMTP_APP_PASSWORD` 
6. Configure:
```dotenv
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="your-dedicated-account@gmail.com"
SMTP_APP_PASSWORD="YOUR_GOOGLE_APP_PASSWORD"
SMTP_FROM_NAME="Diary AI"
```

- Your final `.env` file should look something like this:
```dotenv
# The desktop main process generates DATABASE_URL dynamically.
# Do not set the web-development DATABASE_URL here.

AUTH_SECRET=""
AUTH_TRUST_HOST=true

COHERE_API_KEY="cH8vN2qR7mK4xP9wT6jF3bL5sD1aY0uE"

GOOGLE_CLIENT_ID="108765432109-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-aB7cD9eF2gH4jK6mN8pQ1rS3"

GOOGLE_RESTORE_REDIRECT_URI="http://localhost:3210/api/restore/google/callback"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3210/api/google-drive/callback"
GOOGLE_RECOVERY_REDIRECT_URI="http://localhost:3210/api/auth/recovery/google/callback"

GOOGLE_TOKEN_ENCRYPTION_KEY="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY=""

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="diary.ai.test@gmail.com"
SMTP_APP_PASSWORD="qwer tyui opas dfgh"
SMTP_FROM_NAME="Diary AI"

RECOVERY_OTP_SECRET=""
```


> [!WARNING]
> The values in `.env` directly above are dummy values, not actual working credentials.

### 7. Install Diary-AI-Setup-0.1.0-x64.exe
- Ensure you have enough space before downloading the official setup file as it's considerably large ~`730mb`.
- Download the official release zip file [here](https://github.com/Lewismwaz/Diary-AI/releases/download/%23Diary-AI-v0.0.1/Diary-AI-Setup-v0.1.0-x64.zip). 
- `Extract here` the downloaded file `Diary-AI-Setup-v0.1.0-x64.zip` and open the extracted folder `Diary-AI-Setup-v0.1.0-x64`.
- Run the package installer `Diary-AI-Setup-0.1.0-x64` from the root directory of the extracted folder.
- Click `Next` then `Install` and keep the `Destination Folder` as is.
![Diary AI Install](images/installation.png)

> [!CAUTION]
> - Do not delete `desktop-runtime.json` as a routine troubleshooting step.
> - Do not delete `postgres-data` without a verified backup and a clear understanding that it contains the local diary database.
>  - Back up the whole user-data directory before destructive maintenance.
>   - Keep runtime configuration and database data together; the database password and encryption keys must remain consistent.

- The installer is configured not to remove user data on uninstall. This is intentional to avoid accidental data loss.

## Local Development Setup
## Requirements
For web development on Windows 10/11 you need to have:
- Git for Windows.
- Node.js 24 (the included GitHub Actions workflow uses Node.js 24).
- npm, included with Node.js.
- PostgreSQL supported by the Prisma configuration.
- pgAdmin 4 (optional GUI).
- Google Cloud OAuth credentials for Google Drive and Google recovery flows.
- Cohere API key for the AI routes that use Cohere.
- Gmail App Password or another supported SMTP configuration for email OTP.
- VS Code or Sublime Text.

Install Node.js from the official download page: <https://nodejs.org/en/download>. Remember to add it to [`PATH`](https://gist.github.com/ScribbleGhost/752ec213b57eef5f232053e04f9d0d54).

Open a new PowerShell window and verify:
```powershell
node --version
npm --version
git --version
```

The project's CI workflow currently selects Node.js `24`. Prefer that major version for reproducible builds unless the project is deliberately updated and tested on another supported version.

## Get the source and install dependencies

### Clone the repository
```powershell
git clone https://github.com/Lewismwaz/Diary-AI.git
cd Diary-AI
```

- If `git` isn't installed, download zip of this repository [here](https://github.com/Lewismwaz/Diary-AI/archive/refs/heads/main.zip)

### Extra Resources
- Download the `Sherpa-onx TTS` zip file containing `Diary AI code` and `custom tts data` from [here](https://drive.google.com/drive/folders/1NJGM10quNGZMbN-_OsEET4JapTELpNdH?usp=drive_link)
- Extract the zip file to `Diary-AI/public` so that now it now contains:
```
├── public/
	└── tts/sherpa/
		└──sherpa-onnx-tts.js
		└──sherpa-onnx-tts.worker.js
		└──sherpa-onnx-wasm-main-tts.js
		└──sherpa-onnx-wasm-main-tts.data
	└── images/
```

### Install all npm dependencies
Inside your `Diary-AI` directory, run:
```powershell
npm ci
```

This downloads and installs the dependency tree into `node_modules/`. It does not download the source repository; `git clone` does that. `npm ci` is the preferred clean install when a committed lockfile is present.

> [!TIP]
> If you intentionally change dependencies, run `npm install`, inspect the updated lockfile, test the app, and commit `package.json` and `package-lock.json` together.

### Git ignore
The current archive's `.gitignore` excludes `node_modules`, `.next`, `.env`, `.env.local`, generated Prisma output, logs, and `.DS_Store`.:
```gitignore
# Dependencies and generated output
node_modules/
.next/
generated/prisma/
dist/
release/

# Environment files (commit only a deliberately sanitized template)
.env
.env.*

# Logs and local user data
*.log
.DS_Store
desktop-runtime.json
postgres-data/
```


## Configure web development
### 1. Install PostgreSQL
Download the official Windows installer from <https://www.postgresql.org/download/windows/>. During setup, note the password assigned to the `postgres` role and the port (usually `5432`). Install pgAdmin 4 if needed: <https://www.pgadmin.org/download/>.

### 2. Create the database
In pgAdmin:
1. Connect to your local PostgreSQL server.
2. Expand **Servers → your server → Databases**.
3. Right-click **Databases → Create → Database**.
4. Enter `diary_ai` as the database name.
5. Save.

Or use `psql` if it is installed and on `PATH`:
```powershell
psql --version
psql -h localhost -p 5432 -U postgres -d postgres
```

At the `psql` prompt:
```sql
CREATE DATABASE diary_ai;
```

If the database already exists, do not create it again. Type `\q` to exit `psql`.

> [!IMPORTANT]
> Take note of the `Password` you use to create the database inside PgAdmin

### 3. Generate Prisma Client and apply schema migrations
```powershell
npm run db:generate
npm run db:migrate -- --name init
```

Use `npm run db:migrate -- --name init` only when creating the initial development migration for a new database/schema history. If the repository already contains migrations and the database is new, apply the committed migrations with:

```powershell
npx prisma migrate deploy
```

> [!NOTE]
> Do not use `migrate dev --name init` against an existing project database with migration history. Never reset or delete a database containing important diary entries without first making and verifying a backup.

### 4. Create local `.env`
- Inside the project root create `.env`. 
- The app needs a PostgreSQL connection string and the provider variables for the features you intend to test. 
- Your current `.env` file should have the following environment variables:
```dotenv
# Local PostgreSQL for web development
DATABASE_URL="postgresql://postgres:URL_ENCODED_PASSWORD@localhost:5432/diary_ai"

# Auth.js
AUTH_SECRET="GENERATE_A_UNIQUE_RANDOM_SECRET"
AUTH_TRUST_HOST=true

# Cohere AI
COHERE_API_KEY="YOUR_COHERE_API_KEY"

# Google OAuth / Drive
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3000/api/google-drive/callback"
GOOGLE_RECOVERY_REDIRECT_URI="http://localhost:3000/api/auth/recovery/google/callback"
GOOGLE_RESTORE_REDIRECT_URI="http://localhost:3000/api/restore/google/callback"

# Google token encryption
GOOGLE_TOKEN_ENCRYPTION_KEY="GENERATE_A_BASE64_32_BYTE_KEY"
GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY="GENERATE_A_LONG_RANDOM_KEY"

# SMTP / Gmail
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="YOUR_DEDICATED_GMAIL@gmail.com"
SMTP_APP_PASSWORD="YOUR_GOOGLE_APP_PASSWORD"
SMTP_FROM_NAME="Diary AI"

# Recovery OTP secret
RECOVERY_OTP_SECRET="GENERATE_A_LONG_RANDOM_SECRET"
```

### URL-encode PostgreSQL passwords
Reserved characters in the password portion of a PostgreSQL URL must be percent-encoded. Common examples:

| Character | URL-encoded |
|---|---|
| `$` | `%24` |
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `#` | `%23` |
| `%` | `%25` |

- Encode the password portion only. 

> [!IMPORTANT]
>For instance, if your Postgresql password is `$2027@Diary#AI` then encoded password is `%242027%40Diary%23AI` and thus full `DATABASE_URL` value would be `postgresql://postgres:%242027%40Diary%23AI@localhost:5432/diary_ai`

### Generate application secrets
Run these commands in PowerShell from the project directory. They generate values locally.
### a) Auth.js secret
```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use the result for the web `AUTH_SECRET`. Generate a different secret per environment. The desktop build generates and persists its own secret if `AUTH_SECRET` is empty.

### b) Recovery OTP secret
```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use this for the web `RECOVERY_OTP_SECRET` if the recovery implementation expects a 64-character hex value. Desktop mode generates this secret automatically when the environment variable is empty.

### c) Google token encryption key
```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

This produces Base64 for 32 random bytes. Use it for `GOOGLE_TOKEN_ENCRYPTION_KEY` only if that code path expects Base64-encoded 32-byte material. Verify the implementation before rotating the key; previously encrypted tokens may become unreadable after a key change.

### d) Restore-token encryption key
For a service expecting a 64-character hexadecimal key:
```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The current desktop main process generates a persistent 32-byte hex key for restore-token encryption when its environment value is empty. For web deployment, follow the exact format expected by `lib/google/google-restore-token-crypto.ts`.

> [!IMPORTANT]
> Confirm each key's required encoding/length against the corresponding encryption helper before setting it. In particular, `GOOGLE_TOKEN_ENCRYPTION_KEY` and `GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY` serve separate code paths and should not be assumed interchangeable.


#### Configure Google OAuth and Drive
Google OAuth is used by the Drive connection, backup/restore, and account-recovery flows. The project defines three callback routes per environment.

##### 1. Create a Google Cloud project
1. Open <https://console.cloud.google.com/>.
2. Create or select a project dedicated to Diary AI.
3. Open **APIs & Services → Library**.
4. Enable **Google Drive API**.

##### 2. Configure OAuth consent
In **Google Auth Platform** (or **APIs & Services → OAuth consent screen**, depending on the console UI):
1. Set the app name and support/developer contact email.
2. Select the audience appropriate for testing and release.
3. Add tester Google accounts if the app remains in testing mode.
4. Review the requested OAuth scopes and request only the access needed by the app.
5. Complete required branding or verification steps before wider release.

##### 3. Create OAuth credentials
1. Open **Google Auth Platform → Clients** or **APIs & Services → Credentials**.
2. Create an OAuth client ID of type **Web application** for the current localhost callback architecture.
3. Add `http://localhost:3000` as an authorized JavaScript origin if the Google OAuth flow used by the app requires it.
4. Add the following **Authorized redirect URIs** for web development:
```text
http://localhost:3000/api/google-drive/callback
http://localhost:3000/api/auth/recovery/google/callback
http://localhost:3000/api/restore/google/callback
```

5. Save and copy the client ID and secret into the relevant `.env` file.
The `redirect_uri` in an OAuth request must match a registered URI exactly: scheme, hostname, port, path, and trailing slash.

##### 4. Configure the environment
```dotenv
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3000/api/google-drive/callback"
GOOGLE_RECOVERY_REDIRECT_URI="http://localhost:3000/api/auth/recovery/google/callback"
GOOGLE_RESTORE_REDIRECT_URI="http://localhost:3000/api/restore/google/callback"
```

### Configure Cohere
1. Create/sign in to a Cohere account at <https://dashboard.cohere.com/>.
2. Open the API key section and create/copy a key for Diary AI.
3. Add it to the correct environment file:
```dotenv
COHERE_API_KEY="YOUR_COHERE_API_KEY"
```

4. Restart the web server or desktop application after changing the environment.
5. Test the AI feature that calls Cohere and inspect server-side logs for provider errors.

> [!NOTE]
> Cohere features require internet connectivity and are subject to the provider's model availability, rate limits, account settings, and pricing. Never expose the key to the browser or commit it to Git.

### Configure Gmail SMTP
The project uses Nodemailer and SMTP settings for recovery email delivery. A Gmail App Password is different from the normal Google account password.
1. Sign in to the Google account that will send recovery messages.
2. Enable 2-Step Verification.
3. Open <https://myaccount.google.com/apppasswords>.
4. Create an app password for Diary AI. The exact Google UI may change.
5. Copy the generated password and use the format accepted by the SMTP transport.
6. Configure:
```dotenv
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="your-dedicated-account@gmail.com"
SMTP_APP_PASSWORD="YOUR_GOOGLE_APP_PASSWORD"
SMTP_FROM_NAME="Diary AI"
```

Port `465` normally uses implicit TLS; use the mode expected by `lib/email/smtp-transport.ts`. If Google does not offer App Passwords, review the account's 2-Step Verification status and any account/organization security restrictions.

Use a dedicated sender account where possible. For production, also consider delivery monitoring, rate limiting, abuse prevention, and a transactional email provider.

Now your final `.env` should look something like this:
```dotenv
# Local PostgreSQL for web development
DATABASE_URL="postgresql://postgres:Kifaru%402026%23Db@localhost:5432/diary_ai"

# Auth.js
AUTH_SECRET="v3JmQ8xLp2Nw7Kz5R4hY9cTa6Fud1BsE0GgXo3iVn8pWq2rL"
AUTH_TRUST_HOST=true

# Cohere AI
COHERE_API_KEY="cH8vN2qR7mK4xP9wT6jF3bL5sD1aY0uE"

# Google OAuth / Drive
GOOGLE_CLIENT_ID="108765432109-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-aB7cD9eF2gH4jK6mN8pQ1rS3"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3000/api/google-drive/callback"
GOOGLE_RECOVERY_REDIRECT_URI="http://localhost:3000/api/auth/recovery/google/callback"
GOOGLE_RESTORE_REDIRECT_URI="http://localhost:3000/api/restore/google/callback"

# Google token encryption
GOOGLE_TOKEN_ENCRYPTION_KEY="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY="N7pQ4xL9vR2mK8wT5yH3cF6jD1sA0uE7bG4zX9nM2kP5rW8"

# SMTP / Gmail
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="diary.ai.test@gmail.com"
SMTP_APP_PASSWORD="qwer tyui opas dfgh"
SMTP_FROM_NAME="Diary AI"

# Recovery OTP secret
RECOVERY_OTP_SECRET="R8kW2mN5vX9pL3qT7yH4cD6jF1sA0uE8bG5zK9rM2wP7nQ"
```

> [!WARNING]
> The Environment variables directly above are just dummy values. Do not paste them into your `.env` file.


> [!CAUTION]
> ### Secret-handling rules
> - Do not send real secrets in support requests, screenshots, issue reports, or AI chat messages.
> - Do not reuse one key for unrelated purposes.
>  - Store a secure copy of encryption keys if the app requires them to decrypt stored data.
>   - Do not rotate encryption keys casually after encrypting persistent tokens.
>    - Keep `.env`, desktop runtime configuration, and user-data directories out of Git.

### 5. Run the application
```powershell
npm run dev
```

Open <http://localhost:3000>. The root page redirects unauthenticated users to `/login`.


### 6. Prisma Client, migrations, and Studio
- Prisma is the ORM and schema/migration toolkit. PostgreSQL is the database.
- Use commands below to execute various database operations:
```powershell
# Generate the client from prisma/schema.prisma
npm run db:generate

# Create/apply a development migration
npm run db:migrate -- --name describe_your_change

# Apply committed migrations in a deployment
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Seed development data
npm run db:seed
```

When changing the schema:
1. Edit `prisma/schema.prisma`.
2. Create a named development migration.
3. Review the generated migration SQL.
4. Commit the migration directory.
5. Regenerate Prisma Client and run the relevant tests/build.

> [!WARNING]
> Do not edit already-applied migration files to rewrite database history.

Prisma Studio opens a local browser interface to inspect and edit database records. Treat it as a privileged administration tool and close it when finished.

The project uses Prisma 7 configuration in `prisma.config.ts`, and the schema writes generated client files to `generated/prisma/`. The generated output is ignored by Git and should be regenerated by the project commands.


### 7. Run and validate the web app
Useful scripts defined in the current `package.json`:
```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
```

A recommended clean setup/build sequence for web development is:
```powershell
npm ci
npm run db:generate
npm run lint
npm run build
```

`npm run build` runs `next build --webpack`. Fix the first substantive TypeScript, lint, Prisma, or build error. Distinguish warnings from errors and retest the affected route or feature.

### 8. Build the Windows desktop installer
The current `package.json` defines these desktop scripts:
```powershell
npm run desktop:compile
npm run desktop:prepare
npm run desktop:dist
```

### What each script does
- `desktop:compile`: compiles the Electron TypeScript project using `tsconfig.electron.json`.
- `desktop:prepare`: generates Prisma Client, builds Next.js in standalone mode, and runs `scripts/prepare-desktop.mjs` to copy static and public assets into `.next/standalone`.
- `desktop:dist`: runs the desktop preparation step, compiles the Electron main process, then invokes Electron Builder for a 64-bit Windows NSIS installer.

The desktop preparation script calls Prisma generation and `npm run build` itself. Running `npm run db:generate` or `npm run build` first is generally unnecessary unless you are debugging a particular stage.

Electron Builder is configured in `electron-builder.yml` to output to `release/`. The artifact name is configured as:
```text
Diary-AI-Setup-${version}-x64.exe
```

The exact version segment comes from `package.json`. Check the build log and `release/` directory for the generated installer.

### 9. Packaging configuration notes
The current packaging configuration:
- Uses app ID `com.diaryai.desktop`.
- Names the product `Diary AI`.
- Targets Windows x64 and NSIS.
- Uses `build/icon.ico`.
- Sets `asar: false` while filesystem-dependent runtime files are packaged outside ASAR.
- Includes the Electron main process, Prisma schema/migrations/generated client, Next standalone output, and required Prisma/embedded-Postgres dependencies.
- Sets `deleteAppDataOnUninstall: false`, preserving the user's local database and runtime secrets when the application is uninstalled.

Test the installer on a clean Windows account or virtual machine that does not have Node.js or PostgreSQL installed. Verify first launch, account creation/login, database persistence across restarts, Google Drive callbacks, recovery email, and backup restore.

## Roadmap
These features are planned and are **not represented as completed** by this README.
### 1. Automatic idle lock
- Lock the diary after a configurable period of inactivity.
- Require reauthentication before private content is revealed again.
- Handle browser tab switching, application backgrounding, desktop focus changes, and session expiry.
- Preserve unsaved work safely during lock transitions.
- Test timer edge cases, multiple tabs/windows, app resume, expired sessions, and lock bypass attempts.

### 2. Fingerprint biometric authentication
- Support fast sign-in/unlocking on compatible Android devices and fingerprint-enabled laptops, including Windows Hello where supported.
- Use platform authentication APIs and/or WebAuthn/passkeys instead of collecting or storing raw fingerprint data.
- Keep password authentication as a fallback.
- Design recovery when a biometric credential is removed or unavailable.
- Distinguish browser WebAuthn/passkeys from native biometric prompts in a Capacitor app; platform capabilities and integration paths differ.

### 3. Security and privacy hardening
- Review session management, account recovery, expiry, replay prevention, and session invalidation.
- Audit all pages, server actions, and APIs for correct ownership/authorization.
- Prevent lock bypasses and unintended exposure through client state, errors, logs, responses, and local storage.
- Review backup encryption, integrity verification, key management, and restore safety.
- Add automated regression tests for authentication, authorization, recovery, throttling, and restore workflows.
- Review dependencies and production deployment settings.

### 4. Android deployment with Capacitor
- Package the shared React experience for Android using Capacitor after validating compatibility with the Next.js server features and deployment model.
- Define device-local storage and offline behavior.
- Use secure Android credential storage.
- Integrate biometrics where supported, with password fallback.
- Test installation, upgrades, permissions, app lifecycle, offline use, backup/restore, and production builds.
- Generate signed APK/AAB artifacts and document signing-key backup and release management.

### Additional quality goals
- Automated unit, integration, and end-to-end tests.
- CI checks for lint, type safety, database migrations, build, and security regressions.
- Accessibility and performance testing.
- Clear documentation for AI data processing, backup recovery, local data ownership, and account deletion.

## License
This project is licensed under the GNU License. View License [here](https://github.com/Lewismwaz/Diary-AI/blob/main/LICENSE).  
More details about the MIT License can be found [here.](https://choosealicense.com/licenses/mit/)

## Contact
For any inquiries, please contact:
- Email - <eappointmaster@gmail.com> or <yavotu@gmail.com>
- GitHub - [@Lewismwaz](https://github.com/Lewismwaz)  or [@Yavotu](https://github.com/Yavotu)

[Diary AI](https://github.com/Lewismwaz/Diary-AI) **©** 2026, All Rights Reserved
