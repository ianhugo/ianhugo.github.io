/*
 * LLM-Refiner pipeline walkthrough + semantic-neighborhood case study.
 * The pipeline diagram is drawn as SVG from a layout table (one wide layout,
 * one vertical layout for phones) so it follows the site theme and stays legible.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ------------------------------------------------------------ pipeline ---
  var NODE_INFO = {
    'in':  { label: 'Sentence', sub: 'input', s: '--st-io' },
    ana:   { label: 'Linguistic analyzers', sub: 'deps · roles · POS', s: '--st-1' },
    t2a:   { label: 'text → AMR', sub: 'AMRBart parser', s: '--st-1' },
    a2t:   { label: 'AMR → text', sub: 'AMRBart generator', s: '--st-1' },
    m1:    { label: 'M1 · Comprehension', sub: 'semantic intake', s: '--st-m1' },
    m2:    { label: 'M2 · Diagnosis', sub: 'compare + diagnose', s: '--st-m2' },
    m3:    { label: 'M3 · Repair', sub: 'filter + apply', s: '--st-m3' },
    val:   { label: 'Validator', sub: 'Penman check', s: '--st-val' },
    out:   { label: 'Output', sub: 'repaired AMR', s: '--st-io' }
  };

  // Edge routes: 'h' / 'v' elbows (optional fixed mid via {x}/{y}), 'hv' = horizontal then vertical.
  var LAYOUTS = {
    wide: {
      w: 980, h: 312,
      groups: [
        { x: 172, y: 108, w: 198, h: 190, label: 'STAGE 1 · AMR PARSER', lx: 176, ly: 100 },
        { x: 432, y: 18, w: 206, h: 288, label: 'STAGE 2 · LLM', lx: 436, ly: 12 }
      ],
      nodes: {
        'in': [16, 137, 120, 52], ana: [186, 22, 170, 52], t2a: [186, 124, 170, 52], a2t: [186, 230, 170, 52],
        m1: [450, 38, 170, 52], m2: [450, 137, 170, 52], m3: [450, 236, 170, 52],
        val: [690, 137, 118, 52], out: [866, 137, 106, 52]
      },
      edges: [
        { id: 'in-ana', from: ['in', 'r', -10], to: ['ana', 'l'], route: { x: 160 } },
        { id: 'in-t2a', from: ['in', 'r', 0], to: ['t2a', 'l'], route: { x: 160 } },
        { id: 't2a-a2t', from: ['t2a', 'b'], to: ['a2t', 't'], route: 'v', label: 'AMR', lab: [292, 212] },
        { id: 'ana-m1', from: ['ana', 'r'], to: ['m1', 'l', -10], route: { x: 404 }, label: 'context', lab: [404, 42] },
        { id: 'a2t-m1', from: ['a2t', 'r'], to: ['m1', 'l', 12], route: { x: 392 }, label: 'sentence', lab: [392, 292] },
        { id: 't2a-m2', from: ['t2a', 'r'], to: ['m2', 'l'], route: { x: 416 }, label: 'AMR', lab: [388, 143] },
        { id: 'm1-m2', from: ['m1', 'b'], to: ['m2', 't'], route: 'v' },
        { id: 'm2-m3', from: ['m2', 'b'], to: ['m3', 't'], route: 'v' },
        { id: 'm3-val', from: ['m3', 'r'], to: ['val', 'b'], route: 'hv', label: 'repaired AMR', lab: [700, 256] },
        { id: 'val-m2', from: ['val', 'l', -6], to: ['m2', 'r', -6], route: 'h', label: 'retry', lab: [655, 148], retry: true },
        { id: 'val-out', from: ['val', 'r'], to: ['out', 'l'], route: 'h', label: 'valid', lab: [837, 155] }
      ]
    },
    tall: {
      w: 360, h: 716,
      groups: [
        { x: 184, y: 82, w: 164, h: 206, label: 'STAGE 1', lx: 290, ly: 76 },
        { x: 36, y: 326, w: 288, h: 240, label: 'STAGE 2 · LLM', lx: 40, ly: 320 }
      ],
      nodes: {
        'in': [110, 8, 140, 46], ana: [8, 98, 160, 50], t2a: [194, 98, 146, 50], a2t: [194, 226, 146, 50],
        m1: [90, 340, 180, 50], m2: [90, 424, 180, 50], m3: [90, 506, 180, 50],
        val: [110, 596, 140, 46], out: [110, 666, 140, 46]
      },
      edges: [
        { id: 'in-ana', from: ['in', 'b', -30], to: ['ana', 't'], route: { y: 74 } },
        { id: 'in-t2a', from: ['in', 'b', 30], to: ['t2a', 't'], route: { y: 74 } },
        { id: 't2a-a2t', from: ['t2a', 'b'], to: ['a2t', 't'], route: 'v', label: 'AMR', lab: [292, 192] },
        { id: 'ana-m1', from: ['ana', 'b'], to: ['m1', 't', -40], route: { y: 306 }, label: 'context', lab: [70, 230] },
        { id: 'a2t-m1', from: ['a2t', 'b'], to: ['m1', 't', 40], route: { y: 306 }, label: 'sentence', lab: [300, 300] },
        { id: 't2a-m2', from: ['t2a', 'r'], to: ['m2', 'r'], route: { x: 355 }, label: 'AMR', lab: [340, 412] },
        { id: 'm1-m2', from: ['m1', 'b'], to: ['m2', 't'], route: 'v' },
        { id: 'm2-m3', from: ['m2', 'b'], to: ['m3', 't'], route: 'v' },
        { id: 'm3-val', from: ['m3', 'b'], to: ['val', 't'], route: 'v', label: 'repaired AMR', lab: [226, 580] },
        { id: 'val-m2', from: ['val', 'l'], to: ['m2', 'l'], route: { x: 20 }, label: 'retry', lab: [56, 600], retry: true },
        { id: 'val-out', from: ['val', 'b'], to: ['out', 't'], route: 'v', label: 'valid ✓', lab: [214, 658] }
      ]
    }
  };

  // ------------------------------------------------------------ AMR text ---
  function L(cls, html) { return '<span class="line' + (cls ? ' ' + cls : '') + '">' + html + '</span>'; }
  function c(t) { return '<span class="c">' + t + '</span>'; }
  function r(t) { return '<span class="r">' + t + '</span>'; }
  var AMR_HEAD = [
    L('', '(a / ' + c('ask-01')),
    L('', '   ' + r(':ARG0') + ' (t / ' + c('teacher') + ')'),
    L('', '   ' + r(':ARG1') + ' (s / ' + c('student') + ')'),
    L('', '   ' + r(':ARG2') + ' (l / ' + c('leave-11'))
  ];
  function amr(tail) { return '<div class="amr">' + AMR_HEAD.concat(tail).join('') + '</div>'; }
  var AMR_PARSED = amr([L('', '            ' + r(':ARG0') + ' t))')]);
  var AMR_SPOT = amr([L('spot', '            ' + r(':ARG0') + ' t))   <span style="color:var(--del)">← who leaves?</span>')]);
  var AMR_DIFF = amr([L('del', '            ' + r(':ARG0') + ' t))'), L('add', '            ' + r(':ARG0') + ' s))')]);
  var AMR_FINAL = amr([L('', '            ' + r(':ARG0') + ' s))')]);

  // ------------------------------------------------------------ steps ------
  var STEPS = [
    {
      node: 'in', edges: [], title: 'Input sentence',
      html: '<p>We start with an ordinary sentence. Its meaning hinges on one detail: the <strong>student</strong> is the one who leaves, not the teacher.</p>' +
        '<span class="out-label">Input</span><div class="quote">The teacher asked the student to leave.</div>'
    },
    {
      node: 't2a', edges: ['in-t2a'], title: 'Stage 1 · Parse (text → AMR)',
      html: '<p>A strong parser, AMRBart, turns the sentence into an AMR graph, written here in Penman notation. Every node and all but one edge match the human gold graph, so SMATCH already rates it highly. <strong>Can you spot the error?</strong></p>' +
        '<span class="out-label">AMRBart output</span>' + AMR_PARSED
    },
    {
      node: 'a2t', edges: ['t2a-a2t'], title: 'Stage 1 · Regenerate (AMR → text)',
      html: '<p>The same model turns the graph back into a sentence. This is the trick: an error hidden in graph notation becomes obvious in plain language.</p>' +
        '<span class="out-label">Regenerated sentence</span><div class="quote">The teacher asked the student <mark>for the teacher</mark> to leave.</div>'
    },
    {
      node: 'ana', edges: ['in-ana'], title: 'Linguistic analyzers',
      html: '<p>Open-source NLP tools add <strong>linguistic context</strong>: deterministic signals that the LLM can check its reasoning against. Adding them improves the SemBLEU gain by 41% compared with going without.</p>' +
        '<span class="out-label">Linguistic context (excerpt)</span>' +
        '<table class="mini-table"><thead><tr><th>Tool</th><th>Signal</th></tr></thead><tbody>' +
        '<tr><td>Dependency parse</td><td><code>nsubj(asked, teacher)</code> · <code>obj(asked, student)</code> · <code>xcomp(asked, leave)</code></td></tr>' +
        '<tr><td>Semantic roles</td><td><code>leave</code> → ARG0: <em>the student</em></td></tr>' +
        '<tr><td>Part of speech</td><td>teacher/NOUN · asked/VERB · student/NOUN · leave/VERB</td></tr>' +
        '</tbody></table>'
    },
    {
      node: 'm1', edges: ['ana-m1', 'a2t-m1'], title: 'M1 · Comprehension',
      html: '<p>The LLM paraphrases both sentences and breaks each one into a <strong>Semantic Intake</strong>: one row per linguistic category (events, roles, negation, time, and so on). Keeping its reasoning inside these categories makes every step checkable.</p>' +
        '<span class="out-label">Semantic Intake (excerpt)</span>' +
        '<table class="mini-table"><thead><tr><th>Category</th><th>Original</th><th>Regenerated</th></tr></thead><tbody>' +
        '<tr><td>Events</td><td>ask, leave</td><td>ask, leave</td></tr>' +
        '<tr><td>Who asks whom</td><td>teacher → student</td><td>teacher → student</td></tr>' +
        '<tr class="flag"><td>Who leaves</td><td>student</td><td class="bad">teacher</td></tr>' +
        '<tr><td>Polarity</td><td>positive</td><td>positive</td></tr>' +
        '</tbody></table>'
    },
    {
      node: 'm2', edges: ['m1-m2', 't2a-m2'], title: 'M2 · Diagnosis',
      html: '<p>Comparing the two intakes row by row, the LLM finds the gap, points to the exact edge responsible in the AMR, and proposes a fix. If no row differs, the sentence is skipped and the AMR is left untouched.</p>' +
        '<div class="two"><div><span class="out-label">Responsible edge</span>' + AMR_SPOT + '</div>' +
        '<div><span class="out-label">Diagnosis</span><div class="diag"><span class="tag bad">Core argument role</span><br><strong>Who leaves</strong> is wrong. The sentence says the student leaves, but <code class="k">leave-11 :ARG0</code> points to <em>teacher</em>.<br><strong>Proposed fix:</strong> re-attach <code class="k">:ARG0</code> from <code class="k">t</code> to <code class="k">s</code>.</div></div></div>'
    },
    {
      node: 'm3', edges: ['m2-m3'], title: 'M3 · Repair',
      html: '<p>All proposed fixes are grouped, scored for confidence, and filtered. A fix survives only if it changes real meaning, is clearly licensed by the sentence, and won\'t break anything else. Survivors are applied as small, local edits.</p>' +
        '<div class="two"><div><span class="out-label">Candidate fixes</span>' +
        '<div class="cand"><span class="what">Re-attach <code class="k">leave-11 :ARG0</code> → student</span><span class="tag good">high · kept</span></div>' +
        '<div class="cand dropped"><span class="what">Reword <code class="k">ask-01</code> as <code class="k">request-01</code></span><span class="tag muted">stylistic · dropped</span></div>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-top:6px">The dropped candidate is an illustrative example of the filter.</p></div>' +
        '<div><span class="out-label">Edit applied</span>' + AMR_DIFF + '</div></div>'
    },
    {
      node: 'val', edges: ['m3-val'], title: 'Validator',
      html: '<p>Every repaired AMR is parsed with the Penman library to make sure it is still a well-formed graph. If parsing fails, the error goes back to Stage 2 so the LLM can fix the formatting before trying again.</p>' +
        '<span class="out-label">Check</span><div class="ok-line">penman.decode(amr) → <span class="good">valid graph ✓</span> · 4 nodes · 4 edges</div>'
    },
    {
      node: 'out', edges: ['val-out'], title: 'Output',
      html: '<p>The result is the repaired AMR plus a readable report of what was wrong and why it was changed. Regenerating text from the repaired graph now gives back the original meaning.</p>' +
        '<div class="two"><div><span class="out-label">Repaired AMR</span>' + AMR_FINAL + '</div>' +
        '<div><span class="out-label">Regenerated sentence</span><div class="quote">The teacher asked the student to leave.</div>' +
        '<span class="out-label" style="margin-top:12px">Report</span><div class="diag">Fixed the agent of <em>leave</em> (teacher → student). One edge changed; meaning restored.</div></div></div>'
    }
  ];

  // ------------------------------------------------------------ render -----
  var diagramEl = document.getElementById('wt-diagram');
  var bodyEl = document.getElementById('wt-body');
  var titleEl = document.getElementById('wt-title');
  var countEl = document.getElementById('wt-count');
  var dotsEl = document.getElementById('wt-dots');
  var playBtn = document.getElementById('wt-play');
  var prevBtn = document.getElementById('wt-prev');
  var nextBtn = document.getElementById('wt-next');
  if (!diagramEl) return;

  var narrow = window.matchMedia('(max-width: 640px)');
  var nodeEls = {}, edgeEls = {};

  function anchor(box, side, off) {
    var x = box[0], y = box[1], w = box[2], h = box[3];
    off = off || 0;
    if (side === 'l') return [x, y + h / 2 + off];
    if (side === 'r') return [x + w, y + h / 2 + off];
    if (side === 't') return [x + w / 2 + off, y];
    return [x + w / 2 + off, y + h];
  }
  function routePts(a, b, route) {
    if (route === 'hv') return [a, [b[0], a[1]], b];
    if (route === 'h') { var mx = (a[0] + b[0]) / 2; return [a, [mx, a[1]], [mx, b[1]], b]; }
    if (route === 'v') { var my = (a[1] + b[1]) / 2; return [a, [a[0], my], [b[0], my], b]; }
    if (route.x !== undefined) return [a, [route.x, a[1]], [route.x, b[1]], b];
    return [a, [a[0], route.y], [b[0], route.y], b];
  }

  function drawDiagram() {
    var lay = LAYOUTS[narrow.matches ? 'tall' : 'wide'];
    diagramEl.innerHTML = '';
    nodeEls = {}; edgeEls = {};
    var svg = el('svg', { viewBox: '0 0 ' + lay.w + ' ' + lay.h, role: 'img' }, diagramEl);
    var defs = el('defs', {}, svg);
    ['', '-on', '-retry'].forEach(function (suffix) {
      var m = el('marker', { id: 'wt-arrow' + suffix, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
      var p = el('path', { d: 'M0,0 L10,5 L0,10 z', 'class': 'arrowhead' }, m);
      if (suffix === '-on') p.style.fill = 'var(--accent)';
      if (suffix === '-retry') p.style.fill = 'var(--del)';
    });

    lay.groups.forEach(function (g) {
      var gg = el('g', { 'class': 'pgroup' }, svg);
      el('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: 14 }, gg);
      el('text', { x: g.lx, y: g.ly }, gg).textContent = g.label;
    });

    lay.edges.forEach(function (e) {
      var a = anchor(lay.nodes[e.from[0]], e.from[1], e.from[2]);
      var b = anchor(lay.nodes[e.to[0]], e.to[1], e.to[2]);
      var pts = routePts(a, b, e.route);
      var g = el('g', { 'class': 'pedge' + (e.retry ? ' retry' : '') }, svg);
      var path = el('path', { d: 'M' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' L'), 'marker-end': 'url(#wt-arrow)' }, g);
      if (e.label) {
        var pos = e.lab;
        el('text', { x: pos[0], y: pos[1], 'class': 'bg' }, g).textContent = e.label;
        el('text', { x: pos[0], y: pos[1] }, g).textContent = e.label;
      }
      edgeEls[e.id] = { g: g, path: path, retry: !!e.retry };
    });

    Object.keys(lay.nodes).forEach(function (id) {
      var b = lay.nodes[id], info = NODE_INFO[id];
      var g = el('g', { 'class': 'pnode', tabindex: '0', role: 'button', 'aria-label': info.label }, svg);
      g.style.setProperty('--s', 'var(' + info.s + ')');
      el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], rx: 10 }, g);
      el('text', { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 - 8 }, g).textContent = info.label;
      el('text', { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 + 10, 'class': 'sub' }, g).textContent = info.sub;
      function jump() { pause(); var i = firstStepFor(id); if (i >= 0) go(i); }
      g.addEventListener('click', jump);
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); jump(); } });
      nodeEls[id] = g;
    });
    paint();
  }

  function firstStepFor(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].node === id) return i;
    return -1;
  }

  // Dots
  var dots = STEPS.map(function (s, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'wt-dot';
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.title);
    d.addEventListener('click', function () { pause(); go(i); });
    dotsEl.appendChild(d);
    return d;
  });

  var cur = 0;
  function paint() {
    var step = STEPS[cur];
    var visited = {};
    for (var i = 0; i <= cur; i++) visited[STEPS[i].node] = true;
    Object.keys(nodeEls).forEach(function (id) {
      nodeEls[id].classList.toggle('active', id === step.node);
      nodeEls[id].classList.toggle('future', !visited[id]);
    });
    Object.keys(edgeEls).forEach(function (id) {
      var on = step.edges.indexOf(id) >= 0 || (step.node === 'val' && id === 'val-m2');
      var e = edgeEls[id];
      e.g.classList.toggle('flow', on);
      e.path.setAttribute('marker-end', on ? (e.retry ? 'url(#wt-arrow-retry)' : 'url(#wt-arrow-on)') : 'url(#wt-arrow)');
    });
  }

  function go(i) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i));
    var step = STEPS[cur];
    countEl.textContent = 'Step ' + (cur + 1) + ' of ' + STEPS.length;
    titleEl.textContent = step.title;
    titleEl.style.setProperty('--s', 'var(' + NODE_INFO[step.node].s + ')');
    bodyEl.innerHTML = '<div class="wt-fade">' + step.html + '</div>';
    dots.forEach(function (d, j) {
      d.classList.toggle('active', j === cur);
      d.classList.toggle('done', j < cur);
      d.setAttribute('aria-selected', j === cur ? 'true' : 'false');
    });
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === STEPS.length - 1;
    paint();
  }

  // Playback
  var STEP_MS = 6000;
  var timer = null;
  function setPlayLabel() {
    playBtn.textContent = timer ? '❚❚ Pause' : (cur === STEPS.length - 1 ? '↺ Replay' : '▶ Play');
  }
  function pause() { if (timer) { clearInterval(timer); timer = null; } setPlayLabel(); }
  function play() {
    if (cur === STEPS.length - 1) go(0); else go(cur + 1);
    timer = setInterval(function () {
      if (cur >= STEPS.length - 1) { pause(); return; }
      go(cur + 1);
      if (cur >= STEPS.length - 1) pause();
    }, STEP_MS);
    setPlayLabel();
  }
  playBtn.addEventListener('click', function () { if (timer) pause(); else play(); });
  prevBtn.addEventListener('click', function () { pause(); go(cur - 1); });
  nextBtn.addEventListener('click', function () { pause(); go(cur + 1); setPlayLabel(); });

  drawDiagram();
  go(0);
  setPlayLabel();
  if (narrow.addEventListener) narrow.addEventListener('change', drawDiagram);
  else if (narrow.addListener) narrow.addListener(drawDiagram);

  // ------------------------------------------------- semantic neighborhood --
  var nb = document.getElementById('nb-graph');
  if (nb) {
    var svg = el('svg', { viewBox: '0 0 440 250', role: 'img', 'aria-label': 'AMR graph for "The teacher asked the student to leave" with the repaired edge from leave-11 to student' }, nb);
    var defs = el('defs', {}, svg);
    var mk = el('marker', { id: 'nb-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', 'class': 'g-arrow' }, mk);
    var N = { ask: [18, 105, 110, 40], teacher: [230, 15, 120, 40], student: [230, 105, 120, 40], leave: [230, 195, 120, 40] };
    var E = [
      { id: 'ask-teacher', d: 'M128,115 L228,40', label: 'ARG0', lab: [170, 66] },
      { id: 'ask-student', d: 'M128,125 L228,125', label: 'ARG1', lab: [178, 119] },
      { id: 'ask-leave', d: 'M128,135 L228,212', label: 'ARG2', lab: [170, 188] },
      { id: 'leave-teacher', d: 'M350,220 L420,220 L420,35 L352,35', label: 'ARG0', lab: [420, 140], cls: 'removed' },
      { id: 'leave-student', d: 'M350,210 L385,210 L385,125 L352,125', label: 'ARG0 ✓', lab: [386, 170], cls: 'added' }
    ];
    var edges = {};
    E.forEach(function (e) {
      var g = el('g', { 'class': 'g-edge' + (e.cls ? ' ' + e.cls : '') }, svg);
      el('path', { d: e.d, 'marker-end': 'url(#nb-arrow)' }, g);
      el('text', { x: e.lab[0], y: e.lab[1], 'class': 'bg' }, g).textContent = e.label;
      el('text', { x: e.lab[0], y: e.lab[1] }, g).textContent = e.label;
      edges[e.id] = g;
    });
    // ✕ on the removed edge
    el('path', { d: 'M412,78 L428,94 M428,78 L412,94', 'class': 'g-x' }, svg);
    var nodes = {};
    Object.keys(N).forEach(function (k) {
      var b = N[k];
      var g = el('g', { 'class': 'g-node' }, svg);
      el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], rx: 8 }, g);
      el('text', { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 }, g).textContent = k === 'ask' ? 'ask-01' : k === 'leave' ? 'leave-11' : k;
      nodes[k] = g;
    });
    var PATHS = {
      1: { e: ['leave-student'], n: ['leave', 'student'] },
      2: { e: ['ask-leave', 'leave-student'], n: ['ask', 'leave', 'student'] },
      3: { e: ['ask-teacher', 'ask-leave', 'leave-student'], n: ['teacher', 'ask', 'leave', 'student'] }
    };
    var rows = Array.prototype.slice.call(document.querySelectorAll('.kgram'));
    function show(k) {
      var p = PATHS[k] || { e: [], n: [] };
      Object.keys(edges).forEach(function (id) { edges[id].classList.toggle('on', p.e.indexOf(id) >= 0); });
      Object.keys(nodes).forEach(function (id) { nodes[id].classList.toggle('on', p.n.indexOf(id) >= 0); });
      rows.forEach(function (r) { r.setAttribute('aria-pressed', r.getAttribute('data-k') === String(k) ? 'true' : 'false'); });
    }
    var pinned = 0;
    rows.forEach(function (r) {
      var k = +r.getAttribute('data-k');
      r.addEventListener('click', function () { pinned = pinned === k ? 0 : k; show(pinned); });
      r.addEventListener('mouseenter', function () { show(k); });
      r.addEventListener('mouseleave', function () { show(pinned); });
    });
    show(0);
  }

  // Exposed for automated checks only.
  window.__llmrWalkthrough = { go: go, steps: STEPS.length, current: function () { return cur; }, playing: function () { return !!timer; } };
  void reduceMotion;
})();
