# Setup & Runbook

This file documents the one-time setup steps for OAuth providers, local development,
Vercel deployment, and the npm publishing pipeline. Read this when you need to:

- Stand up a new environment (local or preview).
- Add a new OAuth credential.
- Rotate a secret.
- Cut a new release of `hagit-cli`.

---

## 1. OAuth Provider Setup

The web app supports Google and GitHub. Each provider requires a client application to be
registered at their respective developer console. The redirect URI (also called
"callback URL") for each provider is:

```
https://hagithub.vercel.app/api/auth/callback/<provider-id>
```

`provider-id` is `google` or `github`. For local development, also register:

```
http://localhost:3000/api/auth/callback/<provider-id>
```

### 1.1 Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select (or create) a project.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Name: `haGIT`.
6. Authorized redirect URIs: add both the production and localhost URLs above.
7. Copy **Client ID** → `AUTH_GOOGLE_ID`.
8. Copy **Client Secret** → `AUTH_GOOGLE_SECRET`.

Docs: <https://support.google.com/cloud/answer/6158849>

### 1.2 GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. **OAuth Apps → New OAuth App**.
3. Application name: `haGIT`.
4. Homepage URL: `https://hagithub.vercel.app`.
5. Authorization callback URL: the GitHub callback URL above.
6. Copy **Client ID** → `AUTH_GITHUB_ID`.
7. Generate a client secret → `AUTH_GITHUB_SECRET`.

Docs: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app>

---

## 2. Local Development

