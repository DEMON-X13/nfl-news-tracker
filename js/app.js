/* Runtime list of weeks. Week 1 is baked in; weeks.json is merged on top at load.
   The page shows one week at a time: the newest one loaded. */
const WEEKS = [WEEK1];

/* ============================ helpers ============================ */
const T = {}; TEAMS.forEach(t => T[t.ab] = t);
const esc  = s => String(s).replace(/<[^>]+>/g,"").replace(/"/g,"");
const li   = a => a.map(x=>`<li>${x}</li>`).join("");
const txt  = c => { const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16); return (r*299+g*587+b*114)/1000 > 140 ? "#332E29" : "#fff"; };
const ORD  = n => { const s=["th","st","nd","rd"], v=n%100; return n + "<sup>" + (s[(v-20)%10]||s[v]||s[0]) + "</sup>"; };
const TZFMT = (()=>{ try { return new Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch(e){ return ""; } })();
function kickOf(g){
  const done = g.awayScore != null && g.homeScore != null;
  if (done) return { day: g.day, time: "Final" };
  if (!g.kick) return { day: g.day, time: g.time };
  const dt = new Date(g.kick);
  if (isNaN(dt.getTime())) return { day: g.day, time: g.time };
  try {
    return {
      day: new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(dt),
      time: new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(dt)
    };
  } catch(e){ return { day: g.day, time: g.time }; }
}

/* ============================ ranks ============================ */
/* Preseason fallbacks computed from TEAMS. A week's own "ranks" block overrides these. */
const BASE = (()=>{
  const rankBy = (arr, key, desc) => {
    const s = [...arr].sort((a,b)=> desc ? b[key]-a[key] : a[key]-b[key]);
    const m = {}; s.forEach((t,i)=> m[t.ab] = i+1); return m;
  };
  const off = rankBy(TEAMS,"pf",true);      // most points scored in 2025
  const def = rankBy(TEAMS,"pa",false);     // fewest points allowed in 2025
  const ppg = rankBy(TEAMS,"pf",true);      // points per game, 2025
  const tom = rankBy(TEAMS,"to",true);      // turnover differential, 2025
  const m = {}; TEAMS.forEach(t => m[t.ab] = {off:off[t.ab], def:def[t.ab], ppg:ppg[t.ab], tom:tom[t.ab], ppgv:Math.round(t.pf/17*10)/10, tov:t.to});
  return m;
})();
function rk(ab, w){
  const t = T[ab], b = BASE[ab];
  const entry = (w.teams||{})[ab] || {};
  const g = entry.ranks || {};
  return {
    overall: g.overall || {rank:t.rank},
    offense: g.offense || {rank:b.off},
    defense: g.defense || {rank:b.def},
    ppg:     g.ppg     || {rank:b.ppg, val:b.ppgv},
    turnover:g.turnover|| {rank:b.tom, val:(b.tov>0?"+":"")+b.tov}
  };
}

/* ============================ state ============================ */
let ACTIVE = "wk1";
function currentWeek(){ return WEEKS.find(x=>x.id===ACTIVE) || WEEKS[WEEKS.length-1]; }
function show(id){ ACTIVE = id; render(); }
function render(){
  const w = currentWeek();
  const bw = document.getElementById("barweek");
  if (bw) bw.innerHTML = `<b>${w.label}</b><span>${w.dates}</span>`;
  document.getElementById("view").innerHTML = renderWeek(w);
  wireTools();
}

/* ============================ the page: one week, the slate ============================ */
function renderWeek(w){
  const recap = w.type === "recap";
  return `
  <section class="pagehead">
    <div class="eyebrow ${w.status==="sample"?"sample":""}"><i></i>${w.dates}</div>
    <h2>${w.headline}</h2>
    <p>${w.intro}</p>
    ${w.status==="sample" ? `<p class="sampleflag"><strong>Sample data.</strong> Nothing on this tab is real. It exists to show what a played week looks like before one has been played.</p>` : ""}
  </section>

  <section class="sec">
    <div class="sec-head"><h3>${recap ? "Results" : "The slate"}</h3><p>${w.games.length} games. Click one for the full breakdown. Kickoffs show in your local time${TZFMT?" ("+TZFMT+")":""}.</p></div>
    <div class="slate">
      ${w.games.map(g=>{
        const a=T[g.away], h=T[g.home], k=kickOf(g);
        const done = g.awayScore!=null && g.homeScore!=null;
        const sc = done ? `<span class="score">${g.awayScore}<em>-</em>${g.homeScore}</span>` : "";
        return `<button class="slot" type="button" data-game="${g.away}-${g.home}" aria-label="Open ${a.name} at ${h.name}">
          <div class="when">${k.day} &middot; ${k.time}</div>
          <div class="vs"><i style="background:${a.color}"></i>${a.ab}<em>at</em><i style="background:${h.color}"></i>${h.ab}${sc}</div>
          <div class="note">${g.tv} &middot; ${g.venue}</div>
          ${g.note ? `<div class="hook">${g.note}</div>` : ""}
          <div class="more">Full breakdown<span aria-hidden="true">&rsaquo;</span></div>
        </button>`;
      }).join("")}
    </div>
  </section>

  ${TOOLS(w)}
  ${FOOTER}`;
}

/* ============================ game overlay ============================ */
/* Everything about one matchup: how it sets up, both teams in full, keys, then the stat breakdown. */
function openGame(key){
  const w = currentWeek(); if(!w) return;
  const g = (w.games||[]).find(x=>x.away+"-"+x.home===key); if(!g) return;
  const a = T[g.away], hm = T[g.home], k = kickOf(g);
  const done = g.awayScore!=null && g.homeScore!=null;
  const meta = [done ? `Final ${g.awayScore}-${g.homeScore}` : "", k.day, done ? "" : k.time, g.tv, g.venue, g.line||""].filter(Boolean).join(" &middot; ");

  const sec = (label, tone, items, sub) => (!items || !items.length) ? "" :
    `<div class="ovsec ${tone}">${label}${sub?`<span class="ovsub">${sub}</span>`:""}</div><ul class="ovkeys">${li(items)}</ul>`;

  const teamBlock = ab => {
    const t = T[ab], e = (w.teams||{})[ab] || {};
    const home = g.home===ab;
    const block = (label, tone, items) => (!items || !items.length) ? "" :
      `<div class="tbsec ${tone}"><h5>${label}</h5><ul>${li(items)}</ul></div>`;
    return `<div class="tb" style="--tc:${t.color}">
      <div class="tbhd">
        <div class="badge" style="background:${t.color};color:${txt(t.color)}">${t.ab}</div>
        <div class="who"><h4>${t.name}</h4><div class="sub">${e.headline || (home ? "Home" : "Away")}</div></div>
        <div class="chips"><span class="pill big"><b>${ORD(t.rank)}</b>rank</span><span class="pill"><b>${t.rec}</b>2025</span></div>
      </div>
      ${block("Matchup preview", "n", e.matchup)}
      ${block("Positives", "up", e.strengths)}
      ${block("Negatives", "down", e.weaknesses)}
      ${block("Where they stand", "n", e.last)}
      ${!(e.matchup||[]).length && !(e.strengths||[]).length && !(e.weaknesses||[]).length ? `<div class="pending" style="padding:10px 0">Nothing loaded for this team yet.</div>` : ""}
    </div>`;
  };

  /* stat breakdown: current rankings, then team numbers, as paired bars */
  const num = v => Math.round(v*10)/10;
  const ra = rk(g.away, w), rh = rk(g.home, w);
  const rankRows = [
    {label:"Overall rank", a:ra.overall.rank, h:rh.overall.rank, hi:"lo", note:"of 32"},
    {label:"Offense rank", a:ra.offense.rank, h:rh.offense.rank, hi:"lo", note:"of 32"},
    {label:"Defense rank", a:ra.defense.rank, h:rh.defense.rank, hi:"lo", note:"of 32"},
    {label:"Points per game rank", a:ra.ppg.rank, h:rh.ppg.rank, hi:"lo", note:"of 32"},
    {label:"Turnover margin rank", a:ra.turnover.rank, h:rh.turnover.rank, hi:"lo", note:"of 32"}
  ];
  const rows = [
    {label:"Points per game", a:num(a.pf/17), h:num(hm.pf/17), hi:"a", note:"2025"},
    {label:"Points allowed", a:num(a.pa/17), h:num(hm.pa/17), hi:"lo", note:"2025"},
    {label:"Point differential", a:a.pd, h:hm.pd, hi:"sign", note:"2025"},
    {label:"SRS", a:num(a.srs), h:num(hm.srs), hi:"sign", note:"2025"},
    {label:"Turnover margin", a:a.to, h:hm.to, hi:"sign", note:"2025"},
    {label:"Posted win total", a:a.wt, h:hm.wt, hi:"a", note:"2026"},
    {label:"Analyst rank", a:a.rank, h:hm.rank, hi:"lo", note:"of 32"}
  ].concat(g.rows||[]);
  const bar = r => {
    const x = parseFloat(r.a), y = parseFloat(r.h);
    let pa = 50, ph = 50;
    if (!isNaN(x) && !isNaN(y)){
      if (r.hi === "lo"){ const ix = 1/Math.max(x,.01), iy = 1/Math.max(y,.01); pa = ix/(ix+iy)*100; }
      else { const lo = Math.min(x,y,0), sx = x-lo, sy = y-lo; pa = (sx+sy)===0 ? 50 : sx/(sx+sy)*100; }
      ph = 100-pa;
    }
    const aw = !isNaN(x)&&!isNaN(y)&&x!==y ? (r.hi==="lo" ? x<y : x>y) : false;
    const hw = !isNaN(x)&&!isNaN(y)&&x!==y ? (r.hi==="lo" ? y<x : y>x) : false;
    const fmt = v => (r.hi==="sign" && typeof v==="number" && v>0) ? "+"+v : v;
    return `<div class="sbar">
      <div class="sv ${aw?"win":""}">${fmt(r.a)}</div>
      <div class="mid"><span class="lb">${r.label}</span>
        <span class="track"><i style="width:${pa}%;background:${a.color}"></i><i style="width:${ph}%;background:${hm.color}"></i></span>
        ${r.note?`<span class="nt">${r.note}</span>`:""}</div>
      <div class="sv ${hw?"win":""}">${fmt(r.h)}</div>
    </div>`;
  };

  document.getElementById("ovbox").innerHTML = `
    <div class="ovhd">
      <div>
        <h3 id="ovtitle"><i style="background:${a.color}"></i>${a.name}<em>at</em><i style="background:${hm.color}"></i>${hm.name}</h3>
        <div class="sub">${meta}</div>
      </div>
      <button class="x" id="ovx" aria-label="Close">&times;</button>
    </div>
    <div class="ovbody game">
      ${g.note ? `<p class="ovnote">${g.note}</p>` : ""}
      ${sec("How the game sets up", "n", g.preview)}
      <div class="duo2">${teamBlock(g.away)}${teamBlock(g.home)}</div>
      ${sec("Keys to victory", "info", g.keys)}
      <div class="ovsec n">Full stat breakdown<span class="ovsub">green marks the better number</span></div>
      <div class="ovlegend">
        <span><i style="background:${a.color}"></i>${a.name}</span>
        <span><i style="background:${hm.color}"></i>${hm.name}</span>
      </div>
      <div class="ovsub2">Current rankings</div>
      ${rankRows.map(bar).join("")}
      <div class="ovsub2">Team numbers</div>
      ${rows.map(bar).join("")}
    </div>`;
  const ov = document.getElementById("ov");
  ov.classList.add("on"); ov.scrollTop = 0;
  document.body.style.overflow = "hidden";
  document.getElementById("ovx").addEventListener("click", closeOv);
}
function closeOv(){
  document.getElementById("ov").classList.remove("on");
  document.body.style.overflow = "";
}

/* ============================ data tools ============================ */


function TOOLS(w){
  return `<details class="tools" id="tools">
    <summary>Data tools</summary>
    <div class="tools-body">
      <p>Three things live here. Pull the stat request to hand to Claude, load a finished week back in, or export what you already have.</p>
      <div class="btnrow">
        <button class="btn" id="btn-req">Copy stat request for the next week</button>
        <button class="btn ghost" id="btn-tmpl">Download blank week template</button>
        <button class="btn ghost" id="btn-exp">Export weeks.json for the site</button>
      </div>
      <textarea id="io" spellcheck="false" placeholder="Paste a finished week's JSON here, then press Load week."></textarea>
      <div class="btnrow">
        <button class="btn" id="btn-load">Load week from JSON</button>
        <button class="btn ghost" id="btn-clear">Clear box</button>
      </div>
      <div class="status" id="status"></div>
      <p class="hint">A loaded week lives in this browser tab only. To publish it, export weeks.json and commit it next to index.html. The page always shows the newest week it has.</p>
    </div>
  </details>`;
}

function nextWeekNum(){
  return Math.max(0, ...WEEKS.filter(w=>w.status!=="sample").map(w=>parseInt((w.id.match(/\d+/)||[0])[0],10)||0)) + 1;
}
function statRequest(w){
  const nextNum = nextWeekNum();
  return `Build the Week ${nextNum} recap for my 2026 NFL tracker.

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
  "id": "wk${nextNum}",
  "label": "Week ${nextNum}",
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

Team keys, all 32: ${TEAMS.map(t=>t.ab).join(", ")}`;
}

function blankTemplate(){
  const nextNum = nextWeekNum();
  return {
    id:"wk"+nextNum, label:"Week "+nextNum, type:"recap", status:"live",
    dates:"", headline:"", intro:"", games:[],
    teams: Object.fromEntries(TEAMS.map(t=>[t.ab,{
      headline:"", matchup:[], last:[], strengths:[], weaknesses:[],
      ranks:{overall:{rank:null,prev:null}, offense:{rank:null,prev:null}, defense:{rank:null,prev:null}, ppg:{rank:null,prev:null,val:null}, turnover:{rank:null,prev:null,val:null}}
    }]))
  };
}

function download(name, text){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type:"application/json"}));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();}, 400);
}
function say(msg, bad){
  const s = document.getElementById("status"); if(!s) return;
  s.textContent = msg; s.classList.toggle("err", !!bad);
}
function toClipboard(text){
  const box = document.getElementById("io");
  box.value = text; box.focus(); box.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch(e){}
  const done = () => say("Copied. Paste it into Claude.");
  const fail = () => say(ok ? "Copied. Paste it into Claude." : "Could not reach the clipboard. The text is selected in the box, copy it manually.", !ok);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fail);
  else fail();
}
function wireTools(){
  const t = document.getElementById("tools"); if(!t) return;
  const w = currentWeek();
  document.getElementById("btn-req").addEventListener("click", ()=>toClipboard(statRequest(w)));
  document.getElementById("btn-tmpl").addEventListener("click", ()=>{
    download("nfl-2026-week-template.json", JSON.stringify(blankTemplate(), null, 2)); say("Template downloaded.");
  });
  document.getElementById("btn-exp").addEventListener("click", ()=>{
    download("weeks.json", JSON.stringify(WEEKS.filter(x=>x.id!=="wk1"), null, 2));
    say("weeks.json downloaded. Upload it next to index.html to publish these weeks.");
  });
  document.getElementById("btn-clear").addEventListener("click", ()=>{ document.getElementById("io").value=""; say(""); });
  document.getElementById("btn-load").addEventListener("click", ()=>{
    const raw = document.getElementById("io").value.trim();
    if (!raw) return say("Nothing in the box.", true);
    let data;
    try { data = JSON.parse(raw); } catch(e){ return say("That is not valid JSON. " + e.message, true); }
    const list = Array.isArray(data) ? data : [data];
    const bad = list.find(d => !d || !d.id || !d.label || !d.teams);
    if (bad) return say("A week is missing id, label, or teams.", true);
    let added = 0;
    list.forEach(d=>{
      d.games = d.games || []; d.status = d.status || "live"; d.type = d.type || "recap";
      d.dates = d.dates || ""; d.headline = d.headline || ""; d.intro = d.intro || "";
      const i = WEEKS.findIndex(x=>x.id===d.id);
      if (i >= 0) WEEKS[i] = d; else { WEEKS.push(d); added++; }
    });
    WEEKS.sort((a,b)=>{
      const n = x => x.status==="sample" ? 999 : (parseInt((x.id.match(/\d+/)||[0])[0],10)||0);
      return n(a)-n(b);
    });
    show(list[0].id);
    say((added?added+" week added. ":"Week replaced. ") + "Now showing it.");
    document.getElementById("tools").open = true;
  });
}

