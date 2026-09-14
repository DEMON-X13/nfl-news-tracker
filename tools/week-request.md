# Weekly research request

Hand this to Claude (Claude Code or the app) on Tuesday, replacing N with the week number.
It returns one JSON object. Save it as `data/weekN.js` in the form `const WEEKN = {...};`,
add the week to `data/weeks.js`, add a script tag to `index.html`, run `node tools/smoke.js`,
commit, push. Full steps are in HANDOFF.md under Weekly workflow.

---

Build the Week N recap for my 2026 NFL tracker.

Pull from reputable sources (Pro Football Reference box scores, ESPN, NFL.com, team sites, Sharp Football, PFF where public) and give me back ONE JSON object matching the schema below. No prose outside the JSON.

Structure. Each GAME gets a shared matchup block that applies to both teams. Each TEAM gets its own panels.

For every GAME:
  line      - the closing spread and total, e.g. "KC -2.5, O/U 43.5"
  note      - one line on what the game is
  preview   - 3 or 4 bullets. This is the centerpiece, so make it about THIS matchup, not team history:
                the key individual or unit matchups, which way momentum is running, and the winning factor.
                Lead with where the beat writers and analysts agree. If they split, say so in one bullet.
  keys      - 3 to 5 deeper bullets shown when the reader expands the breakdown. Injuries that swing the
                game, scheme wrinkles, head to head history with the numbers, situational splits.
  rows      - optional extra stat comparison rows, each {label, a, h, hi, note} where "a" is the away value,
                "h" is the home value, hi is "a" when higher is better or "lo" when lower is better, and note
                is a short qualifier like "2026" or "per game". Use these for turnover differential, third
                down rate, red zone TD rate, yards per play, sacks, and key player numbers. Six team rows
                (points for and against, differential, SRS, win total, analyst rank) are added automatically,
                so do not repeat those.

For every one of the 32 TEAMS:
  last        - 2 or 3 bullets on their most recent game: score, record, how it flowed, hard numbers.
                Empty array if they have not played yet.
  matchup     - 3 bullets on this game from this team's angle: the line and what the panel expects, the one
                matchup that decides it for them, and what is working against them.
  strengths   - 4 or 5 bullets, shown as Positives. What this team does well and how it applies against THIS
                opponent: name the players and units on both sides, with numbers. Returning injuries, scheme
                edges, and who has to step up all belong here.
  weaknesses  - 4 or 5 bullets, shown as Negatives. Where it breaks down against THIS opponent, who is out,
                and what beat writers flag as the concern, with numbers.
                Start every strengths and weaknesses bullet with one short bold sentence under 90 characters.
                The card shows only that first sentence. The full bullet appears when a reader opens the team.
  ranks       - five ranks, each {rank, prev}, out of 32 with no ties. 1 is always best.
                  overall  - your read of the team right now, blending record, point differential, and how
                             they have actually played.
                  offense  - season to date scoring and efficiency.
                  defense  - same on the other side of the ball.
                  ppg      - points per game, season to date. Include "val" with the number itself.
                  turnover - turnover margin, season to date. Include "val" as a signed string like "+4".
                "prev" is that team's rank in the previous week's file.

Rules I want followed:
  - No em dashes and no double dashes anywhere in the text.
  - Bullets, not paragraphs. Every claim that is a number should carry the number.
  - Bold key names with <strong> tags.
  - Every game needs a "kick" field: the kickoff as a UTC ISO timestamp, so the page can show it in each
    reader's own time zone. Eastern is UTC-4 through early November, UTC-5 after. A 1:00 PM ET Sunday
    kickoff on Sep 20 is "2026-09-20T17:00:00Z". Keep "day" and "time" too as an Eastern fallback.
  - If something is genuinely unknown, use an empty array rather than guessing.

Schema:
{
  "id": "wkN",
  "label": "Week N",
  "type": "recap",
  "status": "live",
  "dates": "Month D to Month D, 2026",
  "headline": "one short line",
  "intro": "two or three sentences on the week as a whole",
  "games": [
    { "away":"NE", "home":"SEA", "day":"Sun Sep 20", "time":"1:00 PM ET",
      "kick":"2026-09-20T17:00:00Z", "tv":"CBS", "venue":"Stadium, City",
      "line":"SEA -3.5, O/U 44.5", "note":"one line on the game",
      "awayScore":17, "homeScore":24,
      "preview":["key matchup","momentum","winning factor"],
      "keys":["deeper point","deeper point"],
      "rows":[ {"label":"Turnover differential","a":"+2","h":"-1","hi":"a","note":"2026"} ]
    }
  ],
  "teams": {
    "SEA": {
      "headline": "one short line for the card header",
      "matchup": ["this game from this team's angle"],
      "last": ["what happened, with numbers"],
      "strengths": ["what they do well and who steps up"],
      "weaknesses": ["where it breaks down, injuries included"],
      "ranks": {
        "overall": { "rank": 3, "prev": 3 },
        "offense": { "rank": 6, "prev": 2 },
        "defense": { "rank": 1, "prev": 1 },
        "ppg":      { "rank": 4, "prev": 5, "val": 27.5 },
        "turnover": { "rank": 3, "prev": 3, "val": "+4" }
      }
    }
  }
}

Team keys, all 32: NE, BUF, NYJ, MIA, BAL, PIT, CIN, CLE, JAX, HOU, IND, TEN, DEN, LAC, KC, LV, PHI, DAL, WAS, NYG, CHI, GB, MIN, DET, TB, CAR, ATL, NO, LAR, SEA, SF, ARI
