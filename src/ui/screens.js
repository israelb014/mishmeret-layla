// Menu screens and overlays (Hebrew, RTL). Card-based layout, inline SVG icons.
import { icon, ICONS } from './icons.js';
import { HUD } from './hud.js';
import { settings, CROSSHAIR_COLORS } from '../core/settings.js';
import { CREDITS } from '../data/credits.js';
import { STAGES } from '../data/stages.js';

const QUALITY = [['low', 'נמוך'], ['medium', 'בינוני'], ['high', 'גבוה'], ['auto', 'אוטומטי']];
const CROSS = [['amber', 'ענבר'], ['cyan', 'תכלת'], ['lime', 'ירוק'], ['magenta', 'ורוד']];
const DIFFS = [['easy', 'קל', 'זמן תגובה ארוך, מתאים להתחלה'], ['normal', 'רגיל', 'האתגר שתוכנן למשחק'], ['hard', 'קשה', 'אויבים יורים מהר יותר']];
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const n = v => Number(v).toLocaleString('he-IL');

export class UI {
  constructor(app) {
    this.app = app;
    this.screens = document.getElementById('screens');
    this.hud = new HUD(document.getElementById('hud'), document.getElementById('fx-layer'));
    this.current = null;
    this.screens.addEventListener('pointerover', e => { if (e.target.closest('button:not([disabled])')) this.app.audio.play('ui_hover', { volume: 0.25, jitter: 0 }); });
  }

  // generic helpers --------------------------------------------------------
  open(html, cls = '') {
    this.screens.innerHTML = `<div class="screen ${cls}">${html}</div>`;
    this.current = this.screens.firstElementChild;
    this.screens.hidden = false;
    return this.current;
  }
  close() { this.screens.innerHTML = ''; this.current = null; }
  bind(root, map) {
    for (const [sel, fn] of Object.entries(map)) root.querySelectorAll(sel).forEach(el => el.addEventListener('click', e => { this.app.audio.play('ui_click', { volume: 0.6, jitter: 0 }); fn(e, el); }));
  }

  // forwarded to the HUD ---------------------------------------------------
  callout(t, s, sub) { this.hud.callout(t, s, sub); }
  popup(p, text, label, cls) { this.hud.popup(p, text, label, cls, this.app.renderer.camera); }
  bossBar(name, frac) { this.hud.bossBar(name, frac); }
  updateThreats(a, o, c) { this.hud.updateThreats(a, o, c); }

  // loading ----------------------------------------------------------------
  loading() {
    const el = this.open(`
      <div class="loading">
        <svg viewBox="0 0 200 200" class="load-ring">
          <circle cx="100" cy="100" r="84" class="ring-track"/>
          <circle cx="100" cy="100" r="84" class="ring-fill" transform="rotate(-90 100 100)"/>
        </svg>
        <div class="load-center"><div class="load-pct" dir="ltr">0%</div><div class="load-label">טוען</div></div>
        <h1 class="logo">משמרת לילה</h1>
        <p class="load-tip">טיפ: ירי בנשק שביד האויב מנטרל אותו ומזכה ב־300 נקודות</p>
      </div>`, 'center');
    const fill = el.querySelector('.ring-fill'), pct = el.querySelector('.load-pct');
    const C = 2 * Math.PI * 84;
    fill.style.strokeDasharray = `${C}`;
    return v => { fill.style.strokeDashoffset = `${C * (1 - v)}`; pct.textContent = `${Math.round(v * 100)}%`; };
  }

  touchNotice() {
    const d = document.createElement('div');
    d.className = 'touch-notice';
    d.innerHTML = `${icon('mouse')}<h2>המשחק מיועד למחשב עם עכבר</h2><p>כדי לשחק ב״משמרת לילה״ יש להיכנס מדפדפן במחשב שולחני או נייד, ולכוון ולירות בעזרת העכבר.</p>`;
    document.body.appendChild(d);
  }

