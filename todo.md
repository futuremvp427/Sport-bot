# Notification + Stripe Payment Tasks

## Phase 1: Upgrade to full-stack
- [x] Run webdev_add_feature web-db-user
- [x] Run webdev_add_feature stripe

## Phase 2: Read guides
- [x] Read upgrade README/diffs for web-db-user
- [x] Read upgrade README/diffs for Stripe
- [x] Plan notification schema and endpoints
- [x] Plan Stripe products/pricing

## Phase 3: Build Notifications
- [x] Create notification types (edge alerts, arb alerts, model updates, bet results)
- [x] Build notification bell + dropdown in sidebar/header
- [x] Build notification preferences/settings page
- [x] Add backend notification creation logic
- [x] Wire frontend to notification API

## Phase 4: Build Stripe Payments
- [x] Create subscription tiers (Free, Pro, Elite)
- [x] Build pricing page with plan comparison
- [x] Integrate Stripe checkout flow
- [x] Add subscription status to user profile
- [x] Gate premium features behind subscription check (skipped — single user)

## Phase 5: Test & Deliver
- [x] Verify notifications render correctly
- [x] Verify Stripe checkout flow works
- [x] Save checkpoint and deliver

## Phase 6: Live Odds API Integration
- [x] Add ODDS_API_KEY secret to dashboard backend
- [x] Create server-side Odds API service with 120s caching
- [x] Add tRPC procedures for live odds, predictions, edges, arbitrage
- [x] Update dashboard pages to use real tRPC data
- [x] Remove Demo Mode banner
- [x] Test all pages with live data
- [x] Checkpoint and deploy

## Phase 7: Multi-Layer Prediction Engine
- [x] Create feature flags module (featureFlags.ts)
- [x] Build historicalService.ts (form, H2H, home/away splits)
- [x] Build injuryService.ts (player availability impact)
- [x] Build fatigueService.ts (rest days, back-to-back detection)
- [x] Build weatherService.ts (scaffold, off by default for NBA)
- [x] Build predictionEngine.ts (orchestrator, deterministic pipeline)
- [x] Refactor oddsService.ts — replace getModelProb() with multi-layer engine
- [x] Add fetchNbaOddsEnhanced() with 5-min cache
- [x] Add tRPC procedures: odds.nbaEnhanced, odds.valueBetsEnhanced, odds.debugEnhancedPrediction
- [x] Write vitest tests (39 tests, all passing)
- [x] Verify TypeScript: 0 errors
- [x] Save checkpoint

## Phase 8: Rewire Frontend to tRPC (Remove Dead Python Backend)
- [x] Create src/lib/transforms/oddsTransforms.ts with mapEnhancedOddsToEdge, mapEnhancedOddsToPrediction, mapEnhancedOddsToArbitrageOpp
- [x] Rewrite useApiData to use trpc.odds.nbaEnhanced as primary source
- [x] Remove all Python port 8000 logic from useApiData
- [x] Gate mock data behind explicit VITE_USE_MOCK_DATA env flag
- [x] Fix tRPC context error (DashboardLayout calling useApiData before QueryClient ready)
- [x] Update DemoModeBanner to show trpc-live vs mock-dev source
- [x] Verify all 8 pages render with live data
- [x] TypeScript: 0 errors
- [x] Save checkpoint

## Phase 9: Per-Game Prediction Detail Panel
- [x] Add DetailedPredictionViewModel type and mapEnhancedGameToPredictionDetail() to oddsTransforms.ts
- [x] Create client/src/components/predictions/PredictionDetailPanel.tsx (reusable drawer)
- [x] Wire click + panel state into Predictions.tsx
- [x] Wire click + panel state into Edges.tsx (Value Bets page)
- [x] TypeScript: 0 errors
- [x] Verify panel opens with live data, explanation renders, missing fields show fallback
- [x] Save checkpoint

## Phase 10: Activate Fatigue + Historical Layers (Replace Random Noise)
- [x] Audit existing fatigueService.ts and historicalService.ts
- [x] Add ENABLE_FATIGUE and ENABLE_HISTORICAL to featureFlags.ts
- [x] Rebuild fatigueService.ts: getRestDays, isBackToBack, getLastNGames, getFatigueAdjustment (-0.05 to +0.05)
- [x] Rebuild historicalService.ts: getLastNGamesStats, getWinRateLastN, getHomeAwaySplit, getHistoricalAdjustment (-0.06 to +0.06)
- [x] Refactor oddsService.ts getModelProb(): remove random noise, wire historical + fatigue layers
- [x] Add explainability string output to model output
- [x] Clamp total adjustments, prevent extreme probabilities
- [x] Update vitest tests to verify both layers
- [x] TypeScript: 0 errors, all tests passing
- [x] Save checkpoint and deliver final report

## Phase 11: Python Backend Integration (System Intelligence)
- [x] Add tRPC procedures to proxy Python backend: pipeline.run, pipeline.health, pipeline.simulate, pipeline.memory
- [x] Create server/pythonApi.ts service to call Python FastAPI endpoints
- [x] Add System Intelligence page (pipeline status, health, simulation, learning weights)
- [x] Add route for System Intelligence page in App.tsx
- [x] Wire system health indicators into DashboardLayout top bar
- [x] Update useApiData to include pipeline bankroll/ROI from Python backend (data flows via pipeline.memory/bankrollSummary)
- [x] Write vitest tests for new tRPC procedures (19 tests, all passing)
- [x] TypeScript: 0 errors
- [x] Save checkpoint

## Phase 12: Execute 5-Task Sprint

### Task 1: Schedule Automatic Pipeline Runs
- [x] Create server/pipelineScheduler.ts with recurring background loop
- [x] Trigger pipeline.run on configurable interval (default 15 min)
- [x] Auto-update predictions, learning, ROI, and memory
- [x] Add tRPC procedures: scheduler.status, scheduler.start, scheduler.stop
- [x] Add scheduler controls to System Intel page
- [x] Write vitest tests for scheduler (21 new tests in scheduler-bets.test.ts)

### Task 2: Build Bet History System
- [x] Add placed_bets table to drizzle/schema.ts (sport, team, odds, stake, outcome, profit_loss, timestamp)
- [x] Run pnpm db:push to sync schema
- [x] Create server/db.ts helpers for bet CRUD
- [x] Add tRPC procedures: bets.list (with filters), bets.create, bets.stats
- [x] Create client/src/pages/BetHistory.tsx with filterable table
- [x] Add BetHistory route to App.tsx and sidebar nav
- [x] Write vitest tests for bet procedures (bets.list, bets.create, bets.stats)

### Task 3: Expand Multi-Sport Support in UI
- [x] Create shared sport selector component (NBA, NFL, MLB, NHL, Soccer, Golf, Boxing)
- [x] Add sport selector to System Intel page
- [x] Add sport selector to Predictions page
- [x] Add sport selector to Value Bets page
- [x] Ensure pipeline.run and pipeline.simulate use selected sport parameter
- [x] Write vitest tests for sport parameter passing (nfl, mlb, nhl, soccer, boxing, golf)

### Task 4: Verify Integration
- [x] Confirm System Intel page pulls real backend data (not mock)
- [x] Confirm System Online badge polls backend correctly
- [x] Confirm dashboard summary cards (bankroll, ROI, accuracy) are real
- [x] Run all tests and confirm 0 failures (67 tests, 4 files, all passing)

### Task 5: Push All Changes
- [ ] Commit all work
- [ ] Push to branch: tooling-pack-bootstrap
- [ ] Provide commit summary
