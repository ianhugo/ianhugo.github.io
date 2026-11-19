/*
 * KSP reasoning explorer.
 * Three stacked layers (ontology / knowledge graph / AMR event ledger) rendered
 * with three.js. Picking a question plays its reasoning path step by step.
 * Adapted from triple_layer_3d_v3.html; restyled to follow the site theme.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- data ----
  var LAYER_Y = { onto: 5, kg: 0, amr: -5 };
  var EVENT_DATE = '2022-07-01';
  var START_DATE = '2020-01-01';

  var NODES = {
    onto: [
      { id: 'FinancialInstitution', x: 0, z: 3, label: 'FinancialInstitution' },
      { id: 'LenderRole', x: -4, z: 1, label: 'LenderRole' },
      { id: 'BorrowerRole', x: 0, z: 1, label: 'BorrowerRole' },
      { id: 'GuarantorRole', x: 4, z: 1, label: 'GuarantorRole' },
      { id: 'CreditExposure', x: -5, z: -1.5, label: 'CreditExposure' },
      { id: 'PrimaryObligation', x: -1, z: -1.5, label: 'PrimaryObligation' },
      { id: 'ContingentObligation', x: 5, z: -1.5, label: 'ContingentObligation' },
      { id: 'Loan', x: 0, z: -3.5, label: 'GuaranteedLoan' },
      { id: 'DefaultEvent', x: 3, z: -3.5, label: 'DefaultEvent' },
      { id: 'InterestRate', x: -3, z: -3.5, label: 'InterestRate' }
    ],
    kg: [
      { id: 'BancoDoBrasil', x: -4, z: 2, label: 'Banco do Brasil' },
      { id: 'Transnet', x: 0, z: 3.5, label: 'Transnet' },
      { id: 'StandardBank', x: 4, z: 2, label: 'Standard Bank' },
      { id: 'Loan001', x: 0, z: 0, label: 'Loan_001' },
      { id: 'Exposure001', x: -5, z: -1, label: 'Exposure_001' },
      { id: 'Rate001', x: 2.5, z: -2.5, label: 'Rate_001' },
      { id: 'Payment001', x: -2, z: -2.5, label: 'Payment_001' },
      { id: 'Default001', x: 4.5, z: -1, label: 'Default_001', later: true }
    ],
    amr: [
      { id: 'issue', x: -6, z: 0, label: 'issue-01' },
      { id: 'guarantee', x: -4, z: 2, label: 'guarantee-01' },
      { id: 'miss', x: 0, z: 0, label: 'miss-02', later: true },
      { id: 'enter', x: 2.5, z: 0, label: 'enter-01', later: true },
      { id: 'increase', x: 5, z: -1.5, label: 'increase-01', later: true },
      { id: 'reclassify', x: 5, z: 1.5, label: 'reclassify-01', later: true }
    ]
  };

  var EDGES = {
    onto: [
      ['FinancialInstitution', 'LenderRole'], ['FinancialInstitution', 'GuarantorRole'],
      ['LenderRole', 'CreditExposure'], ['LenderRole', 'Loan'],
      ['BorrowerRole', 'PrimaryObligation'], ['BorrowerRole', 'Loan'],
      ['GuarantorRole', 'ContingentObligation'], ['GuarantorRole', 'Loan'],
      ['DefaultEvent', 'CreditExposure'], ['Loan', 'InterestRate']
    ],
    kg: [
      ['BancoDoBrasil', 'Loan001'], ['Transnet', 'Loan001'], ['StandardBank', 'Loan001'],
      ['BancoDoBrasil', 'Exposure001'], ['Exposure001', 'Loan001'], ['Loan001', 'Rate001'],
      ['Loan001', 'Payment001'], ['Loan001', 'Default001', true]
    ],
    amr: [['issue', 'guarantee'], ['miss', 'enter'], ['enter', 'increase'], ['enter', 'reclassify']]
  };

  // Cross-layer links: instance-of (KG -> ontology) and AMR participant anchors (AMR -> KG)
  var LINKS = [
    ['kg', 'BancoDoBrasil', 'onto', 'FinancialInstitution'], ['kg', 'BancoDoBrasil', 'onto', 'LenderRole'],
    ['kg', 'Transnet', 'onto', 'BorrowerRole'], ['kg', 'StandardBank', 'onto', 'FinancialInstitution'],
    ['kg', 'StandardBank', 'onto', 'GuarantorRole'], ['kg', 'Loan001', 'onto', 'Loan'],
    ['kg', 'Exposure001', 'onto', 'CreditExposure'], ['kg', 'Rate001', 'onto', 'InterestRate'],
    ['kg', 'Default001', 'onto', 'DefaultEvent', true],
    ['amr', 'issue', 'kg', 'Loan001'], ['amr', 'issue', 'kg', 'BancoDoBrasil'], ['amr', 'issue', 'kg', 'Transnet'],
    ['amr', 'guarantee', 'kg', 'StandardBank'], ['amr', 'guarantee', 'kg', 'Loan001'],
    ['amr', 'miss', 'kg', 'Transnet'], ['amr', 'miss', 'kg', 'Payment001'],
    ['amr', 'enter', 'kg', 'Loan001'], ['amr', 'enter', 'kg', 'Default001', true],
    ['amr', 'increase', 'kg', 'Rate001'], ['amr', 'reclassify', 'kg', 'Exposure001']
  ];

  var TYPES = {
    conceptual: { name: 'Conceptual', cls: 'c-onto', v: '--c-onto' },
    temporal:   { name: 'Temporal',   cls: 'c-amr',  v: '--c-amr' },
    combined:   { name: 'Conceptual + temporal', cls: 'c-mix', v: '--c-mix' }
  };

  // Each step: layer, plain-English gloss, formal form, and the [layer, id] nodes it touches (path drawn in order).
  var QUESTIONS = [
    {
      type: 'conceptual',
      text: 'Who bears credit exposure to Transnet?',
      answer: '<b>Banco do Brasil</b>. It lent Transnet the loan, and the ontology says a lender holds credit exposure.',
      note: 'The phrase "credit exposure" never appears in the source text. The ontology supplies it.',
      steps: [
        { layer: 'onto', gloss: 'A lender holds credit exposure', formal: 'LenderRole → holds → CreditExposure', nodes: [['onto', 'LenderRole'], ['onto', 'CreditExposure']] },
        { layer: 'link', gloss: 'Banco do Brasil is a lender', formal: 'Banco do Brasil instanceOf LenderRole', nodes: [['kg', 'BancoDoBrasil'], ['onto', 'LenderRole']] },
        { layer: 'kg', gloss: 'Banco do Brasil lent Loan_001', formal: 'Banco do Brasil → lenderOf → Loan_001', nodes: [['kg', 'BancoDoBrasil'], ['kg', 'Loan001']] },
        { layer: 'kg', gloss: 'Transnet is the borrower of Loan_001', formal: 'Transnet → borrowerOf → Loan_001', nodes: [['kg', 'Transnet'], ['kg', 'Loan001']] },
        { layer: 'link', gloss: 'Exposure_001 is a credit exposure', formal: 'Exposure_001 instanceOf CreditExposure', nodes: [['kg', 'Exposure001'], ['onto', 'CreditExposure']] },
        { layer: 'kg', gloss: 'Banco do Brasil holds Exposure_001', formal: 'Banco do Brasil → holds → Exposure_001', nodes: [['kg', 'BancoDoBrasil'], ['kg', 'Exposure001']] }
      ]
    },
    {
      type: 'conceptual',
      text: 'Which entity has a contingent obligation?',
      answer: '<b>Standard Bank</b>. Transnet\'s obligation is primary, while Standard Bank, as guarantor, pays only if Transnet does not.',
      note: '"Contingent obligation" is defined only in the ontology, so a plain knowledge graph cannot answer this.',
      steps: [
        { layer: 'onto', gloss: 'A borrower has a primary obligation', formal: 'BorrowerRole → has → PrimaryObligation', nodes: [['onto', 'BorrowerRole'], ['onto', 'PrimaryObligation']] },
        { layer: 'onto', gloss: 'A guarantor has a contingent obligation', formal: 'GuarantorRole → has → ContingentObligation', nodes: [['onto', 'GuarantorRole'], ['onto', 'ContingentObligation']] },
        { layer: 'link', gloss: 'Transnet is a borrower', formal: 'Transnet instanceOf BorrowerRole', nodes: [['kg', 'Transnet'], ['onto', 'BorrowerRole']] },
        { layer: 'link', gloss: 'Standard Bank is a guarantor', formal: 'Standard Bank instanceOf GuarantorRole', nodes: [['kg', 'StandardBank'], ['onto', 'GuarantorRole']] },
        { layer: 'kg', gloss: 'Standard Bank guarantees Loan_001', formal: 'Standard Bank → guarantorOf → Loan_001', nodes: [['kg', 'StandardBank'], ['kg', 'Loan001']] }
      ]
    },
    {
      type: 'temporal',
      text: 'What changed after Transnet missed the payment?',
      answer: 'The loan went into <b>default</b>, so the rate rose from <b>SOFR + 2% to SOFR + 5%</b> and the exposure was reclassified from <b>performing to non-performing</b>.',
      note: 'The ledger was replayed to 2022-07-01, which added a new Default_001 node to the knowledge graph.',
      steps: [
        { layer: 'amr', gloss: 'Event: Transnet misses a payment', formal: 'miss-02 (2022-07-01)', nodes: [['amr', 'miss']] },
        { layer: 'link', gloss: 'The event refers to Payment_001', formal: 'miss-02 :ARG1 → Payment_001', nodes: [['amr', 'miss'], ['kg', 'Payment001']] },
        { layer: 'amr', gloss: 'The missed payment causes a default', formal: 'miss-02 → :cause → enter-01', nodes: [['amr', 'miss'], ['amr', 'enter']] },
        { layer: 'link', gloss: 'The default creates Default_001', formal: 'enter-01 creates Default_001', nodes: [['amr', 'enter'], ['kg', 'Default001']] },
        { layer: 'amr', gloss: 'The default causes a rate increase', formal: 'enter-01 → :cause → increase-01', nodes: [['amr', 'enter'], ['amr', 'increase']] },
        { layer: 'link', gloss: 'The increase updates Rate_001', formal: 'increase-01 modifies Rate_001', nodes: [['amr', 'increase'], ['kg', 'Rate001']] },
        { layer: 'amr', gloss: 'The default causes a reclassification', formal: 'enter-01 → :cause → reclassify-01', nodes: [['amr', 'enter'], ['amr', 'reclassify']] },
        { layer: 'link', gloss: 'The reclassification updates Exposure_001', formal: 'reclassify-01 modifies Exposure_001', nodes: [['amr', 'reclassify'], ['kg', 'Exposure001']] }
      ]
    },
    {
      type: 'combined',
      text: 'Whose exposure changed, and how?',
      answer: '<b>Banco do Brasil\'s</b>. Its exposure went from <b>performing to non-performing</b> after Transnet\'s default.',
      note: 'This needs both kinds of context: the ontology to find who holds exposure, and the ledger to see how it changed.',
      steps: [
        { layer: 'onto', gloss: 'A lender holds credit exposure', formal: 'LenderRole → holds → CreditExposure', nodes: [['onto', 'LenderRole'], ['onto', 'CreditExposure']] },
        { layer: 'link', gloss: 'Banco do Brasil is a lender', formal: 'Banco do Brasil instanceOf LenderRole', nodes: [['kg', 'BancoDoBrasil'], ['onto', 'LenderRole']] },
        { layer: 'kg', gloss: 'Banco do Brasil holds Exposure_001', formal: 'Banco do Brasil → holds → Exposure_001', nodes: [['kg', 'BancoDoBrasil'], ['kg', 'Exposure001']] },
        { layer: 'amr', gloss: 'Event: the missed payment causes a default', formal: 'miss-02 → :cause → enter-01', nodes: [['amr', 'miss'], ['amr', 'enter']] },
        { layer: 'amr', gloss: 'The default causes a reclassification', formal: 'enter-01 → :cause → reclassify-01', nodes: [['amr', 'enter'], ['amr', 'reclassify']] },
        { layer: 'link', gloss: 'The reclassification updates Exposure_001', formal: 'reclassify-01 modifies Exposure_001', nodes: [['amr', 'reclassify'], ['kg', 'Exposure001']] },
        { layer: 'link', gloss: 'Exposure_001 is a credit exposure', formal: 'Exposure_001 instanceOf CreditExposure', nodes: [['kg', 'Exposure001'], ['onto', 'CreditExposure']] }
      ]
    }
  ];

  var STEP_LAYER = {
    onto: { cls: 'c-onto', name: 'Ontology' },
    kg:   { cls: 'c-kg',   name: 'Knowledge graph' },
    amr:  { cls: 'c-amr',  name: 'AMR ledger' },
    link: { cls: 'c-mix',  name: 'Cross-layer link' }
  };

  // ---------------------------------------------------------------- DOM -----
  var stage = document.getElementById('ex-stage');
  var labelsEl = document.getElementById('ex-labels');
  var qbtnsEl = document.getElementById('qbtns');
  var traceEl = document.getElementById('ex-trace');
  var answerEl = document.getElementById('ex-answer');
  var clockEl = document.getElementById('ex-clock');
  var hintEl = document.getElementById('ex-hint');
  if (!stage) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var STEP_MS = 950;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Question buttons
  var buttons = QUESTIONS.map(function (q, i) {
    var t = TYPES[q.type];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'qbtn';
    b.setAttribute('aria-pressed', 'false');
    b.style.setProperty('--pc', 'var(' + t.v + ')');
    b.innerHTML = '<span class="chip ' + t.cls + '">' + t.name + '</span><span>' + esc(q.text) + '</span>';
    b.addEventListener('click', function () { select(i); });
    qbtnsEl.appendChild(b);
    return b;
  });

  // ---------------------------------------------------------------- 3D ------
  var gl = null; // holds three.js state when WebGL is available
  try {
    if (typeof THREE === 'undefined') throw new Error('three.js not loaded');
    gl = build3D();
  } catch (err) {
    gl = null;
    stage.classList.add('no-webgl');
  }

  function build3D() {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    stage.insertBefore(renderer.domElement, stage.firstChild);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    var dir = new THREE.DirectionalLight(0xffffff, 0.45);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    var state = {
      renderer: renderer, scene: scene, camera: camera,
      nodes: {}, planes: [], edges: [], links: [], tubes: [], layerLabels: [],
      advanced: false, running: true, visible: true
    };

    // Layer planes + labels
    ['onto', 'kg', 'amr'].forEach(function (layer) {
      var y = LAYER_Y[layer] - 0.45;
      var fill = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = y;
      var outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(17, 12)),
        new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 })
      );
      outline.rotation.x = -Math.PI / 2;
      outline.position.y = y;
      scene.add(fill); scene.add(outline);
      state.planes.push({ layer: layer, fill: fill, outline: outline });

      var el = document.createElement('div');
      el.className = 'llabel ' + STEP_LAYER[layer].cls;
      el.textContent = layer === 'onto' ? 'Ontology' : layer === 'kg' ? 'Knowledge graph' : 'AMR event ledger';
      labelsEl.appendChild(el);
      state.layerLabels.push({ el: el, pos: new THREE.Vector3(-8.3, y, 6) });
    });

    // Nodes
    var sphere = new THREE.SphereGeometry(0.3, 24, 16);
    Object.keys(NODES).forEach(function (layer) {
      NODES[layer].forEach(function (n) {
        var mat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 1 });
        var mesh = new THREE.Mesh(sphere, mat);
        mesh.position.set(n.x, LAYER_Y[layer], n.z);
        scene.add(mesh);
        var el = document.createElement('div');
        el.className = 'nlabel ' + STEP_LAYER[layer].cls;
        el.textContent = n.label;
        labelsEl.appendChild(el);
        state.nodes[layer + ':' + n.id] = { layer: layer, data: n, mesh: mesh, el: el, hit: false };
      });
    });

    function pos(layer, id) { return state.nodes[layer + ':' + id].mesh.position; }

    // Edges within layers
    Object.keys(EDGES).forEach(function (layer) {
      EDGES[layer].forEach(function (e) {
        var g = new THREE.BufferGeometry().setFromPoints([pos(layer, e[0]), pos(layer, e[1])]);
        var line = new THREE.Line(g, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 }));
        scene.add(line);
        state.edges.push({ layer: layer, line: line, later: !!e[2] });
      });
    });

    // Cross-layer links (dashed)
    LINKS.forEach(function (l) {
      var g = new THREE.BufferGeometry().setFromPoints([pos(l[0], l[1]), pos(l[2], l[3])]);
      var line = new THREE.Line(g, new THREE.LineDashedMaterial({ transparent: true, opacity: 0.22, dashSize: 0.18, gapSize: 0.12 }));
      line.computeLineDistances();
      scene.add(line);
      state.links.push({ line: line, later: !!l[4] });
    });

    // Controls: rotate only (no wheel zoom / pan, so page scrolling is never hijacked)
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.35;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.45;
    controls.target.set(0, -0.3, 0);
    if (coarse) {
      // On touch screens, keep swipes for page scrolling.
      controls.enabled = false;
      renderer.domElement.style.touchAction = 'pan-y';
      hintEl.textContent = reduceMotion ? '' : 'Rotating slowly';
    }
    controls.addEventListener('start', function () {
      controls.autoRotate = false;
      hintEl.style.opacity = '0';
    });
    state.controls = controls;

    // Size + framing
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      var dist = camera.aspect < 0.9 ? 38 : camera.aspect < 1.3 ? 32 : 24;
      var d = camera.position.clone().sub(controls.target);
      if (d.lengthSq() < 1e-6) d.set(1, 0.72, 1);
      camera.position.copy(controls.target).add(d.normalize().multiplyScalar(dist));
      camera.updateProjectionMatrix();
    }
    camera.position.set(1, 0.72, 1);
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);

    // Only render while on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        state.visible = entries[0].isIntersecting;
        if (state.visible) loop();
      }).observe(stage);
    }

    var v = new THREE.Vector3();
    function place(el, p, lift) {
      v.copy(p); v.y += lift; v.project(camera);
      if (v.z > 1) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = '';
      var x = (v.x + 1) / 2 * stage.clientWidth;
      var y = (1 - v.y) / 2 * stage.clientHeight;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
    }

    var raf = 0;
    function frame() {
      raf = 0;
      if (!state.visible || document.hidden) return;
      controls.update();
      renderer.render(scene, camera);
      Object.keys(state.nodes).forEach(function (k) { var n = state.nodes[k]; place(n.el, n.mesh.position, 0.5); });
      state.layerLabels.forEach(function (l) { place(l.el, l.pos, 0); });
      loop();
    }
    function loop() { if (!raf) raf = requestAnimationFrame(frame); }
    state.loop = loop;
    document.addEventListener('visibilitychange', loop);
    loop();

    return state;
  }

  // ------------------------------------------------------- visual state -----
  function applyColors() {
    if (!gl) return;
    var c = { onto: new THREE.Color(cssVar('--c-onto')), kg: new THREE.Color(cssVar('--c-kg')), amr: new THREE.Color(cssVar('--c-amr')), mix: new THREE.Color(cssVar('--c-mix')) };
    gl.colors = c;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    gl.planes.forEach(function (p) {
      p.fill.material.color.copy(c[p.layer]);
      p.fill.material.opacity = dark ? 0.08 : 0.06;
      p.outline.material.color.copy(c[p.layer]);
    });
    gl.edges.forEach(function (e) { e.line.material.color.copy(c[e.layer]); });
    gl.links.forEach(function (l) { l.line.material.color.copy(c.mix); });
    Object.keys(gl.nodes).forEach(function (k) {
      var n = gl.nodes[k];
      if (!n.hit) { n.mesh.material.color.copy(c[n.layer]); n.mesh.material.emissive.copy(c[n.layer]).multiplyScalar(dark ? 0.35 : 0.15); }
    });
    gl.tubes.forEach(function (t) { t.material.color.copy(c[t.userData.c]); });
    if (gl.pathKey) {
      Object.keys(gl.nodes).forEach(function (k) {
        var n = gl.nodes[k];
        if (n.hit) { n.mesh.material.color.copy(c[gl.pathKey]); n.mesh.material.emissive.copy(c[gl.pathKey]).multiplyScalar(0.45); }
      });
    }
  }

  function setClock(advanced) {
    clockEl.innerHTML = 'Knowledge state · <b>' + (advanced ? EVENT_DATE : START_DATE) + '</b>';
    clockEl.classList.toggle('advanced', advanced);
    if (!gl) return;
    gl.advanced = advanced;
    Object.keys(gl.nodes).forEach(function (k) {
      var n = gl.nodes[k];
      if (!n.data.later) return;
      if (n.layer === 'kg') {
        // Default_001 only exists once the ledger reaches the default event
        n.mesh.visible = advanced;
        n.el.classList.toggle('gone', !advanced);
      } else {
        // AMR events that have not happened yet are shown small and faded
        n.mesh.scale.setScalar(advanced ? 1 : 0.6);
        n.future = !advanced;
      }
    });
    gl.edges.forEach(function (e) { if (e.later) e.line.visible = advanced; });
    gl.links.forEach(function (l) { if (l.later) l.line.visible = advanced; });
    refreshDim();
  }

  function refreshDim() {
    if (!gl) return;
    var playing = !!gl.pathKey;
    Object.keys(gl.nodes).forEach(function (k) {
      var n = gl.nodes[k];
      var op = n.hit ? 1 : playing ? 0.22 : (n.future ? 0.4 : 1);
      n.mesh.material.opacity = op;
      n.el.classList.toggle('dim', !n.hit && (playing || !!n.future));
      n.el.classList.toggle('hit', !!n.hit);
    });
    gl.edges.forEach(function (e) { e.line.material.opacity = playing ? 0.15 : 0.5; });
    gl.links.forEach(function (l) { l.line.material.opacity = playing ? 0.08 : 0.22; });
  }

  function clearPath() {
    if (!gl) return;
    gl.tubes.forEach(function (t) { gl.scene.remove(t); t.geometry.dispose(); t.material.dispose(); });
    gl.tubes = [];
    gl.pathKey = null;
    Object.keys(gl.nodes).forEach(function (k) {
      var n = gl.nodes[k];
      n.hit = false;
      n.mesh.scale.setScalar(n.data.later && n.layer === 'amr' && !gl.advanced ? 0.6 : 1);
      n.el.style.removeProperty('--pc');
    });
    applyColors();
  }

  function highlight(step, key, cssName) {
    if (!gl) return;
    var c = gl.colors[key];
    var pts = step.nodes.map(function (ref) {
      var n = gl.nodes[ref[0] + ':' + ref[1]];
      n.hit = true;
      n.mesh.scale.setScalar(1.35);
      n.mesh.material.color.copy(c);
      n.mesh.material.emissive.copy(c).multiplyScalar(0.45);
      n.el.style.setProperty('--pc', 'var(' + cssName + ')');
      return n.mesh.position;
    });
    for (var i = 0; i < pts.length - 1; i++) {
      var tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.LineCurve3(pts[i].clone(), pts[i + 1].clone()), 1, 0.07, 8, false),
        new THREE.MeshBasicMaterial({ color: c })
      );
      tube.userData.c = key;
      gl.scene.add(tube);
      gl.tubes.push(tube);
    }
    refreshDim();
  }

  // ------------------------------------------------------- playback ---------
  var timers = [];
  function stop() { timers.forEach(clearTimeout); timers = []; }

  function select(qi) {
    var q = QUESTIONS[qi];
    var t = TYPES[q.type];
    var key = t.cls.replace('c-', '');
    stop();
    buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', i === qi ? 'true' : 'false'); });

    clearPath();
    setClock(false);
    if (gl) { gl.pathKey = key; refreshDim(); }

    traceEl.innerHTML = q.steps.map(function (s) {
      var L = STEP_LAYER[s.layer];
      return '<li class="tstep ' + L.cls + '"><span class="lay">' + L.name + '</span>' + esc(s.gloss) +
        '<span class="formal">' + esc(s.formal) + '</span></li>';
    }).join('');
    var items = traceEl.querySelectorAll('.tstep');

    answerEl.hidden = true;
    answerEl.classList.remove('show');
    answerEl.style.setProperty('--pc', 'var(' + t.v + ')');
    answerEl.innerHTML = '<span class="ex-label">Answer</span>' + q.answer + (q.note ? '<span class="note">' + esc(q.note) + '</span>' : '');

    function doStep(i) {
      var s = q.steps[i];
      items.forEach(function (li, j) { li.classList.toggle('now', j === i); });
      items[i].classList.add('on');
      if (s.layer === 'amr' && !(gl ? gl.advanced : clockEl.classList.contains('advanced'))) setClock(true);
      highlight(s, key, t.v);
    }
    function finish() {
      items.forEach(function (li) { li.classList.remove('now'); });
      answerEl.hidden = false;
      void answerEl.offsetWidth; // force layout so the fade-in transition runs
      answerEl.classList.add('show');
    }

    if (reduceMotion) {
      q.steps.forEach(function (_, i) { doStep(i); });
      finish();
      return;
    }
    q.steps.forEach(function (_, i) {
      timers.push(setTimeout(function () { doStep(i); }, 300 + i * STEP_MS));
    });
    timers.push(setTimeout(finish, 300 + q.steps.length * STEP_MS));
  }

  // ------------------------------------------------------- init -------------
  applyColors();
  setClock(false);
  document.addEventListener('themechange', applyColors);

  // Exposed for automated checks only.
  window.__kspExplorer = { select: select, webgl: !!gl, questions: QUESTIONS.length };
})();
