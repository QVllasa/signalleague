# SignalLeague — Implementierungsplan

> **"The Trustpilot for Trading Signals"**
> Rate, rank and review trading groups and signal communities.

---

## 1. Tech Stack (Finale Entscheidungen)

| Bereich | Technologie | Version |
|---------|-------------|---------|
| **Framework** | Next.js (App Router) | 16.1 |
| **Bundler** | Turbopack (default in Next.js 16) | stable |
| **React** | React + React Compiler | 19.x |
| **Styling** | Tailwind CSS | 4.1 |
| **UI-Komponenten** | shadcn/ui (unified Radix UI) | CLI 3.7 |
| **Auth** | Auth.js v5 (NextAuth.js) | 5.x |
| **Datenbank** | PostgreSQL | 17 |
| **ORM** | Drizzle ORM | latest |
| **Suche** | MeiliSearch | latest |
| **Validierung** | Zod | latest |
| **State Management** | React Server Components + nuqs (URL state) | - |
| **Sprache** | TypeScript (strict mode) | 5.x |
| **E-Mail** | Brevo (ehem. Sendinblue) | - |
| **Image Storage** | MinIO (self-hosted, S3-kompatibel) | latest |
| **Analytics** | Plausible (self-hosted) | latest |
| **Containerisierung** | Docker + Docker Compose | - |
| **Hosting** | Coolify (Self-Hosted, eigener Server) | - |
| **CDN/Proxy** | Cloudflare (DDoS-Schutz, IP-Hiding) | - |

---

## 2. Projektstruktur (Monorepo)

Das Projekt wird als **Monorepo** mit Next.js App Router aufgebaut. Alles in einem Repository, kein separater Backend-Server.

### Verzeichnisstruktur-Konzept

- `/app` — Next.js App Router (Seiten, Layouts, API Routes)
  - `/(marketing)` — Landing Page, Waitlist, About, Legal
  - `/(app)` — Hauptanwendung (geschützte Bereiche)
  - `/(admin)` — Admin Dashboard
  - `/api` — Route Handlers (REST-ähnliche Endpoints)
- `/components` — Wiederverwendbare UI-Komponenten (Cyberpunk Design System)
- `/lib` — Utility-Funktionen, DB-Client, Auth-Config
- `/db` — Drizzle Schema, Migrations, Seeds
- `/actions` — Server Actions (Mutations)
- `/hooks` — Custom React Hooks
- `/types` — TypeScript-Typen
- `/public` — Statische Assets (Fonts, Bilder, Icons)
- `/docker` — Docker-Konfigurationen

---

## 3. Docker Compose Infrastruktur

Der gesamte Stack läuft im **Docker Compose Verbund**:

### Container-Services

1. **signalleague-app** — Next.js 16 Applikation (Node.js Runtime)
2. **signalleague-db** — PostgreSQL 17 Datenbank
3. **signalleague-search** — MeiliSearch Instanz
4. **signalleague-redis** — Redis (Session-Cache, Rate Limiting, Queue)
5. **signalleague-minio** — MinIO Object Storage (S3-kompatibel, Bilder)
6. **signalleague-plausible** — Plausible Analytics (self-hosted)
7. **signalleague-plausible-db** — ClickHouse (Plausible Backend)

### Konfiguration

- Shared Docker Network für Inter-Container-Kommunikation
- Volume Mounts für persistente Daten (PostgreSQL, MeiliSearch)
- Environment-Variablen über `.env`-Datei
- Health Checks für alle Services
- Hot-Reload für Entwicklung (Volume-Mount des Source-Codes)
- Production-Build mit Multi-Stage Dockerfile (minimale Image-Größe)
- Coolify-kompatible Konfiguration für Deployment

---

## 4. Datenbank-Schema (PostgreSQL + Drizzle ORM)

### Kern-Tabellen

#### Users (Nutzer)
- ID, Name, Email, Avatar, Bio
- Rolle (user, moderator, admin)
- OAuth-Verknüpfungen (Twitter/X, Discord, Google)
- Erstellt/Aktualisiert Zeitstempel
- Reputation-Score (basierend auf Review-Qualität)

