# SignalLeague — Finishing Design ("Fix & Ship")

> Approved: 2026-02-14
> Approach: Systematic bottom-up — Infrastructure → Backend → Frontend → Validation

---

## Context

SignalLeague MVP is feature-complete (all 4 phases done). Build passes. No critical bugs identified in code audit. Goal: make the project fully runnable locally, fix all issues found during live testing, add missing hardening features, and prepare for deployment.

---

## Sektion 1: Infrastruktur & Services

1. **Docker Compose starten** — nur Backend-Services (DB, Redis, MeiliSearch, MinIO), ohne App-Container und Plausible/ClickHouse
2. **Datenbank initialisieren** — `drizzle-kit push` + `npm run db:seed`
3. **MeiliSearch initialisieren** — Search-Sync aufrufen, Settings prüfen
4. **Dev-Server starten** — `npm run dev`, localhost:3000 erreichbar

## Sektion 2: Seite-für-Seite Testing & Bug-Fixing

### Öffentliche Seiten (ohne Auth)
- `/` — Landing Page (Hero, Features, Waitlist-Form, Design-System)
- `/groups` — Gruppen-Verzeichnis (Suche, Filter, Sortierung, Pagination)
- `/groups/[slug]` — Group-Detail (Ratings, Reviews, Radar-Chart, Tier-Badge)
- `/leaderboard` — Rangliste (Tier-Sortierung, korrekte Berechnung)
- `/login` — OAuth-Buttons (UI-Check, ohne echte Credentials)
- `/robots.txt` und `/sitemap.xml` — Korrekte Ausgabe
- 404-Seite — Custom Error Page

### Geschützte Seiten (Code-Level Review)
- `/dashboard` — Redirect zu Login
- `/admin/*` — Alle 5 Admin-Seiten
- `/groups/submit` und `/groups/[slug]/review` — Formular-Validierung

### Prüfkriterien pro Seite
- Rendert ohne Console Errors
- Responsive (Desktop + Mobile)
- Cyberpunk Design-System konsistent
- Links funktionieren
- Daten korrekt aus DB
- Keine Runtime-Fehler

## Sektion 3: Code-Fixes & fehlende Features

### Fixes
- MinIO Public URLs: `localhost:9000` → `NEXT_PUBLIC_MINIO_URL` Env-Variable
- Redis: `lazyConnect` entfernen oder Graceful-Fallback
- Brevo E-Mail: Einfache Retry-Logik (1x Retry nach 2s)
- Seed-Daten: Admin-E-Mail aus Env-Variable

### Verbesserungen
- Rate Limiting auf öffentliche Endpoints (Redis-basiert, kein externes Package)
- Workspace-Root Warning: `turbopack.root` in `next.config.ts`
- Middleware-Warning: Bewusst belassen oder zu `proxy` migrieren

### Explizit NICHT im Scope (YAGNI)
- Kein Sentry/Error Tracking
- Keine DB-Backup-Strategie
- Kein Auth.js Upgrade (Beta funktioniert)
- Keine Features über PLAN.md hinaus

## Sektion 4: Aufräumen & Abschluss

### Commits
1. Bestehende 4 uncommittete Änderungen committen
2. Alle Code-Fixes als separater Commit
3. Bug-Fixes aus Testing als weiterer Commit

### Finale Validierung
- `npm run build` — fehlerfrei
- `npm run lint` — keine Errors
- Browser Smoke Test nach allen Fixes
- Docker Compose clean restart

### Dokumentation
- `.env.example` aktualisieren (neue Env-Variablen)
- Keine README/Doc-Änderungen

### Ergebnis
- Projekt lokal vollständig lauffähig mit Seed-Daten
- Alle Seiten geprüft und Bug-frei
- Code-Qualität bereinigt
- Alles committed und build-fähig
- Bereit für Deployment (Domain + OAuth separat)
