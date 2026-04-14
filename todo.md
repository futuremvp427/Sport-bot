# Update Tasks

## Phase 1: Realistic Mock Data + Caesars/PrizePicks
- [ ] Rewrite useMockData hook with realistic 55-60% accuracy
- [ ] Make Caesars Sportsbook and PrizePicks the primary/featured platforms
- [ ] Ensure all edges, arbitrage, and odds reference Caesars/PrizePicks prominently
- [ ] Add PrizePicks-specific prop bet data (player props)

## Phase 2: Python Backend Updates
- [ ] Add Caesars and PrizePicks to settings.py sportsbook config
- [ ] Update OddsAPI provider to prioritize Caesars
- [ ] Add PrizePicks provider/data support
- [ ] Update arbitrage scanner to feature Caesars/PrizePicks

## Phase 3: Wire Dashboard to Backend
- [ ] Create API service layer in dashboard
- [ ] Connect dashboard pages to backend endpoints
- [ ] Add loading states and error handling
- [ ] Fallback to realistic mock data when backend unavailable

## Phase 4: Test & Deliver
- [ ] Verify all pages render with realistic data
- [ ] Checkpoint and deliver
