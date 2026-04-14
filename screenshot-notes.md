# Screenshot Review Notes

## Dashboard Screenshot (after updates)
- Demo Mode banner is showing correctly at the top (amber, "Demo Mode — Showing realistic simulated data (57.9% model accuracy)")
- Caesars and PrizePicks badges are visible in the hero banner
- Sidebar now has 8 items: Dashboard, Predictions, Value Bets, Arbitrage, Player Props, Backtesting, Models, Bankroll
- KPI cards show: $13,240 Bankroll (+32.4%), 18 Active Edges (6 on Caesars), 33.3% Model Accuracy (6/18), 3 Arbitrage Opps

## Issue: Model Accuracy showing 33.3% (6/18)
- The seeded random is producing a different distribution than expected
- Need to check the useMockData hook — the seed=42 random might not be hitting 58% with 30 games
- The resolved count is 18 (60% of 30), and only 6 are correct = 33.3%
- This is because the seeded random with seed=42 doesn't produce 58% accuracy
- Need to fix the mock data generation to guarantee the accuracy target
