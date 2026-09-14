/* Runtime list of weeks. Week 1 is baked in; weeks.json is merged on top at load. */
const WEEKS = [WEEK1];

/* ============================ helpers ============================ */
const T = {}; TEAMS.forEach(t => T[t.ab] = t);
const DIVS = ["AFC East","AFC North","AFC South","AFC West","NFC East","NFC North","NFC South","NFC West"];
const DIVNOTE = {
  "AFC East":"New England won it at 14-3. Miami is rebuilding.",
  "AFC North":"Three of four teams changed head coaches.",
  "AFC South":"Two 12-win teams and two three-win teams.",
  "AFC West":"Widely rated the strongest division in football.",
  "NFC East":"Philadelphia repeat, or a rebuilt Dallas defense.",
  "NFC North":"Four teams within two games of each other.",
  "NFC South":"Won with eight wins in each of the last two years.",
  "NFC West":"The champion, the favorite, and a 12-win team."
};
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-");
const sign = n => (n>0?"+":"") + n;
const esc  = s => String(s).replace(/<[^>]+>/g,"").replace(/"/g,"");
const li   = a => a.map(x=>`<li>${x}</li>`).join("");
const txt  = c => { const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16); return (r*299+g*587+b*114)/1000 > 140 ? "#332E29" : "#fff"; };
const ICON = {
  n:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 12h16M4 6h16M4 18h10"/></svg>`,
  up:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`,
  rank:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
  next:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  down:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.9L2.6 17.3A2 2 0 004.3 20h15.4a2 2 0 001.7-2.7L13.7 3.9a2 2 0 00-3.4 0z"/></svg>`
};

/* ============================ state ============================ */
let ACTIVE = "guide";
let conf = "all";

