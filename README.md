# LinkPulse ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-lime.svg)](LICENSE)
[![Self-hosted](https://img.shields.io/badge/self--hosted-your%20server-cyan.svg)](#quick-start)
[![Docker](https://img.shields.io/badge/docker-compose-blue.svg)](#quick-start)

**The self-hosted Bitly alternative that tells you which social app your clicks came from.**

Bitly, Dub, and Shlink can't tell you whether a click came from the X in-app browser or Safari. LinkPulse can — WeChat, LINE, Instagram, X, TikTok, Facebook, QQ, Weibo, DingTalk and more, detected per click, right on your dashboard.

[中文版说明](README_zh.md)

![LinkPulse dashboard](docs/dashboard.png)
![QR code sharing](docs/qr.png)

## Why LinkPulse

- **Know where clicks really come from.** Every click is attributed to its host app — WeChat, LINE, Instagram, X, TikTok, Facebook, Snapchat, Pinterest, Reddit, LinkedIn, QQ, Weibo, DingTalk — plus browser, OS, language, referrer and UTM passthrough. Stop guessing which social channel actually converts.
- **Free forever.** No $10–$300/mo subscription, no per-seat pricing, no "5 links on the free plan". Your server, your links, your data. They can never be held hostage by a cancelled subscription.
- **One-command deploy.** `docker compose up` and you're live. Or paste one prompt into Claude / Codex / Muse and let your AI agent deploy it for you ([see below](#deploy-with-your-ai-agent)).
- **Built-in A/B testing.** Split one short link between two target pages by ratio, compare clicks per variant on the dashboard. No third-party experiment tool needed.
- **Privacy-first.** Raw IP addresses are never stored — only a salted, truncated SHA-256 hash used for 30-minute repeat-click detection. No cookies, no fingerprinting.
- **QR codes included.** One click generates a shareable QR code PNG per link. Bitly charges extra for this.

## LinkPulse vs the rest

| | **LinkPulse** | Bitly | Dub.co | BL.INK | Shlink |
|---|---|---|---|---|---|
| Price | Free forever (self-hosted) | $10–$300/mo (free: 5 links/mo) | from $24/mo | Custom (enterprise) | Free (self-hosted) |
| Self-hosted | ✅ | ❌ | ✅ (complex setup) | ❌ | ✅ |
| Social in-app attribution | ✅ WeChat / LINE / IG / X / TikTok / FB … | ❌ | ❌ | ❌ | ❌ |
| Built-in A/B testing | ✅ | ❌ | ❌ | — | ❌ |
| QR codes | ✅ included | Paid add-on | Paid plans | — | ✅ |
| Click analytics | ✅ | Paid plans | ✅ | ✅ | ✅ |
| Your data stays on your server | ✅ | ❌ | ❌ | ❌ | ✅ |
| One-command deploy | ✅ `docker compose up` | — | — | — | ✅ |

## Quick start

```bash
git clone https://github.com/vorojar/linkpulse.git
cd linkpulse
cp .env.example .env   # fill in ADMIN_PASSWORD, IP_SALT, CRON_SECRET, POSTGRES_PASSWORD
docker compose up -d --build
```

Open `http://your-server:8080`, enter your `ADMIN_PASSWORD` — done. The database schema is created automatically on first boot.

For a public domain with HTTPS, put Caddy / Traefik / Nginx in front (e.g. `go.example.com` → `127.0.0.1:8080`).

## Deploy with your AI agent

Using Claude, Codex, Muse or any coding agent? Paste this prompt — it deploys the whole stack to your VPS:

> Deploy the LinkPulse stack from https://github.com/vorojar/linkpulse to my Ubuntu 24.04 VPS (IP: YOUR_VPS_IP) using docker compose.
> 1. Clone the repo.
> 2. Copy `.env.example` to `.env` and generate strong random values for `ADMIN_PASSWORD`, `IP_SALT`, `CRON_SECRET`, `POSTGRES_PASSWORD`.
> 3. Run `docker compose up -d --build`.
> 4. Verify `http://YOUR_VPS_IP:8080/api/health` returns HTTP 200.
> Then give me the dashboard URL and tell me where the admin password is stored.

Point your own domain at the VPS and add HTTPS with Caddy (`reverse_proxy 127.0.0.1:8080`) when you're ready to share links publicly.

## Configuration

All settings are environment variables (see `.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | Dashboard login password |
| `IP_SALT` | ✅ | Salt for hashing visitor IPs (privacy) |
| `CRON_SECRET` | ✅ | Protects the daily aggregation endpoint |
| `POSTGRES_PASSWORD` | ✅ | Database password |
| `POSTGRES_DB` | – | Database name (default `linkpulse`) |
| `PORT` | – | Web port (default `8080`) |

## Features

- **Short links** — auto 6-char slugs or custom codes, create / edit / delete from the dashboard
- **Click analytics** — totals, today / 7-day / 14-day trend (clicks + unique visitors), top channels, top referrers, 24×7 activity heatmap, live click stream
- **Social attribution** — per-click host app (WeChat / LINE / Instagram / X / TikTok / Facebook / …), browser, OS, language, referrer, UTM passthrough
- **Repeat detection** — same visitor re-clicking within 30 minutes is flagged, not double-counted as a unique
- **A/B testing** — two target URLs per link, configurable traffic split, per-variant click counts
- **QR codes** — `GET /api/links/:id/qr` returns a PNG, downloadable from the dashboard
- **Single admin login** — HTTP Basic auth, no user management to babysit
- **English / 中文 UI** — toggle in the header, remembered per browser

## Privacy by design

- Visitor IPs are **never stored**. Each click stores `SHA256(IP_SALT + ip)` truncated to 16 hex chars — enough to detect repeat clicks, impossible to reverse.
- No cookies, no fingerprinting, no third-party trackers. The dashboard is a single static page talking to your own API.

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/:slug` | 302 redirect + async click logging |
| `GET` | `/api/links` | List links (auth) |
| `POST` | `/api/links` | Create link (auth) |
| `PATCH` | `/api/links/:id` | Edit target / A-B / title / channel (auth) |
| `DELETE` | `/api/links/:id` | Delete link + its stats (auth) |
| `GET` | `/api/stats/overview` | Dashboard stats (auth) |
| `GET` | `/api/links/:id/qr` | QR code PNG (auth) |
| `GET` | `/api/health` | Health check |

Auth: HTTP Basic, user `admin`, password `ADMIN_PASSWORD`.

## Local development

```bash
npm install
cp .env.example .env   # needs a reachable Postgres; set DATABASE_URL or POSTGRES_* vars
node migrate.js && node server.js
```

Stack: Node.js + Express, PostgreSQL, vanilla JS dashboard (no build step, no framework).

## License

MIT — see [LICENSE](LICENSE). Your links, your server, your rules.
