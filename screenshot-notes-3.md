# Screenshot 3 - Accuracy Check

Dashboard shows: 60.0% (12/20) — not 57.9% as expected.
32 games * 0.6 = 19.2, int(19.2) = 19 finished. round(19 * 0.579) = round(11.001) = 11. 11/19 = 57.9%.
But the display says 12/20, meaning 20 finished games. This means the int() truncation in Python differs from JS Math.floor behavior.

In JS: Math.floor(32 * 0.6) would be... let me check. Actually the code uses `i < count * 0.6` which for 32 means i < 19.2, so indices 0-18 = 19 games finished. But display says 12/20.

Wait - the seeded RNG might be affecting the game status assignment differently. Need to check if the finished count is actually based on the loop index or something else.

Actually looking again: the code says `const isFinished = i < count * 0.6;` — for count=32, that's i < 19.2, so i=0..18 = 19 finished. But display shows 12/20. 

Hmm, 12/20 = 60.0%. With 20 finished: round(20 * 0.579) = round(11.58) = 12. 12/20 = 60%.

So there must be 20 finished games, not 19. Maybe the homeScore/awayScore check in generatePredictions catches an extra one? Or the count is slightly different.

Actually wait - the issue might be that some "scheduled" games also have scores set. Let me check the game generation more carefully.