#### Signal Groups (Signal-Gruppen)
- ID, Name, Slug (URL-freundlich), Beschreibung
- Plattform (Twitter/X, Discord, Telegram)
- Plattform-spezifische Links/Handles
- Asset-Klasse (Crypto — erweiterbar für Forex, Stocks, Options)
- Preismodell (Free, Paid, Freemium) + Preis
- Mitgliederanzahl (geschätzt)
- Gründungsdatum
- Logo/Banner-Bild
- Erstellt von (User-Referenz oder Admin)
- Status (pending, approved, rejected, suspended)
- Aggregate: Durchschnittlicher Review-Score, Anzahl Reviews

#### Reviews (Bewertungen)
- ID, User-Referenz, Group-Referenz
- Gesamtbewertung (1-5 Sterne, Dezimal)
- Kategorie-Bewertungen:
  - Signal-Qualität (1-5)
  - Risiko-Management (1-5)
  - Preis-Leistung (1-5)
  - Community/Support (1-5)
  - Transparenz (1-5)
- Freitext-Review (Titel + Body)
- Mitgliedschaftsdauer beim Zeitpunkt des Reviews
- Verifizierungsstatus (verified_member, unverified)
- Helpful-Votes (Anzahl der "hilfreich"-Markierungen)
- Status (published, flagged, removed)
- Erstellt/Aktualisiert Zeitstempel

#### Tier Rankings
- Group-Referenz
- Berechneter Tier (S, A, B, C, D, F)
- Algorithmus-Score (0-100, Dezimalwert)
- Community-Vote-Score
- Gewichteter Gesamt-Score
- Letztes Berechnungsdatum
- Score-Historie (für Trendanzeige)

#### Waitlist
- ID, E-Mail, Referral-Code, Referred-By
- Signup-Datum, IP (für Spam-Schutz)
- Status (active, converted, unsubscribed)

#### Tags / Kategorien
- Signal-Gruppen können mehrere Tags haben (z.B. "Swing Trading", "Day Trading", "Altcoins", "DeFi")
- Many-to-Many Beziehung über Join-Table

#### Review Votes (Helpful/Unhelpful)
- User-Referenz, Review-Referenz
- Vote-Typ (helpful, unhelpful)
- Unique Constraint: Ein User kann pro Review nur einmal voten

#### Reports (Meldungen)
- User-Referenz, Target-Typ (review, group), Target-ID
- Grund (spam, fake_review, scam, inappropriate, other)
- Beschreibung
- Status (pending, reviewed, resolved, dismissed)

### Indexierung & Performance
- GIN-Indizes für Full-Text-Search auf Group-Namen und Review-Texten
- B-Tree-Indizes auf häufig gefilterte Spalten (Plattform, Asset-Klasse, Tier)
- Zusammengesetzte Indizes für Leaderboard-Sortierung

### MeiliSearch Synchronisation
- Signal Groups werden bei Änderung automatisch in MeiliSearch indexiert
- Suchbare Felder: Name, Beschreibung, Tags, Plattform
- Filterbare Felder: Plattform, Asset-Klasse, Tier, Preis-Typ, Score-Range
- Sortierbare Felder: Score, Review-Anzahl, Erstelldatum

---

## 5. Authentifizierung (Auth.js v5)

### OAuth-Provider
1. **Twitter/X** — Primärer Login (Zielgruppe ist dort aktiv)
2. **Discord** — Zweiter Login (viele Signal-Gruppen auf Discord)
3. **Google** — Fallback für breitere Nutzerbasis

### Features
- Session-basierte Auth mit JWT-Tokens
- Middleware-basierter Route-Schutz für `/app/*` und `/admin/*`
- Rollen-basierte Zugriffskontrolle (RBAC): User, Moderator, Admin
- OAuth-Profil-Daten werden bei Login gespeichert (Avatar, Username)
- Möglichkeit, mehrere OAuth-Accounts zu verknüpfen
- "Sign in to review" — Login-Prompt bei Review-Versuch als Gast

### Callback URLs
- Production: `https://signalleague.com/api/auth/callback/[provider]`
- Development: `http://localhost:3000/api/auth/callback/[provider]`

---

