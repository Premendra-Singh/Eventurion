/* Eventurion - ONE timeline for all of Modern India (1800 -> today)
 *
 * The gold dot ("playhead") is the only thing that moves. Wherever it sits on the line,
 * the event nearest to it decides which chapter card is lit. The dot is moved by:
 *   - scrolling the page   (each card has a data-year: the year the dot shows when that card is in focus)
 *   - clicking a small dot / dragging the gold dot / the < > buttons / Play
 *
 * Everything is positioned in % of the line, so it always fits the screen (no sideways scrolling).
 */
(() => {
  const START = 1800;
  const now = new Date();
  const NOW = now.getFullYear() + (now - new Date(now.getFullYear(), 0, 1)) / (365.25 * 864e5); // e.g. 2026.82
  const $ = id => document.getElementById(id);

  const bar = $('tl-bar'), stage = $('tl-stage'), line = $('tl-line'), fill = $('tl-fill'),
        head = $('tl-playhead'), bubble = $('tl-bubble'), yearEl = $('tl-year'), titleEl = $('tl-title'),
        scale = $('tl-scale'), playBtn = $('tl-play'), prevBtn = $('tl-prev'), nextBtn = $('tl-next');
  if (!bar || !line) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frac = y => (y - START) / (NOW - START);
  const pct = y => (frac(y) * 100) + '%';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- data from the HTML ----------
  const events = Array.from(line.querySelectorAll('.tl-dot')).map(el => ({
    el, year: Number(el.dataset.year), chapter: Number(el.dataset.chapter), title: el.dataset.title
  })).sort((a, b) => a.year - b.year);

  const cards = Array.from(document.querySelectorAll('.card[id^="chapter-"]'))
    .sort((a, b) => parseInt(a.id.slice(8)) - parseInt(b.id.slice(8)));
  const anchors = cards.map(c => Number(c.dataset.year));   // year the dot shows when this card is in focus

  // ---------- build the line ----------
  events.forEach(e => { e.el.style.left = pct(e.year); });
  document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px');

  for (let y = START; y <= NOW; y += 10) {                   // tick every decade
    const t = document.createElement('i');
    t.className = 'tl-tick' + (y % 50 === 0 ? ' major' : '');
    t.style.left = pct(y);
    line.insertBefore(t, line.firstChild);
  }
  [[1800, ''], [1850, 'opt'], [1900, ''], [1950, 'opt'], [2000, '']].forEach(([y, cls]) => {
    const s = document.createElement('span');
    s.textContent = y; s.className = (y % 100 === 0 ? 'century ' : '') + cls; s.style.left = pct(y);
    scale.appendChild(s);
  });
  const todayEl = document.createElement('span');
  todayEl.className = 'today'; todayEl.textContent = 'Today'; todayEl.style.left = '100%';
  scale.appendChild(todayEl);

  document.querySelectorAll('.tl-band').forEach(b => {
    const from = Number(b.dataset.from), to = b.dataset.to === 'now' ? NOW : Number(b.dataset.to);
    b.style.left = pct(from); b.style.width = ((frac(to) - frac(from)) * 100) + '%';
  });

  // ---------- the moving dot ----------
  let year = events[0].year;          // where the gold dot is (can be between events while it moves)
  let litChapter = 0;

  const nearest = y => {
    let best = 0, bd = Infinity;
    events.forEach((e, i) => { const d = Math.abs(e.year - y); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  function render() {
    const i = nearest(year), ev = events[i];
    head.style.left = pct(year);
    fill.style.width = pct(year);
    yearEl.textContent = Math.round(year);
    titleEl.textContent = ev.title;
    head.setAttribute('aria-valuemax', Math.floor(NOW));
    head.setAttribute('aria-valuenow', Math.round(year));
    head.setAttribute('aria-valuetext', Math.round(year) + ': ' + ev.title);

    events.forEach(e => e.el.classList.toggle('passed', e.year <= year + 0.05));

    if (ev.chapter !== litChapter) {                         // light up the card for this year
      litChapter = ev.chapter;
      cards.forEach(c => c.classList.toggle('lit', c.id === 'chapter-' + litChapter));
    }

    // keep the label above the dot but inside the bar
    const bw = bubble.offsetWidth;
    const px = line.offsetLeft + frac(year) * line.offsetWidth;
    bubble.style.left = clamp(px - bw / 2, 0, stage.clientWidth - bw) + 'px';
  }

  // smooth glide of the dot to a year
  let raf = 0;
  function tweenTo(target, done) {
    cancelAnimationFrame(raf);
    const from = year, dist = Math.abs(target - from);
    if (dist < 0.01 || reduce) { year = target; render(); if (done) done(); return; }
    const dur = clamp(350 + dist * 11, 500, 1800), t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;   // ease in-out
      year = from + (target - from) * e;
      render();
      if (p < 1) raf = requestAnimationFrame(step); else if (done) done();
    };
    raf = requestAnimationFrame(step);
  }

  // ---------- page scroll <-> dot ----------
  // "virtual" vertical position of each card: cards in the same row are spread a little apart,
  // so scrolling through a row lights its cards one after another (left to right).
  function cardPositions() {
    const sy = window.scrollY;
    const r = cards.map(c => { const b = c.getBoundingClientRect(); return { top: b.top + sy, mid: b.top + sy + b.height / 2 }; });
    const rows = [];
    r.forEach((p, k) => {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last.top - p.top) < 4) last.items.push(k); else rows.push({ top: p.top, items: [k] });
    });
    const pitch = rows.length > 1 ? rows[1].top - rows[0].top : cards[0].offsetHeight;
    const v = [];
    rows.forEach(row => row.items.forEach((k, j) =>
      { v[k] = r[k].mid + (j - (row.items.length - 1) / 2) * pitch / row.items.length; }));
    // the last card can never reach the middle of the screen at the very bottom of the page, so cap it
    v[v.length - 1] = Math.min(v[v.length - 1], document.documentElement.scrollHeight - window.innerHeight + viewCenter());
    return v;
  }
  const viewCenter = () => bar.offsetHeight + (window.innerHeight - bar.offsetHeight) / 2;

  let lock = false, lockTimer = 0, ticking = false;
  function holdScrollLock() {          // ignore scroll events caused by our own smooth scrolling
    lock = true; clearTimeout(lockTimer);
    lockTimer = setTimeout(() => { lock = false; }, 180);
  }

  function syncFromScroll() {
    ticking = false;
    if (lock || playing || dragging) return;
    const v = cardPositions(), n = v.length, Y = window.scrollY + viewCenter();
    let u;
    if (Y <= v[0]) u = 0;
    else if (Y >= v[n - 1]) u = n - 1;
    else { let k = 0; while (k < n - 2 && v[k + 1] <= Y) k++; u = k + (Y - v[k]) / (v[k + 1] - v[k]); }
    const k = Math.min(n - 2, Math.floor(u)), f = u - k;
    cancelAnimationFrame(raf);
    year = n === 1 ? anchors[0] : anchors[k] + (anchors[k + 1] - anchors[k]) * f;
    render();
  }
  window.addEventListener('scroll', () => {
    if (lock) holdScrollLock();
    if (!ticking) { ticking = true; requestAnimationFrame(syncFromScroll); }
  }, { passive: true });
  window.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px');
    syncFromScroll(); render();
  });
  window.addEventListener('load', syncFromScroll);

  function revealCard(chapter) {       // scroll so the lit card sits in the middle of the visible area
    const k = chapter - 1;
    if (!cards[k]) return;
    holdScrollLock();
    window.scrollTo({ top: Math.max(0, cardPositions()[k] - viewCenter()), behavior: reduce ? 'auto' : 'smooth' });
  }

  function goTo(i, done) {             // glide to event i, then show its card
    tweenTo(events[i].year, () => { revealCard(events[i].chapter); if (done) done(); });
  }
  const nextIndex = () => events.findIndex(e => e.year > year + 0.01);
  const prevIndex = () => { for (let i = events.length - 1; i >= 0; i--) if (events[i].year < year - 0.01) return i; return -1; };

  // ---------- Play / Pause ----------
  let playing = false, dwell = 0;
  function setPlayUI() {
    playBtn.innerHTML = playing ? '&#10074;&#10074; Pause' : '&#9654; Play';
    playBtn.setAttribute('aria-pressed', String(playing));
  }
  function stopPlay() { playing = false; clearTimeout(dwell); setPlayUI(); }
  function stepPlay() {
    if (!playing) return;
    const i = nextIndex();
    if (i === -1) { stopPlay(); return; }                      // reached the last event
    goTo(i, () => { if (playing) dwell = setTimeout(stepPlay, 1500); });
  }
  playBtn.addEventListener('click', () => {
    if (playing) { stopPlay(); return; }
    playing = true; setPlayUI();
    if (nextIndex() === -1) goTo(0, () => { if (playing) dwell = setTimeout(stepPlay, 900); });  // at the end: restart from 1800
    else stepPlay();
  });

  prevBtn.addEventListener('click', () => { stopPlay(); const i = prevIndex(); if (i !== -1) goTo(i); });
  nextBtn.addEventListener('click', () => { stopPlay(); const i = nextIndex(); if (i !== -1) goTo(i); });
  head.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn.click(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtn.click(); }
  });

  // ---------- click a small dot / drag the gold dot ----------
  let dragging = false, drag = null;
  const yearFromX = x => { const r = line.getBoundingClientRect(); return START + clamp((x - r.left) / r.width, 0, 1) * (NOW - START); };

  line.addEventListener('pointerdown', e => {
    stopPlay(); cancelAnimationFrame(raf);
    line.setPointerCapture(e.pointerId);
    drag = { x0: e.clientX };
    dragging = true; line.classList.add('dragging');
    year = yearFromX(e.clientX); render();                     // the gold dot jumps under the pointer
  });
  line.addEventListener('pointermove', e => {
    if (!drag) return;
    year = yearFromX(e.clientX); render();
  });
  const endDrag = e => {
    if (!drag) return;
    const d = drag; drag = null; dragging = false; line.classList.remove('dragging');
    goTo(nearest(yearFromX(e.clientX)));                       // snap to the closest event and show its card
  };
  line.addEventListener('pointerup', endDrag);
  line.addEventListener('pointercancel', () => { drag = null; dragging = false; line.classList.remove('dragging'); });

  // keyboard: Enter / Space on a small dot (mouse clicks are handled by the pointer code above)
  events.forEach((ev, i) => ev.el.addEventListener('click', e => { if (e.detail === 0) { stopPlay(); goTo(i); } }));

  // ---------- clicking a card moves the dot to that card's year ----------
  cards.forEach((c, k) => c.addEventListener('click', e => {
    if (e.target.closest('a')) e.preventDefault();
    stopPlay(); tweenTo(anchors[k]);
  }));

  syncFromScroll();
  render();
})();
