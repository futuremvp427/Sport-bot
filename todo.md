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