## 6. Features im Detail

---

### 6.1 Landing Page & Waitlist (Marketing-Bereich)

**Zweck:** Besucher informieren, E-Mails sammeln, Hype aufbauen.

#### Hero Section
- Großer Cyberpunk-Headline mit Glitch-Effekt: Tagline
- Kurze Value Proposition (2-3 Sätze)
- E-Mail-Input für Waitlist mit Glitch-Button
- Animated Hintergrund mit Circuit/Grid-Pattern
- Social Proof Counter: "X people already on the waitlist"

#### Problem/Solution Section
- "Das Problem": Keine transparenten Reviews für Trading-Signale
- "Die Lösung": SignalLeague als Community-getriebene Review-Plattform
- Visuell mit Cyberpunk-Cards im Terminal-Style

#### Feature Preview Section
- 3-4 Feature-Cards mit Icons und kurzer Beschreibung
- Signal Group Profiles, Tier Rankings, Community Reviews, Leaderboard
- Holographic Card-Effekt beim Hover

#### Leaderboard Preview
- Mockup-Daten zeigen, wie das Leaderboard aussehen wird
- Animated Tier-Badges (S-Tier glowing, F-Tier dimmed)
- CTA: "Join the Waitlist to get early access"

#### How It Works Section
- 3-Step Erklärung: Browse → Review → Rank
- Visuell als Terminal-Timeline mit Blink-Cursor

#### Footer
- Links zu Social Media, Legal (Impressum, Privacy, Terms)
- "Built with" Tech-Badges
- Newsletter/Waitlist Repeat-CTA

#### Waitlist-Mechanik
- E-Mail-Eingabe mit Zod-Validierung
- Server Action speichert in DB
- Unique Referral-Link generiert nach Signup
- Referral-Tracking: "Move up the waitlist by inviting friends"
- Double Opt-In E-Mail (via Brevo)

---

### 6.2 Signal Group Profiles (Gruppen-Profile)

**Zweck:** Jede Trading-Signal-Gruppe hat ein eigenes Profil mit allen relevanten Infos.

#### Profil-Header
- Gruppenname + Logo
- Plattform-Badge (Twitter/X, Discord, Telegram) mit jeweiligem Icon
- Asset-Klasse Badge (z.B. "Crypto")
- Tier-Badge (S/A/B/C/D/F) mit Farb-Coding und Glow-Effekt
- Durchschnittliche Sternebewertung (1-5)
- Anzahl Reviews
- Preismodell (Free / $XX/Monat / Freemium)

#### Profil-Body
- **Beschreibung** — Wer betreibt die Gruppe, was wird getradet, wie kommunizieren sie
- **Statistiken-Grid:**
  - Durchschnittlicher Score (nach Kategorie aufgeschlüsselt)
  - Signal-Qualität, Risk Management, Preis-Leistung, Community, Transparenz
  - Radar-Chart Visualisierung
- **Tags** — z.B. "Swing Trading", "Altcoins", "Leverage", "DeFi"
- **Externe Links** — Direkte Links zur Gruppe (Telegram, Discord, Twitter)
- **Meta-Daten** — Gründungsdatum, geschätzte Mitglieder, Plattform

#### Review-Sektion
- Liste aller Reviews, sortierbar nach: Neueste, Hilfreichste, Höchste, Niedrigste
- Jeder Review zeigt: User-Avatar, Username, Sternebewertung, Text, Datum, Helpful-Votes
- "Write a Review" CTA-Button (nur für eingeloggte User)
- Pagination oder Infinite Scroll

#### Sidebar (Desktop)
- "Ähnliche Gruppen" Empfehlungen
- Quick-Stats Box
- Share-Buttons (Link kopieren, Twitter teilen)

#### SEO
- Dynamische Meta-Tags pro Gruppe (Title, Description, OG Image)
- Structured Data (JSON-LD) für Reviews (Google Rich Snippets)
- Canonical URLs: `/groups/[slug]`

---

### 6.3 Review-System

**Zweck:** Nutzer können Signal-Gruppen bewerten und detaillierte Reviews schreiben.

