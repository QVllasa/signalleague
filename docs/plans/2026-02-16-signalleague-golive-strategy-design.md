# SignalLeague Go-Live Strategy, Twitter Bot & Feature Design

**Date:** 2026-02-16
**Status:** Approved

## Overview

This document covers the complete strategy for taking SignalLeague from MVP to production, including a fully autonomous Twitter bot, new trust/transparency features, and the go-live deployment plan.

## Architecture — 3 Pillars

```
┌─────────────────────────────────────────────────────┐
│                  SIGNALLEAGUE.COM                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Public   │  │   Admin      │  │  Bot Control  │  │
│  │  Website  │  │  Dashboard   │  │  Dashboard    │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬────────┘  │
│       │               │                  │           │
│  ┌────┴───────────────┴──────────────────┴────┐      │
│  │          Shared Database (PostgreSQL)       │      │
│  │  Groups · Reviews · Scores · Bot Queue     │      │
│  └────────────────────┬───────────────────────┘      │
└───────────────────────┼──────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────┐
│        TWITTER BOT SERVICE (Separate Process)         │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Monitor │→ │ AI       │→ │ Auto-Post         │   │
│  │ CT Feed │  │ Analyze  │  │ (Quote/Reply/OG)  │   │
│  └─────────┘  └──────────┘  └───────────────────┘   │
└───────────────────────────────────────────────────────┘
```

- **The App** is the product — reviews, scores, group directory
- **The Bot** is the marketing engine — drives traffic AND discovers new groups
- **The Dashboard** controls both — manage bot + app from one place

## Anonymity (Top Priority)

The site owner must remain completely anonymous. Trading group operators may become hostile. This affects every decision:

- Domain registration with WHOIS privacy, crypto payment preferred
- Anonymous hosting (no personal name/address)
- Separate GitHub account (not linked to personal identity)
- Twitter bot account: anonymous "anon" persona
- Self-hosted analytics (Plausible, no Google Analytics)
- Burner email for all service registrations
- VPN/Tor for all administrative access
- No personal info in codebase, commits, or public-facing content

Detailed anonymity strategy to be designed in a separate document.

## Trading Group Discovery & Submission Pipeline

### Sources

1. **Twitter Bot (Auto-Discovery)**: Monitors CT for signal group promotions, PnL posts, drama
2. **Community Submissions**: Users submit groups via the existing "Submit a Group" form
3. **Manual Admin Entry**: Admin adds groups directly

### Pipeline

All submissions go through a review queue:

1. New group detected → status `pending_review`
2. **Auto-Dedup**: Fuzzy match against existing groups (name, URL, operator)
3. **Auto-Enrichment**: Bot pulls metadata automatically
4. Admin reviews in dashboard: Approve / Merge with existing / Reject
5. Approved groups go live on the site

### Auto-Enrichment Data Sources

| Source | Data Collected |
|---|---|
| Twitter/X Profile | Follower count, account age, tweet frequency, engagement rate |
| Whop | Price, member count, ratings, category, description |
| Discord (via invite link) | Member count, online count, server description, creation date |
| Telegram (via Bot API) | Member count, description, admin info |
| Website (if exists) | Prices, claims, testimonials, about text |
| Twitter Mentions | Mention frequency, positive/negative sentiment |
| Historical PnL Posts | How many PnL screenshots posted? Only winners shown? |

## New Features

### A) Transparency Score (0-100)

Calculated from community reviews + auto-enrichment data:

| Factor | Weight |
|---|---|
| Shows losses (not just wins) | +20 |
| Track record > 6 months | +15 |
| Verified performance data | +25 |
| Fair pricing vs. market | +10 |
| Responsive to criticism | +10 |
| Open community (not gated behind paywall to see anything) | +10 |
| No fake testimonials | +10 |

- Clearly broken down on group detail page
- Auto-updates when new reviews/data arrive
- Feeds into tier ranking

### B) Social Proof / Real-Time Sentiment

Displayed on each group's detail page:

- Twitter mentions count (7-day rolling)
- Sentiment analysis (% positive/negative/neutral)
- Trending review count
- Live mention feed with actual tweets
- Data comes from the Twitter bot's monitoring (already scraping this)

### C) Scam Warning System

Automatic red flags based on data analysis:

- Only shows winning trades (no losses visible)
- Unrealistic return claims (>500%/month)
- Account age < 3 months
- Follower manipulation detected (sudden spikes)
- Multiple community scam reports
- Fake testimonials detected

Displayed prominently on group pages with a visual "Scam Risk" meter.

