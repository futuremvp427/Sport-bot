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
- [ ] Add ODDS_API_KEY secret to dashboard backend
- [ ] Create server-side Odds API service with 120s caching
- [ ] Add tRPC procedures for live odds, predictions, edges, arbitrage
- [ ] Update dashboard pages to use real tRPC data
- [ ] Remove Demo Mode banner
- [ ] Test all pages with live data
- [ ] Checkpoint and deploy