#### Review-Formular
- **Gesamt-Bewertung** — 1-5 Sterne (Pflicht)
- **Kategorie-Bewertungen** (jeweils 1-5 Sterne):
  - Signal-Qualität: "How accurate and profitable are the signals?"
  - Risiko-Management: "Do they provide clear stop-losses and position sizing?"
  - Preis-Leistung: "Is the price justified by the value you receive?"
  - Community/Support: "How responsive and helpful is the community?"
  - Transparenz: "Do they share performance records openly?"
- **Review-Text:**
  - Titel (Pflicht, max 100 Zeichen)
  - Body (Pflicht, min 50 Zeichen, max 5000 Zeichen)
  - Rich-Text-Editor mit Markdown-Support
- **Mitgliedschaftsdauer:** Dropdown (< 1 Monat, 1-3 Monate, 3-6 Monate, 6-12 Monate, > 1 Jahr)
- **Pros & Cons** — Optional, jeweils bis zu 5 Stichpunkte

#### Validierung & Anti-Spam
- Rate Limiting: Max 1 Review pro Gruppe pro User
- Minimum-Account-Alter: Account muss mindestens 24h alt sein
- Text-Validierung: Minimum-Länge, kein Copy-Paste von Dummy-Text
- Zod-Schema-Validierung auf Server-Seite
- Optional: CAPTCHA bei verdächtigem Verhalten

#### Review-Interaktion
- Helpful/Unhelpful Voting (einmal pro User pro Review)
- Report-Button für unangemessene Reviews
- Edit-Funktion (innerhalb von 48h nach Erstellung)
- Delete-Funktion (eigene Reviews)

---

### 6.4 Tier-Ranking-System (S/A/B/C/D/F)

**Zweck:** Hybrides Ranking das algorithmisch berechnet wird, aber Community-Input berücksichtigt.

#### Tier-Definitionen

| Tier | Score Range | Bedeutung | Visuell |
|------|------------|-----------|---------|
| **S** | 90-100 | Elite, Top-Performer | Gold/Neon-Glow, animated |
| **A** | 75-89 | Sehr gut, empfehlenswert | Grün, glowing |
| **B** | 60-74 | Gut, solide | Cyan, standard |
| **C** | 45-59 | Durchschnitt, gemischt | Gelb, dimmed |
| **D** | 30-44 | Unterdurchschnittlich | Orange, warning |
| **F** | 0-29 | Schlecht, nicht empfohlen | Rot, blinking |

#### Algorithmus-Komponenten (gewichtet)

1. **Review-Score** (40% Gewicht)
   - Gewichteter Durchschnitt aller Reviews
   - Neuere Reviews haben mehr Gewicht (Zeitabfall-Faktor)
   - Reviews von Nutzern mit höherer Reputation werden stärker gewichtet

2. **Review-Volumen** (20% Gewicht)
   - Mehr Reviews = höheres Vertrauen
   - Logarithmische Skalierung (10 Reviews ≠ 10x besser als 1 Review)
   - Minimum 3 Reviews für Tier-Vergabe, sonst "Unranked"

3. **Konsistenz** (15% Gewicht)
   - Niedrige Standardabweichung der Reviews = höherer Score
   - Vermeidet "Love it or hate it" Gruppen mit polarisierten Reviews

4. **Aktivität** (15% Gewicht)
   - Regelmäßigkeit neuer Reviews
   - Gruppen ohne neue Reviews in 90 Tagen verlieren Punkte

5. **Community-Votes** (10% Gewicht)
   - Aggregierte Helpful-Votes auf Reviews
   - Zeigt, ob die Community den Reviews vertraut

#### Berechnung
- Tier-Scores werden **stündlich** neu berechnet (Cron Job)
- Score-Historie wird gespeichert für Trend-Analyse
- Bei weniger als 3 Reviews: "UNRANKED" Badge statt Tier

---

### 6.5 Leaderboard

**Zweck:** Öffentliches Ranking aller Signal-Gruppen als Haupteinstiegspunkt.

#### Darstellung
- Tabellarische Ansicht mit Ranking-Position, Tier-Badge, Name, Score, Reviews-Anzahl
- Cyberpunk-Terminal-Style mit Scanline-Effekt
- Top 3 hervorgehoben mit speziellem Design (Gold, Silber, Bronze Glow)