  // main menu --------------------------------------------------------------
  menu() {
    const el = this.open(`
      <div class="menu">
        <header class="brand">
          <div class="brand-badge">${icon('crosshair')}</div>
          <h1 class="logo">משמרת לילה</h1>
          <p class="tagline">שלושה שלבים. שש יריות במחסנית. אף אזרח לא נפגע.</p>
        </header>
        <nav class="menu-list">
          <button class="btn primary" data-a="start">${icon('play')}<span>התחל</span></button>
          <button class="btn" data-a="stages">${icon('stages')}<span>בחירת שלב</span></button>
          <button class="btn" data-a="scores">${icon('trophy')}<span>שיאים</span></button>
          <button class="btn" data-a="settings">${icon('gear')}<span>הגדרות</span></button>
          <button class="btn" data-a="credits">${icon('info')}<span>קרדיטים</span></button>
        </nav>
        <footer class="menu-help">
          <span>${icon('mouse')} עכבר: כיוון וירי</span><span><kbd>R</kbd> / <kbd>רווח</kbd> / קליק ימני: טעינה</span><span><kbd>Esc</kbd>: השהיה</span>
        </footer>
      </div>`, 'menu-screen');
    this.bind(el, {
      '[data-a=start]': () => this.difficulty(0),
      '[data-a=stages]': () => this.stageSelect(),
      '[data-a=scores]': () => this.highscores(),
      '[data-a=settings]': () => this.settings(() => this.menu()),
      '[data-a=credits]': () => this.credits(),
    });
  }

