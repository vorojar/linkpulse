# LinkPulse ⚡ 链光

[![License: MIT](https://img.shields.io/badge/License-MIT-lime.svg)](LICENSE)
[![Self-hosted](https://img.shields.io/badge/self--hosted-your%20server-cyan.svg)](#一分钟跑起来)
[![Docker](https://img.shields.io/badge/docker-compose-blue.svg)](#一分钟跑起来)

**自建短链服务 —— 能告诉你这次点击来自哪个社交 App 的那种。**

Bitly、Dub、Shlink 没有一个能告诉你：这次点击来自微信内置浏览器还是 Safari，来自 Instagram 应用内还是 Chrome。LinkPulse 可以 —— 微信、LINE、Instagram、X、TikTok、Facebook、QQ、微博、钉钉……每次点击的宿主 App 都在看板上看得清清楚楚。

[English version](README.md)

![LinkPulse dashboard](docs/dashboard.png)
![QR code sharing](docs/qr.png)

## 为什么是 LinkPulse

- **看清点击到底从哪来。** 每次点击归因到宿主 App —— 微信 / LINE / Instagram / X / TikTok / Facebook / QQ / 微博 / 钉钉等，附带浏览器、操作系统、系统语言、来源域名、UTM 透传。不再猜哪个渠道真正在转化。
- **永久免费。** 没有 $10–$300/月的订阅，没有按席位收费，没有"免费版只能建 5 条"。服务器是你的，链接是你的，数据也是你的 —— 再也不用担心取消订阅后链接全灭。
- **一键部署。** `docker compose up` 即上线。或者把下面那段提示词粘给 Claude / Codex / Muse，让 AI 替你部署（[见下](#让-ai-替你部署））。
- **自带 A/B 测试。** 一条短链、两个目标页、按比例分流，看板直接对比各版本点击。不用再接第三方实验工具。
- **隐私优先。** 访客原始 IP 从不落盘，只存加盐截断的 SHA-256 哈希（用于 30 分钟重复点击判定，不可逆）。无 Cookie、无指纹、无第三方追踪。
- **二维码包含在内。** 每条短链一键生成可下载的 QR Code PNG —— 这功能在 Bitly 那里要加钱。

## LinkPulse vs 其他

| | **LinkPulse** | Bitly | Dub.co | BL.INK | Shlink |
|---|---|---|---|---|---|
| 价格 | 永久免费（自建） | $10–$300/月（免费版 5 条/月） | $24/月起 | 企业定制价 | 免费（自建） |
| 可自建 | ✅ | ❌ | ✅（配置较复杂） | ❌ | ✅ |
| 社交应用内归因 | ✅ 微信 / LINE / IG / X / TikTok / FB … | ❌ | ❌ | ❌ | ❌ |
| 内置 A/B 测试 | ✅ | ❌ | ❌ | — | ❌ |
| 二维码 | ✅ 自带 | 付费功能 | 付费版才有 | — | ✅ |
| 点击统计 | ✅ | 付费版才有 | ✅ | ✅ | ✅ |
| 数据完全在自己服务器 | ✅ | ❌ | ❌ | ❌ | ✅ |
| 一键部署 | ✅ `docker compose up` | — | — | — | ✅ |

## 一分钟跑起来

```bash
git clone https://github.com/vorojar/linkpulse.git
cd linkpulse
cp .env.example .env   # 填好 ADMIN_PASSWORD、IP_SALT、CRON_SECRET、POSTGRES_PASSWORD
docker compose up -d --build
```

打开 `http://your-server:8080`，输入 `ADMIN_PASSWORD` —— 开始用。数据库表在首次启动时自动创建。

要公开分享、绑定自己的域名，请在前面加 Caddy / Traefik / Nginx 做 HTTPS（比如 `go.example.com` → `127.0.0.1:8080`）。

## 让 AI 替你部署

用 Claude、Codex、Muse 或任何编程 Agent？把下面这段粘给它，整套服务就部署到你的 VPS 上了：

> Deploy the LinkPulse stack from https://github.com/vorojar/linkpulse to my Ubuntu 24.04 VPS (IP: YOUR_VPS_IP) using docker compose.
> 1. Clone the repo.
> 2. Copy `.env.example` to `.env` and generate strong random values for `ADMIN_PASSWORD`, `IP_SALT`, `CRON_SECRET`, `POSTGRES_PASSWORD`.
> 3. Run `docker compose up -d --build`.
> 4. Verify `http://YOUR_VPS_IP:8080/api/health` returns HTTP 200.
> Then give me the dashboard URL and tell me where the admin password is stored.

域名解析到 VPS 后，用 Caddy 一行 `reverse_proxy 127.0.0.1:8080` 就有 HTTPS，可以对外分享短链了。

## 配置

所有配置都是环境变量（见 `.env.example`）：

| 变量 | 必填 | 说明 |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | 看板登录密码 |
| `IP_SALT` | ✅ | 访客 IP 哈希加盐（`openssl rand -hex 16` 生成一个） |
| `CRON_SECRET` | ✅ | 保护每日聚合接口的密钥 |
| `POSTGRES_PASSWORD` | ✅ | 数据库密码 |
| `POSTGRES_DB` | – | 库名（默认 `linkpulse`） |
| `PORT` | – | 监听端口（默认 `8080`） |

## 功能一览

- **短链** —— 自动 6 位短码或自定义，支持渠道备注、标题备注，看板内创建 / 编辑 / 删除
- **点击统计** —— 累计 / 今日 / 近 7 天、14 日趋势（点击数 + 独立访客）、渠道排行、来源排行、24×7 活跃热力图、实时点击流
- **社交归因** —— 每次点击的宿主 App（微信 / LINE / Instagram / X / TikTok / Facebook / …）、浏览器、OS、语言、来源、UTM 透传
- **重复判定** —— 30 分钟内同一访客重复点击自动标记，不计为新的独立访客
- **A/B 测试** —— 一条短链两个目标页，自定义流量权重，看板显示各版本点击数
- **二维码** —— `GET /api/links/:id/qr` 返回 PNG，看板一键下载
- **单管理员登录** —— HTTP Basic 认证，无用户体系要操心
- **中英双语界面** —— 右上角一键切换，浏览器记住你的选择

## 隐私设计

- 访客 IP **从不落盘**。每次点击只存 `SHA256(IP_SALT + ip)` 截断后的 16 位 hex —— 够做重复判定，不可能反推。
- 无 Cookie、无指纹、无第三方追踪。看板是单个静态页，只跟你自己的 API 说话。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/:slug` | 302 跳转 + 异步记录点击 |
| `GET` | `/api/links` | 短链列表（需认证） |
| `POST` | `/api/links` | 创建短链（需认证） |
| `PATCH` | `/api/links/:id` | 编辑目标 / A-B / 标题 / 渠道（需认证） |
| `DELETE` | `/api/links/:id` | 删除短链及统计（需认证） |
| `GET` | `/api/stats/overview` | 看板统计（需认证） |
| `GET` | `/api/links/:id/qr` | 二维码 PNG（需认证） |
| `GET` | `/api/health` | 健康检查 |

认证：HTTP Basic，用户名 `admin`，密码 `ADMIN_PASSWORD`。

## 本地开发（不用 Docker）

```bash
npm install
cp .env.example .env   # 需要一个可连的 Postgres，配 DATABASE_URL 或 POSTGRES_* 变量
node migrate.js && node server.js
```

技术栈：Node.js + Express + PostgreSQL，原生 JS 看板（无构建步骤、无框架）。

## License

MIT — 见 [LICENSE](LICENSE)。链接是你的，服务器是你的，规矩也是你的。