#### Filter & Sortierung
- **Plattform:** Twitter/X, Discord, Telegram, Alle
- **Asset-Klasse:** Crypto (später: Forex, Stocks, Options)
- **Tier:** S, A, B, C, D, F
- **Preis-Typ:** Free, Paid, Freemium
- **Sortierung:** Gesamtscore, Review-Anzahl, Neueste, Trending

#### Suche
- MeiliSearch-powered Instant Search
- Autocomplete/Suggest während der Eingabe
- Filter-Kombination über URL-Parameter (shareable Links)

#### Pagination
- 25 Gruppen pro Seite
- URL-basierte Pagination für SEO

---

### 6.6 User Profiles & Dashboard

**Zweck:** Nutzer können ihre Aktivitäten verwalten und ihre Reputation sehen.

#### Öffentliches Profil (`/users/[username]`)
- Avatar, Username, Bio
- Verknüpfte Plattformen (Twitter, Discord)
- Mitglied seit Datum
- Reputation-Score
- Anzahl geschriebener Reviews
- Liste aller öffentlichen Reviews

#### Privates Dashboard (`/dashboard`)
- **Meine Reviews** — Liste aller eigenen Reviews mit Edit/Delete
- **Bookmarks** — Gespeicherte Signal-Gruppen
- **Benachrichtigungen** — Neue Replies, Helpful-Votes auf eigene Reviews
- **Account-Einstellungen:**
  - Profil bearbeiten (Name, Bio, Avatar)
  - Verknüpfte OAuth-Accounts verwalten
  - E-Mail-Benachrichtigungen an/aus
  - Account löschen

---

### 6.7 Custom Admin Dashboard

**Zweck:** Moderation, Content-Management und Plattform-Monitoring.

#### Dashboard-Übersicht
- KPI-Cards: Neue User, Neue Reviews, Neue Gruppen (heute/Woche/Monat)
- Graphen: Wachstumstrend (User, Reviews, Gruppen)
- Pending Actions Counter (Reviews to moderate, Groups to approve, Reports to handle)

#### Gruppen-Verwaltung
- Liste aller Signal-Gruppen mit Status-Filter
- Neue Gruppe erstellen/bearbeiten
- Gruppe genehmigen/ablehnen (für User-eingereichte Gruppen)
- Gruppe suspendieren/wiederherstellen
- Tier manuell überschreiben (mit Begründung)

#### Review-Moderation
- Liste gemeldeter Reviews
- Review lesen, Kontext sehen (Gruppe, User-Historie)
- Aktionen: Approve, Remove, Warn User
- Bulk-Actions für Spam-Wellen

#### User-Verwaltung
- User-Liste mit Suche und Filter
- User-Details einsehen (Reviews, Reports, Login-Historie)
- User-Rolle ändern (User → Moderator → Admin)
- User bannen/entbannen

#### Report-Queue
- Alle offenen Reports chronologisch
- Report-Details mit Kontext
- Quick-Actions: Resolve, Dismiss, Escalate

#### Waitlist-Management
- Gesamtanzahl, tägliche Signups
- Export als CSV
- Bulk-Invite versenden

---

## 7. Design System Integration

Das gesamte UI wird nach dem **DESIGN_SYSTEM.md** aufgebaut:

