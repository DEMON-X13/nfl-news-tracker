/* The page shows one week at a time: the last entry in WEEKS (data/weeks.js). */

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

/* 2026 record from every played game in WEEKS. 0-0 until a team has a result. */
function record(ab){
  let w = 0, l = 0, t = 0;
  WEEKS.forEach(wk => (wk.games||[]).forEach(g => {
    if (g.awayScore == null || g.homeScore == null) return;
    if (g.away !== ab && g.home !== ab) return;
    const home = g.home === ab, mine = home ? g.homeScore : g.awayScore, theirs = home ? g.awayScore : g.homeScore;
    if (mine > theirs) w++; else if (mine < theirs) l++; else t++;
  }));
  return w + "-" + l + (t ? "-" + t : "");
}

/* ============================ state ============================ */
let ACTIVE = WEEKS[WEEKS.length-1].id;
function currentWeek(){ return WEEKS.find(x=>x.id===ACTIVE) || WEEKS[WEEKS.length-1]; }
function show(id){ ACTIVE = id; render(); }
function render(){
  const w = currentWeek();
  const bw = document.getElementById("barweek");
  if (bw) bw.innerHTML = `<b>${w.label}</b><span>${w.dates}</span>`;
  document.getElementById("view").innerHTML = renderWeek(w);
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

  ${FOOTER}`;
}

/* ============================ game overlay ============================ */
/* Everything about one matchup: both teams in full with keys to victory, then the stat breakdown.
   The two team blocks share one grid so matching sections sit on the same row and have equal height. */
function openGame(key){
  const w = currentWeek(); if(!w) return;
  const g = (w.games||[]).find(x=>x.away+"-"+x.home===key); if(!g) return;
  const a = T[g.away], hm = T[g.home], k = kickOf(g);
  const done = g.awayScore!=null && g.homeScore!=null;
  const meta = [done ? `Final ${g.awayScore}-${g.homeScore}` : "", k.day, done ? "" : k.time, g.tv, g.venue, g.line||""].filter(Boolean).join(" &middot; ");

  const teamBlock = (ab, col) => {
    const t = T[ab], e = (w.teams||{})[ab] || {};
    const home = g.home===ab;
    const headline = e.headline || (home ? "Home" : "Away");
    const block = (row, label, tone, items) => (!items || !items.length)
      ? `<div class="tbsec empty ${row}"></div>`
      : `<div class="tbsec ${tone} ${row}"><h5>${label}</h5><ul>${li(items)}</ul></div>`;
    const nothing = !(e.matchup||[]).length && !(e.strengths||[]).length && !(e.weaknesses||[]).length;
    return `<div class="tb ${col}" style="--tc:${t.color}">
      <div class="tbhd r1">
        <div class="badge" style="background:${t.color};color:${txt(t.color)}">${t.ab}</div>
        <div class="who"><h4>${t.name}</h4><div class="sub" title="${esc(headline)}">${headline}</div></div>
        <div class="chips"><span class="pill big"><b>${ORD(t.rank)}</b>rank</span><span class="pill"><b>${record(ab)}</b>2026</span></div>
      </div>
      ${block("r2", "Matchup preview", "n", e.matchup)}
      ${block("r3", "Positives", "up", nothing ? ["Nothing loaded for this team yet."] : e.strengths)}
      ${block("r4", "Negatives", "down", e.weaknesses)}
      ${block("r5", "Keys to victory", "info", e.keys)}
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
      <div class="duo2">${teamBlock(g.away, "c1")}${teamBlock(g.home, "c2")}</div>
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
render();