/* ============================ footer ============================ */
const FOOTER = `<footer>
  <p style="font-weight:600;color:var(--ink-2);margin-bottom:14px">Last updated September 13, 2026. New week posted each Tuesday.</p>
  <h4>Where this comes from</h4>
  <p>2025 records, points for and against, and SRS are from Pro Football Reference. Posted win totals are the DraftKings and BetMGM numbers as re-checked in late August. Analyst rank is the Sharp Football Analysis pre Week 1 order, used as a single consistent expert baseline. Schedule, kickoff times, injury designations, and roster notes come from NFL.com, ESPN, NBC Sports, CBS Sports, Fox Sports, and team sites.</p>
  <p>Anything described as a positive or a concern is a reading of the consensus case, not a settled fact. Injury notes move constantly and reflect reporting as of the date on each week tab.</p>
</footer>`;

/* ============================ boot ============================ */
document.getElementById("view").addEventListener("click", e=>{
  const s = e.target.closest(".slot"); if (s) openGame(s.dataset.game);
});
document.getElementById("ov").addEventListener("click", e=>{ if (e.target.id==="ov") closeOv(); });
document.addEventListener("keydown", e=>{ if (e.key==="Escape") closeOv(); });
document.getElementById("top").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
function latestWeekId(){
  const nums = WEEKS.map(w => parseInt((w.id.match(/\d+/)||[0])[0],10)||0);
  return WEEKS[nums.indexOf(Math.max(...nums))].id;
}
function mergeWeeks(list){
  let added = 0;
  list.forEach(d=>{
    if (!d || !d.id || !d.teams) return;
    d.games = d.games || []; d.status = d.status || "live"; d.type = d.type || "recap";
    d.label = d.label || ("Week " + ((d.id.match(/\d+/)||["?"])[0]));
    d.dates = d.dates || ""; d.headline = d.headline || ""; d.intro = d.intro || "";
    const i = WEEKS.findIndex(x=>x.id===d.id);
    if (i >= 0) WEEKS[i] = d; else { WEEKS.push(d); added++; }
  });
  WEEKS.sort((a,b)=>((parseInt((a.id.match(/\d+/)||[0])[0],10)||0)-(parseInt((b.id.match(/\d+/)||[0])[0],10)||0)));
  return added;
}
show(latestWeekId());

/* When published, any weeks.json sitting next to this file is loaded and merged.
   Opening the file locally just skips this and uses the weeks baked in above. */
(function loadHosted(){
  if (!window.fetch || !/^https?:$/.test(location.protocol)) return;
  fetch("weeks.json", {cache:"no-store"})
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      const list = Array.isArray(data) ? data : [data];
      if (!mergeWeeks(list)) return;
      show(latestWeekId());
    })
    .catch(()=>{});
})();