### Kern-Elemente
- **Farbpalette:** Deep Void Black (#0a0a0f), Electric Green (#00ff88), Hot Magenta (#ff00ff), Cyan (#00d4ff)
- **Typografie:** Orbitron (Headings), JetBrains Mono (Body), monospace durchgehend
- **Ecken:** Chamfered Corners via clip-path (keine Border-Radius!)
- **Effekte:** Scanlines, Chromatic Aberration, Neon Glow, Glitch Animations

### shadcn/ui Customization
- Alle shadcn/ui-Komponenten werden komplett re-themed auf den Cyberpunk-Look
- Custom CSS-Variablen für das Cyberpunk-Farbsystem
- Eigene Button-Varianten: Default, Secondary, Outline, Ghost, Glitch
- Card-Varianten: Default, Terminal (mit Traffic-Lights), Holographic (Glassmorphism)
- Input-Felder im Terminal-Style mit ">" Prefix

### Spezielle Komponenten (Custom)
- **Tier-Badge** — Animated Badge mit Glow-Effekt pro Tier
- **Star-Rating** — Cyberpunk-styled Sterne-Bewertung (Input + Display)
- **Radar-Chart** — Für Kategorie-Bewertungen der Gruppen
- **Leaderboard-Row** — Spezielle Tabellenzeile mit Ranking, Tier, Score
- **Glitch-Text** — Animierte Headlines mit Chromatic Aberration
- **Scanline-Overlay** — Globaler CRT-Effekt
- **Circuit-Background** — SVG Pattern für Hintergründe

---

## 8. API-Design

### Server Actions (Mutations)
- `createReview` — Neue Bewertung erstellen
- `updateReview` — Bewertung bearbeiten
- `deleteReview` — Bewertung löschen
- `voteReview` — Helpful/Unhelpful voten
- `reportContent` — Inhalt melden
- `joinWaitlist` — E-Mail für Waitlist registrieren
- `updateProfile` — User-Profil bearbeiten
- `bookmarkGroup` — Gruppe als Bookmark speichern
- `submitGroup` — Neue Gruppe vorschlagen (User-submitted)
- `adminApproveGroup` — Gruppe genehmigen (Admin)
- `adminModerateReview` — Review moderieren (Admin)

### Route Handlers (API Endpoints)
- `GET /api/groups` — Gruppen-Liste mit Filtern
- `GET /api/groups/[slug]` — Einzelne Gruppe
- `GET /api/groups/[slug]/reviews` — Reviews einer Gruppe
- `GET /api/leaderboard` — Leaderboard-Daten
- `GET /api/search` — MeiliSearch Proxy
- `GET /api/users/[username]` — Öffentliches User-Profil
- `GET /api/admin/stats` — Admin-Statistiken
- `POST /api/webhooks/meilisearch` — MeiliSearch Sync Webhook

---

## 9. SEO-Strategie

### Technisches SEO
- Server-Side Rendering für alle öffentlichen Seiten
- Dynamische `sitemap.xml` (alle Gruppen-Profile, Leaderboard-Seiten)
- `robots.txt` korrekt konfiguriert
- Canonical URLs für alle Seiten

### Structured Data (JSON-LD)
- **Organization** — SignalLeague als Unternehmen
- **WebSite** — Suchbox-Integration
- **Product/Review** — Für jede Signal-Gruppe (Google Rich Snippets mit Sternen)
- **BreadcrumbList** — Navigation

### Meta-Tags
- Dynamische Title/Description pro Seite
- Open Graph Tags für Social Sharing
- Twitter Card Tags

### Seiten-Struktur
- `/` — Landing Page
- `/groups` — Alle Gruppen (mit Filtern)
- `/groups/[slug]` — Einzelne Gruppe
- `/leaderboard` — Leaderboard
- `/dashboard` — User Dashboard (noindex)
- `/admin` — Admin Panel (noindex)

---

## 10. Performance & Caching

- **Turbopack** für blitzschnelle Entwicklung
- **React Server Components** für minimales Client-JavaScript
- **ISR (Incremental Static Regeneration)** für Gruppen-Seiten (Revalidierung alle 60s)
- **Redis** für Session-Cache und Rate Limiting
- **MeiliSearch** für Sub-50ms Suchergebnisse
- **Image Optimization** via Next.js Image Component
- **Lazy Loading** für Below-the-fold-Content
- **Streaming** mit React Suspense für schnelle First Contentful Paint

---

## 11. Implementierungs-Phasen

### Phase 1: Foundation (Woche 1-2)
1. Docker Compose Setup (PostgreSQL, MeiliSearch, Redis, Next.js)
2. Next.js 16 Projekt initialisieren mit Turbopack
3. Tailwind CSS 4.1 + shadcn/ui einrichten
4. Design System implementieren (Cyberpunk Theme, Custom Components)
5. Drizzle ORM Schema definieren und Migrations erstellen
6. Auth.js v5 mit Twitter/X, Discord, Google konfigurieren
7. Basis-Layout (Navigation, Footer, Scanline-Overlay)

### Phase 2: Core Features (Woche 3-5)
8. Landing Page mit Waitlist-Funktion
9. Signal Group Profile-Seiten
10. Review-System (Formular, Validierung, Anzeige)
11. Tier-Ranking Algorithmus implementieren
12. Leaderboard mit Filtern und MeiliSearch-Suche
13. User Profiles und Dashboard

### Phase 3: Admin & Polish (Woche 6-7)
14. Custom Admin Dashboard
15. Report/Moderation System
16. E-Mail-Benachrichtigungen (Waitlist, Reviews)
17. SEO-Optimierung (Sitemap, Structured Data, Meta-Tags)
18. Performance-Optimierung und Caching
19. Responsive Design Feinschliff (Mobile, Tablet, Desktop)

### Phase 4: Launch Prep (Woche 8)
20. Seed-Daten (erste Signal-Gruppen manuell anlegen)
21. Coolify Deployment konfigurieren
22. Domain + SSL aufsetzen
23. Cloudflare DNS + Reverse Proxy (IP-Hiding, DDoS-Schutz)
24. Finale Tests und Bug-Fixes
25. Launch

---

## 12. Entscheidungen (Final)

| Frage | Entscheidung |
|-------|-------------|
| **E-Mail-Service** | Brevo (ehem. Sendinblue) |
| **Image Storage** | MinIO im Docker Compose (S3-kompatibel, self-hosted) |
| **Analytics** | Plausible (self-hosted im Docker Compose) |
| **Gruppen-Submission** | User + Admin (User-Submissions brauchen Admin-Approval) |
| **Error Tracking** | Keins fürs MVP |
| **Monetarisierung** | Rein kostenlos fürs MVP, keine Premium-Vorbereitung |
| **Domain** | signalleague.com — noch nicht registriert, muss vor Launch gekauft werden |
| **Rate Limiting** | Redis-basiert (Redis ist bereits im Docker Compose) |
| **Server** | Eigener/vorhandener Server mit Coolify |

---

## 13. Anonymität & Betreiberschutz

**Ziel:** Betreiber-Identität soll nicht öffentlich sichtbar sein, um Angriffe und Vergeltung von bewerteten Signal-Gruppen zu vermeiden.

### Maßnahmen

1. **Domain-Registrierung:**
   - WHOIS-Privacy aktivieren (bei allen gängigen Registraren inklusive)
   - Keine persönlichen Daten in WHOIS-Einträgen sichtbar

2. **Kein klassisches Impressum:**
   - Stattdessen minimaler Legal-Footer: "Operated by SignalLeague Team"
   - Kontakt nur über E-Mail (z.B. contact@signalleague.com) — keine Adresse, kein Name
   - Seite ist international ausgerichtet (English-only), kein deutsches Impressum nötig

3. **Privacy Policy:**
   - Standard Privacy Policy für internationale Plattformen
   - Bezug auf GDPR für EU-Nutzer, aber ohne Betreiber-Klarnamen
   - Data Controller: "SignalLeague" (ohne natürliche Person)

4. **Terms of Service:**
   - Standardmäßige ToS für User-Generated-Content Plattformen
   - Haftungsausschluss für Reviews und Rankings
   - DMCA/Takedown-Prozess über E-Mail

5. **Server-Anonymität:**
   - Eigener Server — keine Cloud-Provider-Rechnungen mit Klarnamen
   - Coolify als Self-Hosted PaaS
   - Cloudflare als Reverse Proxy (versteckt Server-IP, DDoS-Schutz)

6. **Kommunikation:**
   - Öffentliche Kommunikation nur über Brand-Accounts (SignalLeague Twitter/X)
   - Keine persönlichen Social-Media-Accounts verknüpft
   - Support-E-Mail über eigene Domain

### Docker Compose Ergänzung
MinIO und Plausible werden als zusätzliche Container eingebunden:

5. **signalleague-minio** — MinIO Object Storage (S3-kompatibel, für Bilder)
6. **signalleague-plausible** — Plausible Analytics (self-hosted, privacy-first)
7. **signalleague-plausible-db** — ClickHouse (Plausible Backend-DB)

---

## 14. Implementation Status

### Phase 1: Foundation — COMPLETE
- [x] Next.js 16.1 project initialized with Turbopack
- [x] Docker Compose (8 containers: app, db, search, redis, minio, plausible, plausible-db, clickhouse)
- [x] Tailwind CSS 4.1 + shadcn/ui 3.7 + Cyberpunk Design System
- [x] Drizzle ORM schema (14 tables, enums, relations)
- [x] Auth.js v5 (Twitter/X, Discord, Google)
- [x] Base layout (Header, Footer) + 9 custom components (4 UI + 5 custom)

### Phase 2: Core Features — COMPLETE
- [x] Landing page with waitlist (referral system, Brevo email)
- [x] Signal group profiles (browse, detail, submit)
- [x] Review system (5-star + 5 categories, pros/cons, helpful votes, reports)
- [x] Tier ranking algorithm (S/A/B/C/D/F, hybrid 5-factor)
- [x] Leaderboard with MeiliSearch sync + filters
- [x] User profiles & dashboard

### Phase 3: Admin & Polish — COMPLETE
- [x] Custom admin dashboard (overview, groups, reviews, reports, waitlist, users)
- [x] Admin moderation actions (approve/reject/suspend/flag/remove/restore)
- [x] SEO (dynamic sitemap, robots.txt, meta tags)
- [x] Error pages (404, loading states)
- [x] Cron endpoints (tier recalculation, search sync)

### Phase 4: Launch Prep — COMPLETE
- [x] Database seed script (admin, tags, groups, users, reviews, tiers)
- [x] Production Dockerfile (multi-stage, standalone output)
- [x] Environment configuration (.env.example with all variables)
- [x] `force-dynamic` on all DB-querying pages
- [x] Full production build passes (`npm run build`)

### Files Created (key files)
- `src/db/schema.ts` — 14 tables (users, signalGroups, reviews, tierRankings, tags, etc.)
- `src/db/seed.ts` — Comprehensive seed data
- `src/lib/auth.ts` — Auth.js v5 config
- `src/lib/brevo.ts` — Brevo email client
- `src/lib/ranking.ts` — Tier ranking algorithm
- `src/lib/redis.ts` — Redis client
- `src/lib/meilisearch.ts` — MeiliSearch client
- `src/lib/sync-search.ts` — MeiliSearch sync utilities
- `src/actions/waitlist.ts` — Waitlist server actions
- `src/actions/groups.ts` — Group server actions
- `src/actions/reviews.ts` — Review server actions
- `src/actions/admin.ts` — Admin server actions
- `src/app/page.tsx` — Landing page (Hero, Features, Tiers, How It Works, CTA)
- `src/app/groups/page.tsx` — Browse groups
- `src/app/groups/[slug]/page.tsx` — Group profile
- `src/app/groups/[slug]/review/page.tsx` — Write review
- `src/app/groups/submit/page.tsx` — Submit group
- `src/app/leaderboard/page.tsx` — Leaderboard
- `src/app/dashboard/page.tsx` — User dashboard
- `src/app/login/page.tsx` — Login page
- `src/app/admin/**` — Admin pages (overview, groups, reviews, reports, waitlist, users)
- `src/components/custom/` — GlitchText, TierBadge, StarRating, CircuitBackground, ScanlineOverlay
- `src/components/groups/` — GroupCard, RadarChart
- `src/components/admin/` — GroupActions, ReviewActions, ReportActions
- `src/components/layout/` — Header, Footer
- `src/components/auth/sign-in-buttons.tsx` — OAuth sign-in buttons
- `src/components/waitlist-form.tsx` — Waitlist form

### Remaining for Go-Live
- [ ] Register domain (signalleague.com)
- [ ] Configure OAuth credentials (Twitter/X, Discord, Google)
- [ ] Set up Brevo account + API key
- [ ] Deploy to Coolify
- [ ] Configure Cloudflare DNS + reverse proxy
- [ ] Run `drizzle-kit push` to create database tables
- [ ] Run seed script to populate initial data
- [ ] Set up cron jobs (tier recalculation, search sync)