  difficulty(stageIndex) {
    const el = this.open(`
      <div class="panel">
        <h2 class="title">בחירת רמת קושי</h2>
        <div class="cards three">
          ${DIFFS.map(([k, label, desc], i) => `
            <button class="card choice ${k === 'normal' ? 'featured' : ''}" data-d="${k}">
              <div class="pips">${[0, 1, 2].map(j => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>
              <b>${label}</b><small>${desc}</small>
            </button>`).join('')}
        </div>
        <button class="btn ghost back">${icon('back')}<span>חזרה</span></button>
      </div>`);
    this.bind(el, { '[data-d]': (e, b) => this.app.startRun(b.dataset.d, stageIndex), '.back': () => this.menu() });
  }

  stageSelect() {
    const unlocked = settings.get('unlocked');
    const el = this.open(`
      <div class="panel wide">
        <h2 class="title">בחירת שלב</h2>
        <div class="cards three">
          ${STAGES.map((s, i) => `
            <button class="card stage-card s${i + 1}" data-s="${i}" ${i + 1 > unlocked ? 'disabled' : ''}>
              <div class="stage-num">${i + 1}</div>
              <b>${s.title}</b><small>${s.subtitle}</small>
              ${i + 1 > unlocked ? `<div class="locked">${icon('lock')}<span>סיים את השלב הקודם</span></div>` : ''}
            </button>`).join('')}
        </div>
        <button class="btn ghost back">${icon('back')}<span>חזרה</span></button>
      </div>`);
    this.bind(el, { '[data-s]': (e, b) => this.difficulty(+b.dataset.s), '.back': () => this.menu() });
  }

  highscores(highlight = -1, back = () => this.menu()) {
    const hs = settings.get('highscores');
    const el = this.open(`
      <div class="panel">
        <h2 class="title">${icon('trophy')} שיאים</h2>
        <div class="card table-card">
          ${hs.length ? `<table class="scores">
            <thead><tr><th>#</th><th>שם</th><th>ניקוד</th><th>שלב</th><th>דירוג</th></tr></thead>
            <tbody>${hs.map((h, i) => `<tr class="${i === highlight ? 'hl' : ''}"><td>${i + 1}</td><td>${escapeHtml(h.name)}</td><td dir="ltr">${n(h.score)}</td><td>${h.stage}</td><td><span class="rank-chip r${h.rank}">${h.rank}</span></td></tr>`).join('')}</tbody>
          </table>` : `<p class="empty">עדיין אין שיאים. זה הזמן לקבוע את הראשון.</p>`}
        </div>
        <button class="btn ghost back">${icon('back')}<span>חזרה</span></button>
      </div>`);
    this.bind(el, { '.back': back });
  }

  nameEntry(score, stage, rank, done) {
    const el = this.open(`
      <div class="panel narrow">
        <h2 class="title">שיא חדש!</h2>
        <div class="card center-card">
          <div class="big-score" dir="ltr">${n(score)}</div>
          <label class="field"><span>השם שלך (עד 10 תווים)</span>
            <input class="ui-interactive" maxlength="10" dir="auto" autocomplete="off" spellcheck="false" placeholder="שוטר/ת" />
          </label>
          <button class="btn primary save">${icon('star')}<span>שמור</span></button>
        </div>
      </div>`);
    const input = el.querySelector('input');
    setTimeout(() => input.focus(), 50);
    const save = () => {
      const name = (input.value.trim() || 'שוטר/ת').slice(0, 10);
      settings.addHighscore({ name, score, stage, rank });
      const idx = settings.get('highscores').findIndex(h => h.name === name && h.score === score);
      done(idx);
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    this.bind(el, { '.save': save });
  }

  settings(back) {
    const s = k => settings.get(k);
    const el = this.open(`
      <div class="panel">
        <h2 class="title">${icon('gear')} הגדרות</h2>
        <div class="card form">
          <label class="row">${icon('music')}<span>עוצמת מוזיקה</span><input class="ui-interactive" type="range" min="0" max="1" step="0.05" data-k="musicVolume" value="${s('musicVolume')}"><output dir="ltr">${Math.round(s('musicVolume') * 100)}</output></label>
          <label class="row">${icon('speaker')}<span>עוצמת אפקטים</span><input class="ui-interactive" type="range" min="0" max="1" step="0.05" data-k="sfxVolume" value="${s('sfxVolume')}"><output dir="ltr">${Math.round(s('sfxVolume') * 100)}</output></label>
          <div class="row">${icon('monitor')}<span>איכות גרפיקה</span><div class="seg" data-k="quality">${QUALITY.map(([k, l]) => `<button class="${s('quality') === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div></div>
          <div class="row">${icon('crosshair')}<span>צבע הכוונת</span><div class="swatches" data-k="crosshair">${CROSS.map(([k, l]) => `<button class="sw ${s('crosshair') === k ? 'on' : ''}" data-v="${k}" style="--c:${CROSSHAIR_COLORS[k]}" title="${l}" aria-label="${l}"></button>`).join('')}</div></div>
          <div class="row">${icon('shake')}<span>רעידת מסך</span><button class="toggle ${s('shake') ? 'on' : ''}" data-k="shake" role="switch" aria-checked="${s('shake')}"><i></i></button></div>
        </div>
        <button class="btn ghost back">${icon('back')}<span>חזרה</span></button>
      </div>`);
    el.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => {
      settings.set(r.dataset.k, +r.value); r.nextElementSibling.textContent = Math.round(r.value * 100);
      if (r.dataset.k === 'sfxVolume') this.app.audio.play('pistol', { volume: 0.4 });
    }));
    this.bind(el, {
      '.seg button': (e, b) => { settings.set('quality', b.dataset.v); b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); this.app.applyQuality(); },
      '.swatches button': (e, b) => { settings.set('crosshair', b.dataset.v); b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); },
      '.toggle': (e, b) => { const v = !settings.get('shake'); settings.set('shake', v); b.classList.toggle('on', v); b.setAttribute('aria-checked', v); this.app.renderer.shakeEnabled = v; },
      '.back': back,
    });
  }

  credits() {
    const el = this.open(`
      <div class="panel wide">
        <h2 class="title">${icon('info')} קרדיטים</h2>
        <p class="sub">כל הדמויות, הרכבים, האביזרים, המשטחים, הצלילים והמוזיקה במשחק הם נכסים בנחלת הכלל (CC0). תודה ליוצרים!</p>
        <div class="card credits-list">
          ${CREDITS.map(c => `<div class="credit"><b dir="auto">${escapeHtml(c.name)}</b><span class="who">${escapeHtml(c.author)}</span><span class="lic">${escapeHtml(c.license)}</span><span class="use">${escapeHtml(c.usage)}</span><a dir="ltr" href="${c.source.split(' ')[0]}" target="_blank" rel="noopener">${escapeHtml(c.source)}</a></div>`).join('')}
        </div>
        <p class="sub small">עיצוב, קוד ושלבים: מקוריים למשחק זה. גופנים: Secular One ו־Rubik (רישיון OFL).</p>
        <button class="btn ghost back">${icon('back')}<span>חזרה</span></button>
      </div>`);
    this.bind(el, { '.back': () => this.menu() });
  }

  // in game ----------------------------------------------------------------
  stageTitle(title, subtitle, dur = 5) {
    const old = document.querySelector('.stage-title');
    old?.remove();
    if (!title) return;
    const d = document.createElement('div');
    d.className = 'stage-title';
    d.style.setProperty('--dur', `${dur}s`);
    d.innerHTML = `<small>שלב ${this.app.game.stageIndex + 1}</small><h1>${title}</h1><p>${subtitle}</p><em>לחיצה לדילוג</em>`;
    document.getElementById('app').appendChild(d);
    setTimeout(() => d.remove(), dur * 1000 + 400);
  }

  pause() {
    const el = this.open(`
      <div class="panel narrow">
        <h2 class="title">השהיה</h2>
        <nav class="menu-list">
          <button class="btn primary" data-a="resume">${icon('play')}<span>המשך</span></button>
          <button class="btn" data-a="restart">${icon('restart')}<span>התחל שלב מחדש</span></button>
          <button class="btn" data-a="settings">${icon('gear')}<span>הגדרות</span></button>
          <button class="btn" data-a="quit">${icon('exit')}<span>יציאה לתפריט</span></button>
        </nav>
      </div>`, 'dim');
    this.bind(el, {
      '[data-a=resume]': () => this.app.resume(),
      '[data-a=restart]': () => this.app.restartStage(),
      '[data-a=settings]': () => this.settings(() => this.pause()),
      '[data-a=quit]': () => this.app.quitToMenu(),
    });
  }

  showGameOver(continuesLeft, score) {
    const C = 2 * Math.PI * 70;
    const el = this.open(`
      <div class="panel narrow gameover">
        <h2 class="title danger">המשחק נגמר</h2>
        <div class="card center-card">
          ${continuesLeft > 0 ? `
            <div class="count-wrap">
              <svg viewBox="0 0 160 160" class="count-ring"><circle cx="80" cy="80" r="70" class="ring-track"/><circle cx="80" cy="80" r="70" class="ring-fill" transform="rotate(-90 80 80)" style="stroke-dasharray:${C}"/></svg>
              <div class="count-num">10</div>
            </div>
            <p>להמשיך? הניקוד יתאפס, ההתקדמות בשלב תישמר.</p>
            <p class="muted">נותרו ${continuesLeft} המשכים</p>
            <button class="btn primary cont">${icon('play')}<span>המשך</span></button>` : `<p>נגמרו ההמשכים.</p>`}
          <div class="final">ניקוד: <b dir="ltr">${n(score)}</b></div>
          <button class="btn ghost quit">${icon('exit')}<span>סיום</span></button>
        </div>
      </div>`, 'dim');
    let t = 10;
    const fill = el.querySelector('.ring-fill'), num = el.querySelector('.count-num');
    const start = performance.now();
    const tick = () => {
      if (!el.isConnected) return;
      const e = (performance.now() - start) / 1000;
      t = Math.max(0, 10 - e);
      if (fill) fill.style.strokeDashoffset = `${C * (1 - t / 10)}`;
      if (num) num.textContent = Math.ceil(t);
      if (t <= 0 || continuesLeft <= 0) { if (continuesLeft > 0) this.app.endRun(); return; }
      requestAnimationFrame(tick);
    };
    if (continuesLeft > 0) requestAnimationFrame(tick);
    this.bind(el, { '.cont': () => this.app.continueRun(), '.quit': () => this.app.endRun() });
  }

  showResults({ stage, stats, accuracy, rank, total, last }) {
    const C = 2 * Math.PI * 64;
    const el = this.open(`
      <div class="panel wide results">
        <h2 class="title">${stage.title} — הושלם</h2>
        <div class="results-grid">
          <div class="card rank-card">
            <svg viewBox="0 0 160 160" class="rank-ring r${rank.letter}"><circle cx="80" cy="80" r="64" class="ring-track"/><circle cx="80" cy="80" r="64" class="ring-fill" transform="rotate(-90 80 80)" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/></svg>
            <div class="rank-letter">${rank.letter}</div>
            <small>דירוג</small>
          </div>
          <div class="card stats">
            <div class="stat">${icon('star')}<span>ניקוד בשלב</span><b dir="ltr" data-count="${stats.score}">0</b></div>
            <div class="stat">${icon('target')}<span>דיוק</span><b dir="ltr">${accuracy}%</b></div>
            <div class="stat">${icon('hand')}<span>נטרולים נקיים</span><b>${stats.disarms}</b></div>
            <div class="stat">${icon('head')}<span>פגיעות ראש</span><b>${stats.heads}</b></div>
            <div class="stat">${icon('person')}<span>אזרחים שנפגעו</span><b class="${stats.civilians ? 'bad' : ''}">${stats.civilians}</b></div>
            <div class="stat">${icon('clock')}<span>זמן</span><b dir="ltr">${fmtTime(stats.time)}</b></div>
            <div class="stat total">${icon('trophy')}<span>ניקוד כולל</span><b dir="ltr">${n(total)}</b></div>
          </div>
        </div>
        <button class="btn primary next">${icon('play')}<span>${last ? 'לסיום' : 'לשלב הבא'}</span></button>
      </div>`);
    requestAnimationFrame(() => {
      const f = el.querySelector('.ring-fill');
      f.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)';
      f.style.strokeDashoffset = `${C * (1 - rank.value / 100)}`;
      const b = el.querySelector('[data-count]'); const target = +b.dataset.count; const t0 = performance.now();
      const step = () => { const k = Math.min(1, (performance.now() - t0) / 1400); b.textContent = n(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
      step();
    });
    this.bind(el, { '.next': () => this.app.afterResults() });
  }

  ending(total, rank) {
    const C = 2 * Math.PI * 64;
    const el = this.open(`
      <div class="panel ending">
        <h1 class="logo">המשמרת הסתיימה</h1>
        <p class="sub">הרחוב, הנמל והתחנה נקיים. העיר יכולה לישון בשקט.</p>
        <div class="card center-card">
          <svg viewBox="0 0 160 160" class="rank-ring r${rank}"><circle cx="80" cy="80" r="64" class="ring-track"/><circle cx="80" cy="80" r="64" class="ring-fill" transform="rotate(-90 80 80)" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/></svg>
          <div class="rank-letter">${rank}</div>
          <div class="final">ניקוד סופי: <b dir="ltr">${n(total)}</b></div>
        </div>
        <button class="btn primary next">${icon('trophy')}<span>המשך</span></button>
      </div>`);
    requestAnimationFrame(() => { const f = el.querySelector('.ring-fill'); f.style.transition = 'stroke-dashoffset 2s ease'; f.style.strokeDashoffset = `${C * 0.02}`; });
    this.bind(el, { '.next': () => this.app.finishRun() });
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export { ICONS };