### Prerequisites
- Node.js 20+ (matches Vercel's runtime).
- npm 10+ (uses Turborepo workspaces).

### Steps

1. Clone the repo and install:
   ```bash
   git clone https://github.com/<owner>/haGIT.git
   cd haGIT
   npm install
   ```

2. Copy `apps/web/.env.example` → `apps/web/.env` (or use the root `.env` since
   `turbo.json` declares them as passthroughs).

3. Fill in the values from section 1.

4. Generate `AUTH_SECRET`:
   ```bash
   cd apps/web && npx auth secret
   ```

5. Apply the database migration:
   ```bash
   # from the repo root — uses prisma/schema.prisma
   npx prisma migrate deploy
   # or, in development, regenerate the client only:
   npx prisma generate
   ```

6. Start the dev server:
   ```bash
   npm run dev
   # web app on http://localhost:3000
   ```

### Test cases
- **Existing password user** — log in with email+password. SettingsDrawer should show a JWT.
- **New OAuth user** — click "Continue with Google" with an email not in the DB. Should land on `/dashboard`.
- **OAuth account linking** — log in via GitHub using an email that's already a password user. Should reuse the existing `User` row (no duplicate email).
- **Password login with OAuth-only account** — should see "This account uses social login" message (not a 500).
- **CLI bridge** — after OAuth sign-in, copy the JWT from SettingsDrawer, run `hagit login -t <token>` on a clean machine. Should succeed.

---

## 3. Vercel Setup

The web app is deployed to Vercel. The database is hosted on Neon.

### Environment Variables

Add all of the following in **Project Settings → Environment Variables** for Production
(and Preview, if testing pre-production deploys):

| Key | Where to get the value |
|---|---|
| `DATABASE_URL` | Neon dashboard → Connection Details (pooler URL) |
| `JWT_SECRET` | existing — same as before |
| `AUTH_SECRET` | run `openssl rand -base64 32` |
| `AUTH_URL` | `https://hagithub.vercel.app` |
| `AUTH_GOOGLE_ID` | Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console |
| `AUTH_GITHUB_ID` | GitHub Developer Settings |
| `AUTH_GITHUB_SECRET` | GitHub Developer Settings |

`AUTH_URL` and `AUTH_TRUST_HOST` are auto-inferred on Vercel (the `VERCEL` env var is
present); set them explicitly only if running behind a custom proxy.

### Verification after deploy

1. Hit `https://hagithub.vercel.app/auth/login`. Two OAuth buttons should render (Google, GitHub).
2. Sign in with each provider. Verify the dashboard loads and SettingsDrawer shows a JWT.
3. Sign in with GitHub using an existing password user's email. Confirm only one `User`
   row exists in the DB for that email (account linking works).
4. Test the legacy password login — should still work.

---

## 4. npm Publishing Setup

The GitHub Actions workflow `.github/workflows/publish-hagit-cli.yml` publishes the
`hagit-cli` package to npm whenever a `v*.*.*` tag is pushed.

### One-time setup

#### 4.1 Create the npm access token

1. Go to <https://www.npmjs.com/> and sign in.
2. Click your profile picture → **Access Tokens → Generate New Token**.
3. **Token name**: `hagit-cli-publish`.
4. **Expiration**: 1 year (max allowed for granular tokens).
5. **Bypass 2FA**: enabled (required for CI).
6. **Packages and scopes**: **Only select packages and scopes** → pick `hagit-cli`.
7. **Permissions**: **Read and Publish** on `hagit-cli`.
8. Copy the token value — it's shown only once.

Docs: <https://docs.npmjs.com/creating-and-viewing-access-tokens>

#### 4.2 Add the secret to GitHub

1. Open the GitHub repository.
2. **Settings → Secrets and variables → Actions → New repository secret**.
3. Name: `NPM_TOKEN`.
4. Value: paste the token from step 4.1.

#### 4.3 Verify

Push a test tag:

```bash
git tag v2.0.2-test
git push origin v2.0.2-test
```

If everything is wired up, the action will:
- Verify `package.json` version matches the tag.
- Detect that `2.0.2-test` is not yet on npm.
- Run `npm publish`.

If `2.0.2-test` doesn't match `package.json` version 2.0.1, the action will fail at the
first verification step — this is intentional and confirms the safety check works.

---

## 5. Release Process

To cut a new release of `hagit-cli`:

```bash
cd packages/cli

# 1. Make your code changes, test locally.
# 2. Commit on your feature branch and merge to main (or open a PR).
git checkout main
git pull

# 3. Bump the version. `npm version` updates package.json, commits, and tags.
npm version patch    # 2.0.1 → 2.0.2
npm version minor    # 2.0.1 → 2.1.0
npm version major    # 2.0.1 → 3.0.0

# 4. Push the commit AND the tag.
git push
git push --tags
```

Pushing the tag fires the workflow:

1. The workflow checks out the repo.
2. Verifies the tag (`v2.0.2`) matches the version in `packages/cli/package.json`
   (`2.0.2`).
3. Verifies `hagit-cli@2.0.2` is not already on npm.
4. Runs `npm ci` in `packages/cli/`.
5. Runs `npm publish --provenance --access public`.

If the workflow fails, the tag remains in the repo — you can either:
- Push a fix commit, then re-tag with `git tag -d v2.0.2 && git tag v2.0.2 && git push --tags --force`.
- Or simply push a new tag at a new version.

### Verifying a successful publish

```bash
npm view hagit-cli versions --json | tail -10
```

The new version should appear in the list. The GitHub Action's logs show the publish step
output and any warnings.

---

## 6. Documentation References

### Auth.js v5
- Install guide: <https://authjs.dev/getting-started/installation>
- Migrating from v4: <https://authjs.dev/getting-started/migrating-to-v5>
- Prisma adapter: <https://authjs.dev/getting-started/adapters/prisma>
- Google provider: <https://authjs.dev/getting-started/providers/google>
- GitHub provider: <https://authjs.dev/getting-started/providers/github>

### OAuth provider docs
- Google Cloud OAuth: <https://support.google.com/cloud/answer/6158849>
- GitHub OAuth Apps: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app>

### npm + GitHub Actions
- npm provenance: <https://docs.npmjs.com/generating-provenance-statements>
- npm access tokens: <https://docs.npmjs.com/creating-and-viewing-access-tokens>
- GitHub Actions publishing Node.js packages: <https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages>
