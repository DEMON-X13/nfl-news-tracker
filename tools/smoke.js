/* Smoke test for the tracker. Renders index.html in jsdom with the split css/js/data files,
   then asserts the counts and interactions that every change should keep working.
   Run from the repo root:  npm install --no-save jsdom && node tools/smoke.js            */
const fs = require('fs'), path = require('path');
const { JSDOM, requestInterceptor, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
const resources = { interceptors: [ requestInterceptor(req => {
  const u = new URL(req.url);
  if (u.protocol !== 'file:') return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });  // fonts, skipped
  let p = decodeURIComponent(u.pathname); if (p.length > 2 && p[2] === ':') p = p.slice(1);                       // strip leading slash before a drive letter
  try { return new Response(fs.readFileSync(p), { status: 200, headers: { 'Content-Type': TYPES[path.extname(p)] || 'text/plain' } }); }
  catch (e) { return new Response('', { status: 404 }); }
}) ] };

const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message));
vc.on('error', m => errs.push('console.error: ' + m));

const indexPath = path.join(ROOT, 'index.html');
const dom = new JSDOM(fs.readFileSync(indexPath, 'utf8'), {
  url: 'file:///' + indexPath.split(path.sep).join('/'),
  runScripts: 'dangerously', resources, pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.scrollTo = () => {}; w.addEventListener('error', e => errs.push('window.error: ' + e.message));
    w.Element.prototype.scrollIntoView = function(){}; w.Element.prototype.scrollBy = function(){}; w.HTMLElement.prototype.scrollTo = function(){};
  }
});

let failed = 0;
const check = (label, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (detail !== undefined ? '  (' + detail + ')' : '')); if (!ok) failed++; };

dom.window.addEventListener('load', () => {
  const w = dom.window, d = w.document;
  const n = sel => d.querySelectorAll(sel).length;
  const click = sel => { const el = d.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return el; };
  const g = expr => w.eval(expr);   // top-level const/let live in script scope, not on window

  check('no script errors', errs.length === 0, errs.join(' | ') || 'none');
  check('opens on Week 1', g('ACTIVE') === 'wk1', g('ACTIVE'));
  check('16 games', n('.game') === 16, n('.game'));
  check('32 team cards', n('.card') === 32, n('.card'));
  check('160 panels', n('.panel') === 160, n('.panel'));
  check('32 rank panels', n('.panel.rank') === 32, n('.panel.rank'));
  check('32 next panels', n('.panel.nx') === 32, n('.panel.nx'));
  check('19 week tabs (guide + 18 weeks)', n('.wtab') === 19, n('.wtab'));

  click('.wtab[data-id="guide"]');
  check('season guide renders 32 cards', n('.card') === 32 && n('.game') === 0);
  const first = () => d.querySelector("#board tbody tr td").textContent;
  click("#board th[data-k=\"pf\"]"); const desc = first();     // first click on a number column sorts high to low
  click("#board th[data-k=\"pf\"]"); const asc = first();      // second click flips it
  check("board sorts on header clicks", desc !== asc && d.querySelector("#board th[data-k=\"pf\"]").getAttribute("aria-sort") === "ascending", desc + " / " + asc);

  click('.wtab[data-id="wk1"]');
  click('.chip[data-conf="AFC"]');
  check('AFC filter hides 16 cards', n('.card.hide') === 16, n('.card.hide'));
  click('.chip[data-conf="all"]');

  const q = d.getElementById('q'); q.value = 'Mahomes'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
  const hits = g('HITS.length'), cur0 = g('CUR');
  w.step(1);
  check('search returns hits and cycles', hits > 0 && cur0 === 0 && g('CUR') === 1, hits + ' hits');
  click('#qx');
  check('clear search resets', g('HITS.length') === 0 && q.value === '');

  click('.fsbtn');
  check('stats overlay opens', d.getElementById('ov').classList.contains('on') && d.getElementById('ovbox').innerHTML.length > 0);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape closes overlay', !d.getElementById('ov').classList.contains('on'));

  const wk = w.blankTemplate(); wk.id = 'wk99'; wk.label = 'Week 99'; wk.headline = 'Synthetic'; wk.intro = 'Round trip';
  wk.games = [{ away: 'DET', home: 'BUF', day: 'Thu', time: '8:15 PM ET', kick: '2026-09-18T00:15:00Z', tv: 'Prime Video', venue: 'Highmark Stadium', awayScore: 20, homeScore: 24 }];
  d.getElementById('io').value = JSON.stringify(wk); click('#btn-load');
  check('JSON load adds and shows a week', g('ACTIVE') === 'wk99' && g('WEEKS.length') === 2 && n('.game') === 1, d.getElementById('status').textContent);
  check('no errors after interactions', errs.length === 0, errs.join(' | ') || 'none');

  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
});
