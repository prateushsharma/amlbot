# 🛡️ SettlX AML Telegram Bot

<div align="center">

**A Multi-Chain AML Monitoring & Wallet Risk Analysis System**

*Real-time on-chain surveillance through Telegram*

[![Telegram Bot](https://img.shields.io/badge/Try%20Bot-@settle__x__aml__bot-blue?logo=telegram)](https://t.me/settle_x_aml_bot)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

[Try the Bot](https://t.me/settle_x_aml_bot) • [Features](#-features) • [Architecture](#-architecture) • [Setup](#-quick-start)

</div>

---

## 🌍 Overview

SettlX AML Bot is a production-grade Telegram backend system for blockchain compliance teams, researchers, and security analysts. It provides sophisticated wallet risk analysis and real-time transaction monitoring across multiple EVM chains.

**What makes it special?**
- 🎯 **Explainable Risk Scoring** - No black-box ML, every score has human-readable reasoning
- ⚡ **Real-Time Monitoring** - Cursor-based scanning with zero missed transactions
- 🔗 **Multi-Chain Native** - Seamless support across Ethereum, Base, Avalanche (extensible to Solana)
- 💬 **Telegram-First UX** - Intuitive flows with inline keyboards and step-based navigation
- 🏗️ **Interview-Grade Code** - Modular, extensible, and production-ready architecture

<div align="center">

### 🚀 Try It Now

**[Launch @settle_x_aml_bot on Telegram →](https://t.me/settle_x_aml_bot)**

*Start with `/start` to analyze wallets and set up tracking*

</div>

---

## ✨ Features

### 🔍 Intelligent Wallet Risk Analysis

Analyze any wallet address across supported chains with sophisticated heuristics:

| Detection Type | Description | Risk Contribution |
|----------------|-------------|-------------------|
| 🔥 **Burst Transactions** | High-frequency activity (>1 tx/min) | High |
| 💰 **Large Inflows** | Sudden significant value transfers | Medium-High |
| 🆕 **Fresh Wallets** | Low historical activity patterns | Medium |

**Risk Scoring Output:**
```
Risk Level: High (Score: 85/100)

Reasons:
• Detected 15 transactions in last 10 minutes
• Large inflow of 50 ETH detected
• Wallet age: 3 days (low history)
```

### 📡 Real-Time Wallet Tracking

Set up continuous monitoring with customizable alert rules:

- ✅ **Any Transaction Alerts** - Get notified on every wallet activity
- 💵 **Threshold-Based Alerts** - Only alert when amount exceeds your configured value
- 🔄 **Cursor-Based Scanning** - Never miss a transaction, never get duplicate alerts
- 🏷️ **Custom Labels** - Organize your tracked wallets with meaningful names

### 🌐 Multi-Chain Support

Currently integrated chains:
- **Ethereum** (Mainnet)
- **Base** (Coinbase L2)
- **Avalanche** (C-Chain)

> 📝 Architecture designed for easy extension to Solana, Polygon, Arbitrum, and other chains

### 💬 Seamless Telegram Experience

**Intuitive User Interface:**
- 📱 Inline keyboard navigation
- 🔙 Cancel & back button support
- ⏳ Loading indicators during analysis
- 📊 Account view for all tracked wallets
- 🎨 Formatted messages with emoji indicators

---

## 🧠 Architecture

### System Design

**Request Flow:**
```
Telegram → Webhook → Express API → Grammy Router → Feature Handlers
                                                           ↓
                                                    SQLite Database
                                                           ↓
                                                   Background Worker
                                                           ↓
                                              RPC Providers (Ethers.js)
                                                           ↓
                                            Ethereum | Base | Avalanche
```

**Key Components:**
- **Telegram Interface** - User interaction via Grammy bot framework
- **API Server** - Express webhook handler for Telegram updates  
- **Database Layer** - SQLite for user data, tracked wallets, and alert history
- **Background Worker** - Independent process for continuous transaction monitoring
- **RPC Layer** - Multi-chain blockchain data access via Ethers.js

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Bot Framework** | Grammy | Telegram bot library with type safety |
| **API Server** | Express.js | Webhook handler & HTTP endpoints |
| **Database** | SQLite (better-sqlite3) | Fast, embedded persistence |
| **Blockchain** | Ethers.js v6 | Multi-chain RPC interactions |
| **Language** | TypeScript | Type-safe development |
| **Runtime** | Node.js 18+ | JavaScript runtime |

---

## 🧪 Risk Scoring Methodology

### Heuristic-Based Approach

Unlike opaque ML models, SettlX uses **explainable heuristics** for transparent risk assessment:

- **Transaction Burst Detection** - Identifies high-frequency activity patterns (>1 tx/min)
- **Large Inflow Detection** - Flags significant value transfers above threshold
- **Wallet Maturity Analysis** - Evaluates account age and historical activity

Each heuristic contributes to the final score with clear reasoning provided to the user.

### Risk Categories

| Score Range | Level | Description |
|------------|-------|-------------|
| 0-30 | 🟢 **Low** | Normal activity patterns |
| 31-60 | 🟡 **Medium** | Some suspicious indicators |
| 61-100 | 🔴 **High** | Multiple red flags detected |

---

## ⚙️ Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- RPC URLs for supported chains

### 1️⃣ Clone & Install

```bash
git clone https://github.com/yourusername/settlx-aml-bot.git
cd settlx-aml-bot
npm install
```

### 2️⃣ Configure Environment

Create `.env` file:

```bash
# Telegram Configuration
BOT_TOKEN=your_telegram_bot_token_here

# RPC Endpoints
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
AVAX_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Server Configuration (optional)
PORT=3000
WEBHOOK_URL=https://your-domain.com/telegram/webhook
```

### 3️⃣ Initialize Database

```bash
npm run db:init
```

### 4️⃣ Start Development Server

```bash
npm run dev
```

### 5️⃣ Set Telegram Webhook

```bash
curl -X POST \
  "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}"
```

### 6️⃣ Start Background Worker

```bash
npm run worker
```

---

## 🔄 Background Tracking System

The monitoring worker runs independently from the Telegram bot, performing these key operations every 60 seconds:

1. **Fetch New Transactions** - Retrieves transactions since last cursor for each tracked wallet
2. **Filter by Rules** - Applies user-configured alert rules (any tx or amount threshold)
3. **Deduplicate Alerts** - Checks against existing alert_events to prevent duplicates
4. **Persist & Notify** - Saves new alerts and notifies users via Telegram
5. **Update Cursor** - Advances the checkpoint for next scan cycle

**Design Benefits:**
- ✅ Zero missed transactions
- ✅ No duplicate alerts
- ✅ Fast webhook response times
- ✅ Scalable to thousands of wallets

---

## 📖 Usage Guide

### Analyzing a Wallet

1. Start conversation: `/start`
2. Click "🔍 Check Wallet Risk"
3. Enter wallet address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
4. Select chain: `Ethereum`
5. Receive instant risk analysis

### Setting Up Tracking

1. Click "➕ Track New Wallet"
2. Enter address and label
3. Choose chain
4. Configure alert rules:
   - Notify on any transaction
   - Set minimum amount threshold
5. Confirm tracking

### Managing Tracked Wallets

1. Click "👤 View My Account"
2. See all active tracking
3. Toggle alerts or remove wallets

---

## 🚧 Known Limitations

**Current Scope (Intentional):**
- ERC-20 token transfers not yet parsed (native currency only)
- Solana signature-based tracking in progress
- Alert delivery via Telegram messages (no push notifications)

**These are explicit extension points, not oversights.**

---

## 🔮 Roadmap

### Phase 1: Enhanced Token Support
- [ ] ERC-20 transfer event parsing
- [ ] Token balance tracking
- [ ] Multi-token risk scoring

### Phase 2: Chain Expansion
- [ ] Solana integration (signature-based)
- [ ] Polygon PoS support
- [ ] Arbitrum & Optimism L2s

### Phase 3: Advanced Features
- [ ] OFAC sanctions list integration
- [ ] CEX wallet labeling
- [ ] Historical pattern analysis
- [ ] Risk trend graphs

### Phase 4: Production Hardening
- [ ] Rate-limited alert batching
- [ ] Webhook retry logic
- [ ] Distributed worker architecture
- [ ] Prometheus metrics

---

## 🧑‍💻 Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Building for Production

```bash
npm run build
npm start
```

---

## 🤝 Contributing

Contributions welcome! Please follow these guidelines:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Grammy](https://grammy.dev/) - Modern Telegram Bot Framework
- [Ethers.js](https://ethers.org/) - Ethereum library
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Fast SQLite bindings

---

## 📌 Why This Design?

**This project prioritizes:**

| Principle | Implementation |
|-----------|---------------|
| **Correctness** | Cursor-based scanning prevents missed events |
| **Explainability** | Heuristic scoring over black-box ML |
| **Production-Ready** | Background workers, deduplication, error handling |
| **Interview-Friendly** | Clear architecture, defendable choices |
| **Extensibility** | Modular chain support, plugin-ready |

Every design decision is intentional and defensible in technical discussions.

---

<div align="center">

**Built with 💗 by Prateush Sharma**

[Report Bug](https://github.com/yourusername/settlx-aml-bot/issues) • [Request Feature](https://github.com/yourusername/settlx-aml-bot/issues)

</div>