### D) Community-Verified Track Record

- Users can rate individual trades/calls from a group: "This call was good/bad"
- Aggregated into win-rate, average return, risk level
- NOT self-reported — verified by community consensus
- Shows distribution of outcomes, not just averages

## Twitter Bot — Technical Design

### Identity

Anonymous CT "anon" account. Sharp, memey, investigative. Positions itself as a community project.

### Twitter API Usage (Basic tier — $100/mo)

| Feature | API Endpoint |
|---|---|
| Keyword stream | Filtered Stream v2 |
| Read user timelines | GET /users/:id/tweets |
| Post (tweet/reply/quote) | POST /tweets |
| Search | GET /tweets/search/recent |
| Read user profiles | GET /users/by/username |

### Autonomous Pipeline

```
1. MONITOR (runs 24/7)
   ├─ Filtered Stream: "PnL", "signal group", "join my VIP",
   │   "win rate", "profit", "free signals", "copy my trades"
   ├─ Watchlist: Track known signal group accounts
   └─ Trending: What's happening in CT right now?

2. ANALYZE (per event)
   ├─ AI classifies: PnL post? Group promo? Drama? Scam?
   ├─ Image analysis: Screenshot → extract numbers (OCR + AI)
   ├─ Context: What do we know about this account/group?
   └─ Relevance score: Worth posting about? (followers, engagement)

3. GENERATE (AI content in CT tone)
   ├─ Template system per content type:
   │   - PnL commentary: "Ser showing only green days again 🤔"
   │   - Group review: "Community says this group is X/5 ⭐"
   │   - Scam alert: "🚩 Red flags on this one anon..."
   │   - General CT take: Memes, hot takes, alpha
   ├─ ALWAYS links to signalleague.com where relevant
   └─ Tone: CT-native, not corporate, not cringe

4. POST (auto-publish)
   ├─ Rate limiting: Max X posts/hour (Twitter TOS compliance)
   ├─ Queue system: Posts stored in DB before publishing
   ├─ Timing: Optimal posting times (US/EU sessions)
   └─ Dashboard log: Every post logged and trackable
```

### Dashboard Integration

- Live feed of all bot activity
- Statistics: posts/day, engagement, follower growth, clicks to signalleague.com
- Kill switch: Stop bot immediately
- Content tuning: Adjust tone, keywords, block accounts
- Manual post: Post directly via dashboard

### Tech Stack (Bot Service)

- Node.js/TypeScript (same language as main app)
- Twitter API v2 (twitter-api-v2 package)
- Claude API or OpenAI API for content generation
- Shared PostgreSQL database with main app
- Runs as separate Docker container in docker-compose

## Go-Live Strategy — 3 Phases

### Phase 1: App Live (Week 1-2)

1. Buy domain (`signalleague.com`) — anonymized (WHOIS privacy, crypto payment)
2. Set up Docker Compose (already exists)
3. Initialize DB + seed data
4. Configure OAuth (Twitter/Discord/Google)
5. Deploy to Coolify/VPS
6. SSL + DNS configuration
7. **Manually add 20-30 trading groups** (so the site isn't empty)
8. Activate Plausible analytics (self-hosted, no Google Analytics)

### Phase 2: New Features (Week 2-4)

1. Transparency Score calculation + display
2. Scam warning system (red flags + community reports)
3. Social proof / Twitter mentions on group pages
4. Community track record (trade ratings)
5. Submission pipeline with review queue + dedup
6. Auto-enrichment for groups (Whop/Discord/Telegram data)
7. Bot control dashboard in admin area

### Phase 3: Twitter Bot Launch (Week 3-5)

1. Twitter Developer Account (anonymous account, burner email)
2. Set up bot service (Node.js + Twitter API v2)
3. AI pipeline (Monitor → Analyze → Generate → Post)
4. Dashboard integration
5. Soft launch: Monitor only first, then gradually start posting
6. Scale: More keywords, more accounts tracked

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Bot architecture | Separate service, shared DB | Isolation, can restart/update independently |
| Bot autonomy | Fully autonomous | Scale, 24/7 coverage, CT never sleeps |
| Bot tone | Crypto Twitter native (English) | Where the audience is, CT culture |
| Group discovery | Bot + Community combined | Maximum coverage |
| Submissions | Always reviewed (never auto-approved) | Quality control, dedup |
| Analytics | Plausible self-hosted | Anonymity, no Google tracking |
| Enrichment | Automatic from multiple sources | Better data = better trust scores |
