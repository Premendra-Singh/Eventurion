/* Eventurion Ancient India timeline. Uses DOM manipulation and event handling. */
(function () {
  var line = document.getElementById('tl-line');
  if (!line) return;
  var head = document.getElementById('tl-playhead');
  var fill = document.getElementById('tl-fill');
  var bubble = document.getElementById('tl-bubble');
  var yearLabel = document.getElementById('tl-year');
  var titleLabel = document.getElementById('tl-title');
  var scale = document.getElementById('tl-scale');
  var prev = document.getElementById('tl-prev');
  var next = document.getElementById('tl-next');
  var play = document.getElementById('tl-play');
  var minYear = -2600;
  var maxYear = 700;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card[id^="chapter-"]'));
  var dots = Array.prototype.slice.call(line.querySelectorAll('.tl-dot'));
  var events = [];
  var year = -2600;
  var activeChapter = 0;
  var dragging = false;
  var playing = false;
  var playTimer = null;

  for (var i = 0; i < dots.length; i++) {
    events.push({ el: dots[i], year: Number(dots[i].getAttribute('data-year')), chapter: Number(dots[i].getAttribute('data-chapter')), title: dots[i].getAttribute('data-title') });
  }
  events.sort(function (a, b) { return a.year - b.year; });

  function position(y) { return ((y - minYear) / (maxYear - minYear)) * 100; }
  function showYear(y) {
    if (y < 0) return Math.round(Math.abs(y)) + ' BCE';
    return Math.round(y) + ' CE';
  }
  function closestEvent(y) {
    var best = events[0];
    for (var i = 0; i < events.length; i++) {
      if (Math.abs(events[i].year - y) < Math.abs(best.year - y)) best = events[i];
    }
    return best;
  }
  function moveTo(y, reveal) {
    year = Math.max(minYear, Math.min(maxYear, y));
    var event = closestEvent(year);
    var x = position(year);
    head.style.left = x + '%';
    fill.style.width = x + '%';
    yearLabel.textContent = showYear(year);
    titleLabel.textContent = event.title;
    head.setAttribute('aria-valuenow', Math.round(year));
    head.setAttribute('aria-valuetext', showYear(year) + ': ' + event.title);
    for (var i = 0; i < events.length; i++) events[i].el.classList.toggle('passed', events[i].year <= year);
    for (var j = 0; j < cards.length; j++) cards[j].classList.toggle('lit', j + 1 === event.chapter);
    activeChapter = event.chapter;
    var stage = document.getElementById('tl-stage');
    var left = line.offsetLeft + line.offsetWidth * x / 100 - bubble.offsetWidth / 2;
    left = Math.max(0, Math.min(stage.clientWidth - bubble.offsetWidth, left));
    bubble.style.left = left + 'px';
    if (reveal) {
      var card = document.getElementById('chapter-' + event.chapter);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  function yearFromPointer(e) {
    var rect = line.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    return minYear + Math.max(0, Math.min(1, pct)) * (maxYear - minYear);
  }
  function stopPlay() {
    playing = false;
    if (playTimer) clearInterval(playTimer);
    playTimer = null;
    play.innerHTML = '&#9654; Play';
    play.setAttribute('aria-pressed', 'false');
  }
  function jumpToEvent(index) {
    if (index < 0) index = 0;
    if (index >= events.length) index = events.length - 1;
    moveTo(events[index].year, true);
  }

  /* Build ruler ticks and labels for the Ancient India timeline. */
  var step = 400;
  for (var y = minYear; y <= maxYear; y += step) {
    var tick = document.createElement('i');
    tick.className = 'tl-tick' + ((Math.abs(y) % 800 === 0) ? ' major' : '');
    tick.style.left = position(y) + '%';
    line.insertBefore(tick, head);
    var label = document.createElement('span');
    label.textContent = showYear(y);
    label.style.left = position(y) + '%';
    if (y === minYear || y === maxYear) label.className = 'opt';
    scale.appendChild(label);
  }

  line.addEventListener('pointerdown', function (e) {
    if (e.target.classList.contains('tl-dot')) return;
    stopPlay(); dragging = true;
    if (line.setPointerCapture) line.setPointerCapture(e.pointerId);
    moveTo(yearFromPointer(e), false);
  });
  line.addEventListener('pointermove', function (e) {
    if (dragging) moveTo(yearFromPointer(e), false);
  });
  line.addEventListener('pointerup', function (e) {
    if (dragging) { dragging = false; moveTo(yearFromPointer(e), true); }
  });
  line.addEventListener('pointercancel', function () { dragging = false; moveTo(year, true); });
  for (var k = 0; k < events.length; k++) {
    (function (event) {
      event.el.addEventListener('click', function (e) { e.stopPropagation(); stopPlay(); moveTo(event.year, true); });
    })(events[k]);
  }
  prev.addEventListener('click', function () { stopPlay(); var idx = 0; for (var i = 0; i < events.length; i++) if (events[i].year < year - 1) idx = i; jumpToEvent(idx); });
  next.addEventListener('click', function () { stopPlay(); for (var i = 0; i < events.length; i++) if (events[i].year > year + 1) { jumpToEvent(i); return; } jumpToEvent(events.length - 1); });
  play.addEventListener('click', function () {
    if (playing) { stopPlay(); return; }
    playing = true; play.innerHTML = '&#10074;&#10074; Pause'; play.setAttribute('aria-pressed', 'true');
    playTimer = setInterval(function () {
      var nextYear = year + 45;
      if (nextYear >= maxYear) { moveTo(maxYear, true); stopPlay(); }
      else moveTo(nextYear, false);
    }, 450);
  });
  head.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { stopPlay(); moveTo(year - 20, false); }
    if (e.key === 'ArrowRight') { stopPlay(); moveTo(year + 20, false); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var ev = closestEvent(year); moveTo(ev.year, true); }
  });
  window.addEventListener('resize', function () { moveTo(year, false); });
  moveTo(year, false);
})();