/* ============================ tabs ============================ */
function buildNav(){
  const upcoming = [];
  for (let w = 2; w <= 18; w++) if (!WEEKS.some(x=>x.id==="wk"+w)) upcoming.push(w);
  document.getElementById("weeknav").innerHTML =
    `<button class="wtab" role="tab" data-id="guide">Season guide</button>` +
    WEEKS.map(w=>`<button class="wtab ${w.status==="sample"?"sample":""}" role="tab" data-id="${w.id}">${w.label}</button>`).join("") +
    upcoming.map(w=>`<button class="wtab" role="tab" disabled title="Not published yet">Wk ${w}</button>`).join("");
  document.querySelectorAll(".wtab[data-id]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.id)));
  tabEdges();
}
function tabEdges(){
  const s = document.getElementById("weeknav"), wrap = document.getElementById("tabswrap");
  if (!s || !wrap) return;
  const max = s.scrollWidth - s.clientWidth;
  wrap.classList.toggle("more-l", s.scrollLeft > 4);
  wrap.classList.toggle("more-r", s.scrollLeft < max - 4);
}
function revealTab(id){
  const b = document.querySelector('.wtab[data-id="' + id + '"]');
  if (b && b.scrollIntoView) b.scrollIntoView({inline:"center", block:"nearest", behavior:"smooth"});
  setTimeout(tabEdges, 350);
}
function show(id){
  ACTIVE = id;
  document.querySelectorAll(".wtab[data-id]").forEach(b=>b.setAttribute("aria-selected", b.dataset.id===id));
  revealTab(id);
  document.getElementById("view").innerHTML = (id==="guide") ? renderGuide() : renderWeek(WEEKS.find(w=>w.id===id));
  if (id==="guide") wireBoard();
  wireTools();
  apply();
  window.scrollTo({top:0,behavior:"auto"});
}

/* ============================ guide tab ============================ */
function renderGuide(){
  return `
  <section class="pagehead nosearch">
    <div class="eyebrow"><i></i>Preseason reference</div>
    <h2>Where every roster stood going into Week 1</h2>
    <p>Each team gets three sections in the same order: what actually changed since last season, the case for them, and the case against them. This tab does not change during the year, so it stays a fixed point to measure the weeks against.</p>
  </section>

  <section class="sec nosearch">
    <div class="sec-head"><h3>The board</h3><p>2025 results against where the market and the analysts had each team. Click a column to sort.</p></div>
    <div class="tablewrap"><table id="board"><thead><tr>
      <th data-k="name" data-t="s">Team</th><th data-k="rec" data-t="s">2025</th>
      <th data-k="pf" data-t="n">PF</th><th data-k="pa" data-t="n">PA</th>
      <th data-k="pd" data-t="n">Diff</th><th data-k="srs" data-t="n">SRS</th>
      <th data-k="wt" data-t="n">Win total</th><th data-k="rank" data-t="n">Analyst rank</th>
    </tr></thead><tbody></tbody></table></div>
  </section>

  ${DIVS.map(d=>`
    <section class="div-block" data-conf="${d.slice(0,3)}">
      <div class="div-head"><h3>${d}</h3><span>${DIVNOTE[d]}</span></div>
      <div class="pair">
      ${TEAMS.filter(t=>t.div===d).map(t=>teamCard(t, t.sub, [
        {t:"What changed", tone:"n", items:t.facts},
        {t:"The case for them", tone:"up", items:t.up},
        {t:"The case against them", tone:"down", items:t.down}
      ], [
        ["2025", t.rec], ["diff", sign(t.pd)], ["SRS", sign(t.srs.toFixed(1))],
        ["win total", t.wt], ["analyst rank", t.rank]
      ])).join("")}
      </div>
    </section>`).join("")}
  <p class="empty" id="empty">No team matches that search.</p>
  ${FOOTER}`;
}

/* ============================ week tab ============================ */
function renderWeek(w){
  if (!w) return `<p class="empty on">That week is not loaded.</p>`;
  const recap = w.type === "recap";
  return `
  <section class="pagehead nosearch">
    <div class="eyebrow ${w.status==="sample"?"sample":""}"><i></i>${w.dates}</div>
    <h2>${w.headline}</h2>
    <p>${w.intro}</p>
    ${w.status==="sample" ? `<p class="sampleflag"><strong>Sample data.</strong> Nothing on this tab is real. It exists to show what a played week looks like before one has been played.</p>` : ""}
  </section>

  <section class="sec nosearch">
    <div class="sec-head"><h3>${recap ? "Results" : "The slate"}</h3><p>${w.games.length} games. Click one to jump to it. Kickoffs show in your local time${TZFMT?" ("+TZFMT+")":""}.</p></div>
    <div class="slate">
      ${w.games.map(g=>{
        const a=T[g.away], h=T[g.home];
        const sc = (g.awayScore!=null&&g.homeScore!=null) ? `<span class="score">${g.awayScore}<em style="color:var(--ink-3);font-weight:500;padding:0 3px">-</em>${g.homeScore}</span>` : "";
        const k = kickOf(g);
        return `<a class="slot" href="#g-${g.away}-${g.home}">
          <div class="when">${k.day} &middot; ${k.time}</div>
          <div class="vs"><i style="background:${a.color}"></i>${a.ab}<em>at</em><i style="background:${h.color}"></i>${h.ab}${sc}</div>
          <div class="note">${g.tv} &middot; ${g.venue}</div></a>`;
      }).join("")}
    </div>
  </section>

  <div class="games">${w.games.map(g=>{
    const a=T[g.away], h=T[g.home];
    const sc = (g.awayScore!=null&&g.homeScore!=null) ? `Final ${g.awayScore}-${g.homeScore} &middot; ` : "";
    const k = kickOf(g);
    return `<section class="game" id="g-${g.away}-${g.home}">
      <div class="game-head">
        <h3><i style="background:${a.color}"></i>${a.name}<em>at</em><i style="background:${h.color}"></i>${h.name}</h3>
        <div class="meta">${sc}${k.day}${sc?"":" &middot; "+k.time} &middot; ${g.tv}</div>
      </div>
      ${g.note?`<p class="game-note">${g.note}</p>`:""}
      <button class="fsbtn" data-game="${g.away}-${g.home}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Full Stats Preview</button>
      <article class="card duo">${teamSide(g, g.away, w)}${teamSide(g, g.home, w)}</article>
    </section>`;
  }).join("")}</div>

  <p class="empty" id="empty">No team matches that search.</p>
  ${TOOLS(w)}
  ${FOOTER}`;
}
/* One team's half of the combined game card. Click it to open the full breakdown. */
function teamSide(g, ab, w){
  const t = T[ab], entry = (w.teams||{})[ab] || {};
  const sub = entry.headline || "No writeup loaded yet.";
  const detail = [entry.matchup||[], entry.strengths||[], entry.weaknesses||[], g.keys||[]].map(a=>a.join(" ")).join(" ");
  const search = esc([t.name, t.ab, t.div, sub, detail].join(" "));
  return `<div class="tm" id="${slug(t.name)}-${ACTIVE}" style="--tc:${t.color}" data-conf="${t.conf}" data-search="${search}"
      data-team="${ab}" data-game="${g.away}-${g.home}" role="button" tabindex="0" aria-label="Open the ${t.name} breakdown">
    <div class="card-top">
      <div class="row">
        <div class="badge" style="color:${txt(t.color)}">${t.ab}</div>
        <div><h4>${t.name}</h4><div class="sub">${sub}</div></div>
      </div>
      <div class="mini"><span class="pill"><b>${t.rec}</b>2025</span><span class="pill"><b>${t.rank}</b>rank</span></div>
    </div>
    ${rankPanel(g, ab, w)}
    <div class="tm-more">Full breakdown<span aria-hidden="true">&rsaquo;</span></div>
  </div>`;
}

/* ============================ ranks ============================ */
const BASE = (()=>{
  const rankBy = (arr, key, desc) => {
    const s = [...arr].sort((a,b)=> desc ? b[key]-a[key] : a[key]-b[key]);
    const m = {}; s.forEach((t,i)=> m[t.ab] = i+1); return m;
  };
  const off = rankBy(TEAMS,"pf",true);      // most points scored in 2025
  const def = rankBy(TEAMS,"pa",false);     // fewest points allowed in 2025
  const srs = rankBy(TEAMS,"srs",true);     // 2025 overall finish
  const ppg = rankBy(TEAMS,"pf",true);      // points per game, 2025
  const tom = rankBy(TEAMS,"to",true);      // turnover differential, 2025
  const m = {}; TEAMS.forEach(t => m[t.ab] = {off:off[t.ab], def:def[t.ab], srs:srs[t.ab], ppg:ppg[t.ab], tom:tom[t.ab],
    ppgv:Math.round(t.pf/17*10)/10, tov:t.to});
  return m;
})();
function defaultGrades(ab){
  const b = BASE[ab], t = T[ab];
  return { overall:{rank:t.rank, prev:b.srs}, offense:{rank:b.off}, defense:{rank:b.def} };
}
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
const ORD = n => { const s=["th","st","nd","rd"], v=n%100; return n + "<sup>" + (s[(v-20)%10]||s[v]||s[0]) + "</sup>"; };
function deltaChip(g){
  if (!g || g.rank==null || g.prev==null) return '<span class="delta none">0</span>';
  const d = g.prev - g.rank;
  if (d === 0) return '<span class="delta flat">even</span>';
  return '<span class="delta ' + (d>0?"up":"down") + '">' + (d>0?"\u25B2":"\u25BC") + " " + Math.abs(d) + '</span>';
}
function gradeBlock(w, ab, grades){
  const g = grades || defaultGrades(ab);
  const cap = w.type === "outlook"
    ? "Preseason rank, change since 2025 finish"
    : "Rank after " + w.label + ", change from last week";
  const cell = (lab, o) => `<div class="grade"><span class="lab">${lab}</span>
    <span class="val">${o && o.rank!=null ? ORD(o.rank) : "&ndash;"}</span>${deltaChip(o)}</div>`;
  return `<div class="gradecap">${cap}</div><div class="grades">
    ${cell("Overall", g.overall)}${cell("Offense", g.offense)}${cell("Defense", g.defense)}
  </div>`;
}

/* ============================ matchup block ============================ */
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
function vsBlock(g, w){
  const a = T[g.away], hm = T[g.home];
  const ra = rk(g.away, w), rh = rk(g.home, w);
  const row = (lab, x, y) => {
    const bx = x.rank < y.rank, by = y.rank < x.rank;
    return `<div class="vrow">
      <div class="vnum ${bx?"better":""}">${ORD(x.rank)}</div>
      <div class="vlab">${lab}</div>
      <div class="vnum ${by?"better":""}">${ORD(y.rank)}</div>
    </div>`;
  };
  return `<div class="vsgrid">
    <div class="vteam"><i style="background:${a.color}"></i>${a.ab}</div>
    <div class="vh">rank of 32</div>
    <div class="vteam r">${hm.ab}<i style="background:${hm.color}"></i></div>
    ${row("Overall", ra.overall, rh.overall)}
    ${row("Offense", ra.offense, rh.offense)}
    ${row("Defense", ra.defense, rh.defense)}
  </div>`;
}
function cmpTable(g, w){
  const a = T[g.away], hm = T[g.home];
  const num = v => Math.round(v*10)/10;
  const base = [
    {label:"Points per game", a:num(a.pf/17), h:num(hm.pf/17), hi:"a", note:"2025"},
    {label:"Points allowed", a:num(a.pa/17), h:num(hm.pa/17), hi:"lo", note:"2025"},
    {label:"Point differential", a:a.pd, h:hm.pd, hi:"sign", note:"2025"},
    {label:"SRS", a:num(a.srs), h:num(hm.srs), hi:"sign", note:"2025"},
    {label:"Posted win total", a:a.wt, h:hm.wt, hi:"a", note:"2026"},
    {label:"Analyst rank", a:a.rank, h:hm.rank, hi:"lo", note:"of 32"}
  ];
  const rows = base.concat(g.rows||[]);
  const fmtv = (v, hi) => (hi==="sign" && typeof v==="number" && v>0) ? "+"+v : v;
  const cell = (v, other, hi) => {
    const n = parseFloat(v), o = parseFloat(other);
    const better = isNaN(n)||isNaN(o)||n===o ? false : (hi==="lo" ? n<o : n>o);
    return `<td class="${better?"win":""}">${fmtv(v, hi)}</td>`;
  };
  return `<table class="cmp"><thead><tr>
      <th>${a.ab}</th><th></th><th>${hm.ab}</th>
    </tr></thead><tbody>
    ${rows.map(r=>`<tr>
      ${cell(r.a, r.h, r.hi)}
      <td class="mid">${r.label}${r.note?`<small>${r.note}</small>`:""}</td>
      ${cell(r.h, r.a, r.hi)}
    </tr>`).join("")}
  </tbody></table>`;
}
/* ============================ momentum ============================ */
function streakOf(ab){
  const res = [];
  WEEKS.forEach(wk=>(wk.games||[]).forEach(g=>{
    if (g.awayScore==null || g.homeScore==null) return;
    if (g.away!==ab && g.home!==ab) return;
    const home = g.home===ab, mine = home?g.homeScore:g.awayScore, th = home?g.awayScore:g.homeScore;
    res.push(mine>th?"W":mine<th?"L":"T");
  }));
  if (!res.length) return {label:"Season opener", cls:"", note:"no games played"};
  let n = 1;
  for (let i=res.length-1; i>0 && res[i]===res[i-1]; i--) n++;
  const k = res[res.length-1];
  const w = res.filter(x=>x==="W").length, l = res.filter(x=>x==="L").length, t = res.filter(x=>x==="T").length;
  const rec = w+"-"+l+(t?"-"+t:"");
  if (k==="T") return {label:"Tied last out", cls:"", note:rec};
  if (k==="W") return n>=3 ? {label:"Hot Streak! W"+n, cls:"hot", note:rec}
              : n===2 ? {label:"Rolling, W2", cls:"warm", note:rec}
              : {label:"Won last out", cls:"warm", note:rec};
  return n>=3 ? {label:"Skid, L"+n, cls:"cool", note:rec}
       : n===2 ? {label:"Cooling off, L2", cls:"cool", note:rec}
       : {label:"Lost last out", cls:"cool", note:rec};
}

/* ============================ rankings panel ============================ */
function rankPanel(g, ab, w){
  const opp = T[g.home===ab ? g.away : g.home];
  const me = rk(ab, w), them = rk(opp.ab, w);
  const row = (lab, a, b) => {
    const cls = a.rank < b.rank ? "better" : a.rank > b.rank ? "worse" : "";
    const val = a.val != null ? `<span class="rv">${a.val}</span>` : "";
    return `<div class="nm">${lab}</div><div class="rvcell">${val}</div>
      <div class="v ${cls}">${ORD(a.rank)}</div>`;
  };
  return `<div class="panel rank">
    <h5>${ICON.rank}Team rankings</h5>
    <div class="rk">
      <div class="hd l"></div><div class="hd"></div><div class="hd">rank of 32</div>
      ${row("Overall", me.overall, them.overall)}
      ${row("Offense", me.offense, them.offense)}
      ${row("Defense", me.defense, them.defense)}
      ${row("Points per game", me.ppg, them.ppg)}
      ${row("Turnover margin", me.turnover, them.turnover)}
    </div>
  </div>`;
}

/* ============================ shared card ============================ */
function teamCard(t, sub, sections, mini, extra){
  const search = esc([t.name,t.ab,t.div,sub,sections.map(s=>s.t+" "+s.items.join(" ")).join(" "), extra||""].join(" "));
  return `<article class="card" id="${slug(t.name)}-${ACTIVE}" style="--tc:${t.color}" data-conf="${t.conf}" data-search="${search}">
    <div class="card-top">
      <div class="row">
        <div class="badge" style="color:${txt(t.color)}">${t.ab}</div>
        <div><h4>${t.name}</h4><div class="sub">${sub}</div></div>
      </div>
      <div class="mini">${mini.map(m=>`<span class="pill ${m[2]||""}"><b>${m[1]}</b>${m[0]}</span>`).join("")}</div>
    </div>
    <div class="panels">${sections.map(s=>`
      <div class="panel ${s.tone==="up"?"up":s.tone==="down"?"down":""} ${s.span?"span":""}">
        <h5>${ICON[s.tone==="up"?"up":s.tone==="down"?"down":"n"]}${s.t}</h5>
        ${s.items.length ? `<ul>${li(s.items)}</ul>` : `<div class="pending">Nothing loaded for this section yet.</div>`}
      </div>`).join("")}${extra||""}</div>
  </article>`;
}

/* ============================ board sorting ============================ */
let boardRows=[], sortKey="rank", sortDir=1;
function paintBoard(rows){
  const tb = document.querySelector("#board tbody"); if(!tb) return;
  tb.innerHTML = rows.map(t=>`<tr><td><a href="#${slug(t.name)}-guide"><i class="dot" style="background:${t.color}"></i>${t.name}</a></td>
    <td>${t.rec}</td><td>${t.pf}</td><td>${t.pa}</td>
    <td class="${t.pd>0?'pos':'neg'}">${sign(t.pd)}</td>
    <td class="${t.srs>0?'pos':'neg'}">${sign(t.srs.toFixed(1))}</td>
    <td>${t.wt}</td><td>${t.rank}</td></tr>`).join("");
}
function wireBoard(){
  boardRows = [...TEAMS].sort((a,b)=>a.rank-b.rank); sortKey="rank"; sortDir=1;
  paintBoard(boardRows);
  document.querySelectorAll("#board th").forEach(th=>{
    th.addEventListener("click",()=>{
      const k=th.dataset.k, num=th.dataset.t==="n";
      sortDir = (k===sortKey) ? -sortDir : (num?-1:1); sortKey=k;
      boardRows.sort((a,b)=> num ? (a[k]-b[k])*sortDir : String(a[k]).localeCompare(String(b[k]))*sortDir);
      document.querySelectorAll("#board th").forEach(x=>x.removeAttribute("aria-sort"));
      th.setAttribute("aria-sort", sortDir===1?"ascending":"descending");
      paintBoard(boardRows);
    });
  });
  const rt = document.querySelector('#board th[data-k="rank"]'); if(rt) rt.setAttribute("aria-sort","ascending");
}

/* ============================ filtering ============================ */
function apply(){
  clearMarks();
  const q = document.getElementById("q");
  const term = (q.value||"").trim().toLowerCase();
  document.body.classList.toggle("searching", !!term);
  document.getElementById("qx").classList.toggle("on", !!term);
  let shown = 0;
  document.querySelectorAll(".card:not(.duo), .tm").forEach(c=>{
    const on = (conf==="all"||c.dataset.conf===conf) && (!term || c.dataset.search.toLowerCase().includes(term));
    c.classList.toggle("hide", !on); if(on) shown++;
  });
  document.querySelectorAll(".div-block, .game").forEach(s=>{
    s.style.display = s.querySelectorAll(".card:not(.duo):not(.hide), .tm:not(.hide)").length ? "" : "none";
  });
  const r = document.getElementById("results");
  SHOWN = shown;
  if (term){
    const label = ACTIVE==="guide" ? "the season guide" : (WEEKS.find(w=>w.id===ACTIVE)||{}).label;
    r.innerHTML = `<span><b>${shown}</b> ${shown===1?"team":"teams"} in ${label}${conf!=="all"?" ("+conf+" only)":""}</span>
      <span class="nav">
        <span class="pos" id="rpos"></span>
        <button type="button" id="rprev" title="Previous match (Shift+Enter)">&uarr;</button>
        <button type="button" id="rnext" title="Next match (Enter)">&darr;</button>
        <button type="button" id="rclear">Clear</button>
      </span>`;
    r.classList.add("on");
    document.getElementById("rclear").addEventListener("click", clearSearch);
    document.getElementById("rprev").addEventListener("click", ()=>step(-1));
    document.getElementById("rnext").addEventListener("click", ()=>step(1));
    HITS = term.length >= 2 ? markAll(term) : [];
    CUR = -1;
    if (HITS.length) step(1, true);
    paintPos();
  } else { r.classList.remove("on"); r.innerHTML=""; }
  const eEl=document.getElementById("empty"); if(eEl) eEl.classList.toggle("on", shown===0);
}
let HITS = [], CUR = -1, SHOWN = 0;
function clearMarks(){
  const root = document.getElementById("view"); if(!root) return;
  root.querySelectorAll("mark.hit").forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
  root.querySelectorAll(".panel, .card-top, .nextrow, .nextvenue").forEach(n => n.normalize());
  root.querySelectorAll(".hasCur").forEach(c => c.classList.remove("hasCur"));
  HITS = []; CUR = -1;
}
function markAll(term){
  const out = [];
  document.querySelectorAll(".card:not(.duo):not(.hide), .tm:not(.hide)").forEach(card=>{
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest("mark")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node=>{
      const txt = node.nodeValue, low = txt.toLowerCase();
      let i = low.indexOf(term);
      if (i < 0) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      while (i >= 0){
        if (i > last) frag.appendChild(document.createTextNode(txt.slice(last, i)));
        const m = document.createElement("mark");
        m.className = "hit";
        m.textContent = txt.slice(i, i + term.length);
        frag.appendChild(m); out.push(m);
        last = i + term.length;
        i = low.indexOf(term, last);
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  });
  return out;
}
function paintPos(){
  const el = document.getElementById("rpos"); if(!el) return;
  el.textContent = HITS.length ? (CUR+1) + " of " + HITS.length : (SHOWN ? "matches in team details" : "no matches");
  const p = document.getElementById("rprev"), nx = document.getElementById("rnext");
  if (p) p.disabled = HITS.length < 2;
  if (nx) nx.disabled = HITS.length < 2;
}
function step(dir, first){
  if (!HITS.length) return;
  if (HITS[CUR]){
    HITS[CUR].classList.remove("cur");
    const c = HITS[CUR].closest(".tm, .card"); if (c) c.classList.remove("hasCur");
  }
  CUR = first ? 0 : (CUR + dir + HITS.length) % HITS.length;
  const m = HITS[CUR];
  m.classList.add("cur");
  const card = m.closest(".tm, .card"); if (card) card.classList.add("hasCur");
  m.scrollIntoView({block:"center", behavior: first ? "auto" : "smooth"});
  paintPos();
}
function clearSearch(){
  const q=document.getElementById("q"); q.value=""; apply(); q.focus();
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
      <p class="hint">A loaded week lives in this browser tab only. To keep it for good, send the JSON back to Claude and get a rebuilt file with the week baked in.</p>
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
  strengths   - 3 bullets on what this team does well as a unit, and name who has to step up inside it.
  weaknesses  - 3 bullets on where it breaks down, including injuries and what sources flag as a concern.
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
      headline:"", last:[], strengths:[], weaknesses:[],
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
  const w = WEEKS.find(x=>x.id===ACTIVE);
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
    buildNav();
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
document.getElementById("q").addEventListener("input", apply);
document.getElementById("qx").addEventListener("click", clearSearch);
document.getElementById("q").addEventListener("keydown", e=>{
  if (e.key === "Escape") { clearSearch(); return; }
  if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
});
document.querySelectorAll(".chip").forEach(b=>{
  b.addEventListener("click",()=>{
    conf = b.dataset.conf;
    document.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed", x===b));
    apply();
  });
});
(function wireTabScroll(){
  const s = document.getElementById("weeknav");
  s.addEventListener("scroll", tabEdges, {passive:true});
  window.addEventListener("resize", tabEdges);
  document.getElementById("tleft").addEventListener("click", ()=>{ s.scrollBy({left:-220, behavior:"smooth"}); setTimeout(tabEdges,350); });
  document.getElementById("tright").addEventListener("click", ()=>{ s.scrollBy({left:220, behavior:"smooth"}); setTimeout(tabEdges,350); });
  s.addEventListener("wheel", e=>{
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const max = s.scrollWidth - s.clientWidth;
    if ((e.deltaY < 0 && s.scrollLeft <= 0) || (e.deltaY > 0 && s.scrollLeft >= max)) return;
    e.preventDefault();
    s.scrollLeft += e.deltaY;
    tabEdges();
  }, {passive:false});
  setTimeout(tabEdges, 100);
})();
/* full stats overlay */
function openStats(key){
  const w = WEEKS.find(x=>x.id===ACTIVE); if(!w) return;
  const g = (w.games||[]).find(x=>x.away+"-"+x.home===key); if(!g) return;
  const a = T[g.away], hm = T[g.home], k = kickOf(g);
  const num = v => Math.round(v*10)/10;
  const rows = [
    {label:"Points per game", a:num(a.pf/17), h:num(hm.pf/17), hi:"a", note:"2025"},
    {label:"Points allowed", a:num(a.pa/17), h:num(hm.pa/17), hi:"lo", note:"2025"},
    {label:"Point differential", a:a.pd, h:hm.pd, hi:"sign", note:"2025"},
    {label:"SRS", a:num(a.srs), h:num(hm.srs), hi:"sign", note:"2025"},
    {label:"Posted win total", a:a.wt, h:hm.wt, hi:"a", note:"2026"},
    {label:"Analyst rank", a:a.rank, h:hm.rank, hi:"lo", note:"of 32"},
    {label:"Turnover margin", a:a.to, h:hm.to, hi:"sign", note:"2025"}
  ].concat(g.rows||[]);
  const ra = rk(g.away, w), rh = rk(g.home, w);
  const rankRows = [
    {label:"Overall rank", a:ra.overall.rank, h:rh.overall.rank, hi:"lo", note:"of 32"},
    {label:"Offense rank", a:ra.offense.rank, h:rh.offense.rank, hi:"lo", note:"of 32"},
    {label:"Defense rank", a:ra.defense.rank, h:rh.defense.rank, hi:"lo", note:"of 32"},
    {label:"Points per game rank", a:ra.ppg.rank, h:rh.ppg.rank, hi:"lo", note:"of 32"},
    {label:"Turnover margin rank", a:ra.turnover.rank, h:rh.turnover.rank, hi:"lo", note:"of 32"}
  ];
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
  const sc = (g.awayScore!=null) ? ` &middot; Final ${g.awayScore}-${g.homeScore}` : "";
  document.getElementById("ovbox").innerHTML = `
    <div class="ovhd">
      <div>
        <h3 id="ovtitle">${a.name} at ${hm.name}</h3>
        <div class="sub">${k.day} &middot; ${k.time} &middot; ${g.tv} &middot; ${g.venue}${sc}${g.line?" &middot; "+g.line:""}</div>
      </div>
      <button class="x" id="ovx" aria-label="Close">&times;</button>
    </div>
    <div class="ovbody">
      <div class="ovlegend">
        <span><i style="background:${a.color}"></i>${a.name}</span>
        <span><i style="background:${hm.color}"></i>${hm.name}</span>
        <span>Green marks the better number</span>
      </div>
      <div class="ovsec">Current rankings</div>
      ${rankRows.map(bar).join("")}
      <div class="ovsec">Team numbers</div>
      ${rows.map(bar).join("")}
      ${(g.keys||[]).length ? `<div class="ovsec">What to watch</div><ul class="ovkeys">${li(g.keys)}</ul>` : ""}
    </div>`;
  document.getElementById("ov").classList.add("on");
  document.body.style.overflow = "hidden";
  document.getElementById("ovx").addEventListener("click", closeStats);
}
/* team breakdown overlay: matchup preview, positives, negatives, keys to victory */
function openTeam(ab, key){
  const w = WEEKS.find(x=>x.id===ACTIVE); if(!w) return;
  const games = w.games||[];
  const g = games.find(x=>x.away+"-"+x.home===key) || games.find(x=>x.away===ab||x.home===ab);
  const t = T[ab]; if(!t) return;
  const entry = (w.teams||{})[ab] || {};
  const ctx = [];
  if (g){
    const home = g.home===ab, opp = T[home?g.away:g.home], k = kickOf(g);
    if (g.awayScore!=null && g.homeScore!=null){
      const mine = home?g.homeScore:g.awayScore, theirs = home?g.awayScore:g.homeScore;
      const res = mine>theirs?"Won":mine<theirs?"Lost":"Tied";
      ctx.push(`${res} ${mine}-${theirs} ${home?"vs":"at"} ${opp.name}`);
    } else ctx.push(`${home?"vs":"at"} ${opp.name} &middot; ${k.day} &middot; ${k.time}`);
    if (g.tv) ctx.push(g.tv);
  }
  ctx.push(`${t.rec} in 2025 &middot; Rank ${t.rank}`);
  const sec = (label, tone, items) => `<div class="ovsec ${tone}">${label}</div>` +
    (items && items.length ? `<ul class="ovkeys">${li(items)}</ul>` : `<div class="pending">Nothing loaded for this section yet.</div>`);
  document.getElementById("ovbox").innerHTML = `
    <div class="ovhd">
      <div class="row">
        <div class="badge" style="background:${t.color};color:${txt(t.color)}">${t.ab}</div>
        <div>
          <h3 id="ovtitle">${t.name}</h3>
          <div class="sub">${entry.headline ? entry.headline + "<br>" : ""}${ctx.join(" &middot; ")}</div>
        </div>
      </div>
      <button class="x" id="ovx" aria-label="Close">&times;</button>
    </div>
    <div class="ovbody team">
      ${sec("Matchup preview", "n", entry.matchup)}
      ${sec("Positives", "up", entry.strengths)}
      ${sec("Negatives", "down", entry.weaknesses)}
      ${sec("Keys to victory", "info", g ? g.keys : [])}
    </div>`;
  document.getElementById("ov").classList.add("on");
  document.body.style.overflow = "hidden";
  document.getElementById("ovx").addEventListener("click", closeStats);
}
function closeStats(){
  document.getElementById("ov").classList.remove("on");
  document.body.style.overflow = "";
}
document.getElementById("view").addEventListener("click", e=>{
  const b = e.target.closest(".fsbtn"); if (b) return openStats(b.dataset.game);
  const s = e.target.closest(".tm"); if (s) openTeam(s.dataset.team, s.dataset.game);
});
document.getElementById("view").addEventListener("keydown", e=>{
  if (e.key !== "Enter" && e.key !== " ") return;
  const s = e.target.closest(".tm"); if (!s || e.target !== s) return;
  e.preventDefault(); openTeam(s.dataset.team, s.dataset.game);
});
document.getElementById("ov").addEventListener("click", e=>{ if (e.target.id==="ov") closeStats(); });
document.addEventListener("keydown", e=>{ if (e.key==="Escape") closeStats(); });
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
buildNav();
show("wk1");

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
      buildNav();
      show(latestWeekId());
    })
    .catch(()=>{});
})();
