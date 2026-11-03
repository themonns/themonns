import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('c3d');
const slider = document.getElementById('hSlider');
const roK = document.getElementById('roK'), roN = document.getElementById('roN'), roF = document.getElementById('roF'), roA = document.getElementById('roA');
const levelList = document.getElementById('levelList');
const legend = document.getElementById('legend') || document.createElement('ul');
let lastId = null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function noWebgl(){ document.documentElement.classList.add('no-webgl'); }
let gl; try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch(e) {}
if (!gl) { noWebgl(); }

const [data, bounds] = await Promise.all([
  fetch('levels.json').then(r => r.json()),
  fetch('assets/model_bounds.json').then(r => r.json()),
]);
const GROUND = data.ground;
const levels = data.levels;
const groups = data.groups;

// legend
for (const [k, g] of Object.entries(groups)) {
  const li = document.createElement('li');
  li.innerHTML = `<i style="background:${g.color}"></i><span>${g.label}</span>`;
  legend.appendChild(li);
}
// level list
const liOf = {};
levels.forEach(l => {
  const li = document.createElement('li');
  li.innerHTML = `<b>${l.name}</b><span>${l.title || l.func.split('.')[0]}</span>`;
  li.addEventListener('click', () => { goto(l.id); });
  levelList.appendChild(li); liOf[l.id] = li;
});

if (!gl) { /* keep the list; no 3D */ }

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.localClippingEnabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const bg = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#e8dfd3');
scene.background = bg;
scene.fog = new THREE.Fog(bg, 520, 1500);

const camera = new THREE.PerspectiveCamera(36, 1, 1, 3000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 60; controls.maxDistance = 600;
controls.maxPolarAngle = Math.PI * 0.52; controls.minPolarAngle = 0.15;
controls.enablePan = false;
controls.autoRotateSpeed = 0.5;

// paper model: one warm white, ink edges, solid poché where the model is cut
scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc4b8, 2.3));
const key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(-160, 240, 200); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.15); fill.position.set(220, 80, -180); scene.add(fill);

// tower centre from P15 bounds (IFC x east, y north, z up)
const p15 = bounds['P15'] || bounds['P14'];
const tx = (p15.min[0] + p15.max[0]) / 2, ty = (p15.min[1] + p15.max[1]) / 2;
const root = new THREE.Group();
root.rotation.x = -Math.PI / 2;            // IFC z-up -> three y-up ; IFC y (north) -> three -z
root.position.set(-tx, -GROUND, -(-ty));
scene.add(root);
const H = k => k - GROUND;

// clipping planes (world space)
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), H(650));   // keep y <= h
const sectPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);       // keep north half; the cut faces the camera
let cutOn = true;

const towerKeys = new Set(['P03','P04','P05','P06','P07','P08','P09','P10','P11','P12','P13','P14','P15','Takplan']);
const keyOfLevel = {};
levels.forEach(l => { const ks = Array.isArray(l.ifc) ? l.ifc : (l.ifc ? [l.ifc] : []); ks.forEach(k => keyOfLevel[k.split(' ')[0].replace('.', '')] = l); });

const PAPER = new THREE.Color('#f3eee7'), UNDER = new THREE.Color('#e6ddd2');
const POCHE = new THREE.Color('#2f2520'), INK = new THREE.Color('#3b302a');
const ACCENT = new THREE.Color('#b4732e'), ACCENT_SOFT = new THREE.Color('#e7c9a4');
const sets = {};   // key -> { front, back, line }
function setFor(key) {
  if (sets[key]) return sets[key];
  const planes = [cutPlane, sectPlane];
  const base = key.startsWith('PU') ? UNDER : PAPER;
  const front = new THREE.MeshLambertMaterial({ color: base.clone(), side: THREE.DoubleSide, clippingPlanes: planes,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  front.userData.base = base.clone();
  const line = new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: 0.22, clippingPlanes: planes });
  return (sets[key] = { front, line });
}

let built = false;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
fetch('assets/model.txt').then(r => r.text()).then(t => { const bin = atob(t.trim()); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); loader.parse(u.buffer, '', gltf => {
  const add = [];
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const key = ((o.parent && o.parent.name) || o.name || '').split('__')[0];
    const st = setFor(key);
    o.material = st.front; o.frustumCulled = false;
    if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 40), st.line); edges.frustumCulled = false;
    add.push([o, edges]);
  });
  add.forEach(([o, e]) => o.add(e));
  root.add(gltf.scene);
  built = true; lastId = null;
}, err => { console.error(err); noWebgl(); }); }).catch(err => { console.error(err); noWebgl(); });

// section caps: solid poché where the vertical section cuts the tower (precomputed from the IFC)
const capsGroup = new THREE.Group(); root.add(capsGroup);
fetch('assets/caps.json').then(r => r.json()).then(C => {
  for (const [key, polys] of Object.entries(C.keys)) {
    const st = setFor(key);
    const mat = new THREE.MeshBasicMaterial({ color: POCHE.clone(), side: THREE.DoubleSide, clippingPlanes: [cutPlane] });
    st.cap = mat;
    for (const p of polys) {
      const shape = new THREE.Shape(p.o.map(([x, z]) => new THREE.Vector2(x, z)));
      p.h.forEach(h => shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z)))));
      const g = new THREE.ShapeGeometry(shape);
      const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) { const x = a.getX(i), z = a.getY(i); a.setXYZ(i, x, C.ty + 0.03, z); }
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; capsGroup.add(m);
    }
  }
  lastId = null;
});

// cut line: a thin accent ring at the cut height
const cap = new THREE.Mesh(new THREE.RingGeometry(9.2, 9.6, 96), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
cap.rotation.x = -Math.PI / 2; scene.add(cap);

// terrain: Kartverket DTM1 around the foot, maps3d terrain beyond, georeferenced on the orthophoto.
// The orthophoto is printed faintly under 2 m contours; trees are read from the photo.
const T = await fetch('terrain2.json').then(r => r.json());
const TW = (T.nx - 1) * T.step, TH = (T.ny - 1) * T.step;
const hAt = (e, n) => {
  const i = Math.min(T.nx - 2, Math.max(0, Math.floor((e - T.e0) / T.step))), j = Math.min(T.ny - 2, Math.max(0, Math.floor((n - T.n0) / T.step)));
  const fi = Math.min(1, Math.max(0, (e - T.e0) / T.step - i)), fj = Math.min(1, Math.max(0, (n - T.n0) / T.step - j));
  const g = (a, b) => T.z0 + T.h[b * T.nx + a] * T.dz;
  return (g(i, j) * (1 - fi) + g(i + 1, j) * fi) * (1 - fj) + (g(i, j + 1) * (1 - fi) + g(i + 1, j + 1) * fi) * fj;
};
const tg = new THREE.PlaneGeometry(TW, TH, T.nx - 1, T.ny - 1);
const pos = tg.attributes.position;
for (let k = 0; k < pos.count; k++) {
  const e = pos.getX(k) + T.e0 + TW / 2, n = pos.getY(k) + T.n0 + TH / 2;
  pos.setZ(k, H(hAt(e, n)));
}
tg.computeVertexNormals();
const ortho = new THREE.TextureLoader().load('assets/ortho.jpg');
ortho.colorSpace = THREE.NoColorSpace;
const FADE = `float edgeFade(vec2 en){ float d = min(min(en.x - uB.x, uB.z - en.x), min(en.y - uB.y, uB.w - en.y)); return smoothstep(0.0, 70.0, d); }`;
const bounds4 = new THREE.Vector4(T.e0, T.n0, T.e0 + TW, T.n0 + TH);
const terrainMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, extensions: { derivatives: true },
  uniforms: { uPaper: { value: new THREE.Color('#ece5dc') }, uInk: { value: new THREE.Color('#6f6156') }, uB: { value: bounds4 }, uA: { value: 1 }, uCut: { value: 1 }, uMap: { value: ortho } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uPaper; uniform vec3 uInk; uniform vec4 uB; uniform float uA; uniform float uCut; uniform sampler2D uMap; varying vec3 vW;
    ${FADE}
    void main(){
      vec2 en = vec2(vW.x, -vW.z);
      if (uCut > 0.5 && en.y < 0.0) discard;
      float h = vW.y / 2.0; float f = abs(fract(h - 0.5) - 0.5) / fwidth(h);
      float line = 1.0 - min(f, 1.0);
      float h10 = vW.y / 10.0; float f10 = abs(fract(h10 - 0.5) - 0.5) / fwidth(h10);
      float major = 1.0 - min(f10 / 1.6, 1.0);
      vec2 uv = (en - uB.xy) / (uB.zw - uB.xy);
      float g = texture2D(uMap, uv).r;
      float shade = smoothstep(0.95, 0.15, g) * 0.42;
      vec3 col = mix(uPaper, uInk, max(shade, max(line * 0.5, major * 0.8)));
      float a = (0.62 + 0.3 * max(line * 0.45, major)) * edgeFade(en) * uA;
      gl_FragColor = vec4(col, a);
    }`
});
const terrain = new THREE.Mesh(tg, terrainMat);
terrain.rotation.x = -Math.PI / 2;
terrain.position.set(T.e0 + TW / 2, 0, -(T.n0 + TH / 2));
terrain.renderOrder = 2;
const terrainGroup = new THREE.Group(); terrainGroup.add(terrain); scene.add(terrainGroup);

// the soil in the section: a hatched face along the cut, with the halls left open
const earthMat = new THREE.ShaderMaterial({
  transparent: true, side: THREE.DoubleSide, extensions: { derivatives: true },
  uniforms: { uB: { value: bounds4 }, uA: { value: 1 } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec4 uB; uniform float uA; varying vec3 vW;
    ${FADE}
    void main(){
      float k = (vW.x + vW.y) / 3.2; float f = abs(fract(k) - 0.5) / fwidth(k);
      float hatch = 1.0 - min(f, 1.0);
      vec3 col = mix(vec3(0.87, 0.83, 0.77), vec3(0.50, 0.44, 0.39), hatch * 0.32);
      float fade = smoothstep(0.0, 70.0, min(vW.x - uB.x, uB.z - vW.x));
      float deep = smoothstep(-36.0, -14.0, vW.y);
      gl_FragColor = vec4(col, 0.9 * fade * deep * uA);
    }`
});
const earthGroup = new THREE.Group(); scene.add(earthGroup);
fetch('assets/earth.json').then(r => r.json()).then(E => {
  for (const p of E.polys) {
    const shape = new THREE.Shape(p.o.map(([x, z]) => new THREE.Vector2(x, H(z))));
    p.h.forEach(h => shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, H(z))))));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), earthMat); m.position.z = 0.06; m.renderOrder = 1; earthGroup.add(m);
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(E.line.map(([x, z]) => new THREE.Vector3(x, H(z) + 0.05, 0.1))),
    new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.8 }));
  earthGroup.add(line);
});

// trees, read from the orthophoto: faceted cones in paper green, cut with the section
const treeMat = new THREE.MeshLambertMaterial({ color: '#dcd8c8', flatShading: true, clippingPlanes: [sectPlane] });
fetch('assets/trees.json').then(r => r.json()).then(({ t }) => {
  const keep = [];
  for (let i = 0; i < t.length; i += 4) {
    const e = t[i], n = t[i + 1];
    const d = Math.min(e - T.e0, T.e0 + TW - e, n - T.n0, T.n0 + TH - n);
    if (d > 30 + 40 * Math.random() && (i / 4) % 3 !== 0) keep.push(i);
  }
  const geo = new THREE.ConeGeometry(0.22, 1, 6); geo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geo, treeMat, keep.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  keep.forEach((i, k) => {
    const h = t[i + 3]; sc.set(h, h, h); ps.set(t[i], H(hAt(t[i], t[i + 1])) - 0.4, -t[i + 1]);
    inst.setMatrixAt(k, m4.compose(ps, q, sc));
  });
  inst.frustumCulled = false; terrainGroup.add(inst);
});

// people: small figures walking simple routes on the plateau and the roof terrace
const people = [];
const personMat = new THREE.MeshLambertMaterial({ color: '#4a3f37', clippingPlanes: [sectPlane] });
let crowd = null;
fetch('assets/people.json').then(r => r.json()).then(({ p }) => {
  const geo = new THREE.CapsuleGeometry(0.26, 1.25, 3, 6); geo.translate(0, 0.9, 0);
  p = p.filter((_, i) => i % 2 === 0); const n = p.length;
  crowd = new THREE.InstancedMesh(geo, personMat, n); crowd.frustumCulled = false;
  p.forEach(path => {
    const per = 1;
    const pts = path.map(([e, nn, z]) => new THREE.Vector3(e, H(z), -nn));
    const seg = []; let L = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const d = a.distanceTo(b); seg.push([a, b, L, d]); L += d; }
    for (let i = 0; i < per; i++) people.push({ seg, L, s: Math.random() * L, v: 1.1 + Math.random() * 0.5 });
  });
  scene.add(crowd);
});
// birds: a small flock circling the tower, wings flapping slowly
const birds = [];
const wingGeo = new THREE.BufferGeometry();
wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.35, 0, 0, 0.35, 1.3, 0, 0], 3));
wingGeo.computeVertexNormals();
const birdMat = new THREE.MeshBasicMaterial({ color: '#3b302a', side: THREE.DoubleSide });
for (let i = 0; i < 9; i++) {
  const g = new THREE.Group();
  const l = new THREE.Mesh(wingGeo, birdMat), r = new THREE.Mesh(wingGeo, birdMat);
  r.scale.x = -1; g.add(l, r); g.scale.setScalar(1.6);
  const flock = i < 5 ? 0 : 1;
  birds.push({ g, l, r, R: (flock ? 95 : 70) + Math.random() * 14, y: H(flock ? 600 : 575) + Math.random() * 8,
    a: Math.random() * 0.5 + flock * Math.PI, w: (flock ? -1 : 1) * (0.07 + Math.random() * 0.01), ph: Math.random() * 6.28 });
  scene.add(g);
}
function stepBirds(t, dt) {
  birds.forEach(b => {
    b.a += b.w * dt;
    const x = Math.cos(b.a) * b.R, z = Math.sin(b.a) * b.R, y = b.y + Math.sin(t * 0.0004 + b.ph) * 3;
    b.g.position.set(x, y, z);
    b.g.rotation.y = -b.a + (b.w > 0 ? 0 : Math.PI);
    const f = Math.sin(t * 0.009 + b.ph) * 0.55;
    b.l.rotation.z = f; b.r.rotation.z = -f;
  });
}
const pm = new THREE.Matrix4(), pv = new THREE.Vector3();
function stepPeople(dt) {
  if (!crowd) return;
  people.forEach((o, k) => {
    o.s = (o.s + o.v * dt) % o.L;
    let sg = o.seg[0]; for (const g of o.seg) { if (o.s >= g[2]) sg = g; else break; }
    const f = sg[3] > 0 ? (o.s - sg[2]) / sg[3] : 0;
    pv.lerpVectors(sg[0], sg[1], f);
    crowd.setMatrixAt(k, pm.makeTranslation(pv.x, pv.y, pv.z));
  });
  crowd.instanceMatrix.needsUpdate = true;
}

// ground line: kote 528,5
const ring = new THREE.Mesh(new THREE.RingGeometry(14, 14.25, 128), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.y = H(GROUND) + 0.2; scene.add(ring);

// ---------- camera framing ----------
const camBase = new THREE.Vector3(112, H(600), 162);
camera.position.copy(camBase);
controls.target.set(10, H(566), 0);
controls.update();

let host = stage, mini = false, miniLevel = null;
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  controls.target.set(10, H(566), 0); camera.position.copy(camBase);
  if (mini) {
    // the small model in the guest flow: closer, centred on the guest
    // a steady view of the whole facility; only the guest moves
    const c = new THREE.Vector3(14, H(560), 0);
    const dir = camBase.clone().sub(new THREE.Vector3(10, H(566), 0)).multiplyScalar(w / h < 1 ? 1.15 : 1.0);
    controls.target.copy(c); camera.position.copy(c).add(dir); controls.update(); return;
  }
  if (w / h < 1) {
    // portrait: pull back and look lower so the model sits above the readout
    controls.target.set(10, H(512), 0);
    const k = Math.pow(h / w, 0.92); const dir = camBase.clone().sub(new THREE.Vector3(10, H(566), 0));
    camera.position.copy(controls.target).add(dir.multiplyScalar(k));
  }
  controls.update();
}
addEventListener('resize', resize); resize();

// ---------- height / readout ----------
const fmt = v => v.toFixed(1).replace('.', ',');
let targetH = 650, curH = 650;
function activeLevel(h) {
  let best = null;
  for (const l of levels) { if ((l.kote_top || l.kote) <= h + 0.001) { if (!best || l.kote > best.kote) best = l; } }
  return best || levels[levels.length - 1];
}
function setHeight(h, animate) {
  h = Math.min(650, Math.max(515, h));
  targetH = h; if (!animate || reduced) curH = h;
  slider.value = h.toFixed(1);
}
function paint(l) {
  for (const [key, st] of Object.entries(sets)) {
    const lv = keyOfLevel[key]; const on = l && lv && lv.id === l.id;
    st.front.color.copy(on ? ACCENT_SOFT : st.front.userData.base);
    if (st.cap) st.cap.color.copy(on ? ACCENT : POCHE);
    st.line.color.copy(on ? ACCENT : INK); st.line.opacity = on ? 0.75 : 0.22;
  }
}
function applyHeight(h) {
  cutPlane.constant = H(h);
  cap.position.y = H(h); cap.material.opacity = h < 598 && h > 519 ? 0.9 : 0.0;
  const l = (mini && miniLevel) ? miniLevel : activeLevel(h);
  if (l && l.id !== lastId) {
    lastId = l.id;
    roK.textContent = 'kote ' + fmt(l.kote) + (l.kote_top ? ' til ' + fmt(l.kote_top) : '');
    roN.textContent = l.name + (l.title ? ' · ' + l.title : '');
    roF.textContent = l.func;
    roA.textContent = [l.area, l.seats, (l.kote >= GROUND ? fmt(l.kote - GROUND) + ' m over bakken' : fmt(GROUND - l.kote) + ' m under bakken')].filter(Boolean).join(' · ');
    Object.values(liOf).forEach(li => li.classList.remove('on'));
    liOf[l.id].classList.add('on');
    document.dispatchEvent(new CustomEvent('tt-level', { detail: l }));
    paint(l);
  }
}
slider.addEventListener('input', () => setHeight(parseFloat(slider.value), false));
slider.addEventListener('pointerdown', () => { intro = false; });
slider.addEventListener('keydown', () => { intro = false; });

// buttons
const btnCut = document.getElementById('btnCut'), btnGround = document.getElementById('btnGround'), btnSpin = document.getElementById('btnSpin');
btnCut.addEventListener('click', () => {
  cutOn = !cutOn; btnCut.setAttribute('aria-pressed', String(cutOn));
  sectPlane.constant = cutOn ? 0 : 1e6; capsGroup.visible = cutOn; earthGroup.visible = cutOn; terrainMat.uniforms.uCut.value = cutOn ? 1 : 0;
});
btnGround.addEventListener('click', () => {
  const on = !terrainGroup.visible; terrainGroup.visible = on; btnGround.setAttribute('aria-pressed', String(on));
});
btnSpin.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate; btnSpin.setAttribute('aria-pressed', String(controls.autoRotate));
});

// intro sweep when the stage enters view
let intro = !reduced, introStart = 0, started = false;
const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting && !started) { started = true; introStart = performance.now(); } }); }, { threshold: 0.35 });
io.observe(stage);

let visible = true;
// one renderer, two places: the canvas moves into the guest flow as a small model when that section is in view
const flowStage = document.getElementById('flowStage');
const ratio = new Map();
function mount(el) {
  if (host === el) return;
  host = el; mini = el !== stage;
  canvas.style.transition = 'none'; canvas.style.opacity = '0';
  el.appendChild(canvas);
  requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.transition = 'opacity .6s ease'; canvas.style.opacity = '1'; }));
  if (mini) { intro = false; controls.autoRotate = false; }
  resize();
}
const vio2 = new IntersectionObserver(es => {
  es.forEach(e => ratio.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
  const rs = ratio.get(stage) || 0, rf = flowStage ? (ratio.get(flowStage) || 0) : 0;
  visible = rs > 0 || rf > 0;
  if (flowStage && !mini && rf > 0.45 && rf > rs) { mount(flowStage); if (!guest.visible) { guestTo('p1', true); miniLevel = levels.find(x => x.id === 'p1'); } lastId = null; setHeight(650, false); }
  else if (mini && rs > 0.3 && rs > rf) { mount(stage); lastId = null; }
}, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
vio2.observe(stage); if (flowStage) vio2.observe(flowStage);

// the guest: a copper marker that walks the flow, leaving a thin trail
const ACC = new THREE.Color('#b4732e');
const guest = new THREE.Group(); guest.visible = false;
const gDot = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 14), new THREE.MeshBasicMaterial({ color: ACC }));
const gRing = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.1, 40), new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
gRing.rotation.x = -Math.PI / 2; guest.add(gDot, gRing); scene.add(guest);
const trailGeo = new THREE.BufferGeometry(); const trailPts = [];
const trail = new THREE.Line(trailGeo, new THREE.LineDashedMaterial({ color: ACC, dashSize: 2, gapSize: 1.5 })); scene.add(trail);
function centreOf(key, kote, dx = 0) {
  const b = bounds[key]; if (!b) return new THREE.Vector3(0, H(kote) + 1.5, 0);
  return new THREE.Vector3((b.min[0] + b.max[0]) / 2 - tx + dx, H(kote) + 1.5, -((b.min[1] + b.max[1]) / 2 - ty));
}
const STOPS = {
  p1: () => new THREE.Vector3(-14, H(528.52) + 1.5, 6),
  u1: () => centreOf('PU1', 527.23), p15: () => new THREE.Vector3(0, H(585.72) + 1.5, 0),
  u2: () => centreOf('PU2', 525.17), u3: () => centreOf('PU3', 521.9),
  tunnel: () => { const b = bounds['PU3']; return new THREE.Vector3(b.max[0] - tx - 4, H(521.9) + 1.5, -((b.min[1] + b.max[1]) / 2 - ty)); },
};
let gFrom = new THREE.Vector3(), gTo = new THREE.Vector3(), gT = 1;
function guestTo(id, jump) {
  const f = STOPS[id]; if (!f) return;
  const p = f();
  if (!guest.visible || jump) { guest.position.copy(p); gFrom.copy(p); gTo.copy(p); gT = 1; guest.visible = true; trailPts.length = 0; trailPts.push(p.clone()); }
  else { gFrom.copy(guest.position); gTo.copy(p); gT = 0; trailPts.push(p.clone()); if (trailPts.length > 6) trailPts.shift(); }
  trailGeo.setFromPoints(trailPts); trail.computeLineDistances();
}
window.ttGuest = (id, stepGoto) => { guestTo(id); if (!stepGoto) return; if (mini) { miniLevel = levels.find(x => x.id === stepGoto) || null; lastId = null; } else goto(stepGoto); };

function frame(t) {
  requestAnimationFrame(frame);
  if (!visible) return;
  if (intro && started) {
    const k = Math.min(1, (t - introStart) / 14000);
    const e = 0.5 - 0.5 * Math.cos(k * 2 * Math.PI);       // down and back up
    const h = 650 - e * (650 - 519);
    setHeight(h, false);
    if (k >= 1) { intro = false; }
  }
  const dt = Math.min(0.1, (t - (frame.last || t)) / 1000); frame.last = t;
  curH += (targetH - curH) * (1 - Math.exp(-dt * 7));
  if (!reduced) { stepPeople(dt); stepBirds(t, dt); }
  if (gT < 1) { gT = Math.min(1, gT + dt / 2.2); const e = gT < 0.5 ? 2 * gT * gT : 1 - Math.pow(-2 * gT + 2, 2) / 2; guest.position.lerpVectors(gFrom, gTo, e); }
  if (guest.visible) { gDot.scale.setScalar(mini ? 1.2 : 1); const s2 = 1 + 0.25 * Math.sin(t * 0.004); gRing.scale.set(s2, s2, s2); }
  const ua = curH < GROUND + 2 ? 0.35 : 1; terrainMat.uniforms.uA.value += (ua - terrainMat.uniforms.uA.value) * (1 - Math.exp(-dt * 5));
  applyHeight(curH);
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
applyHeight(650);
function goto(id) {
  const l = levels.find(x => x.id === id); if (!l) return;
  intro = false;
  setHeight((l.kote_top || l.kote) + 1.2, true);
}
window.ttGoto = goto;
document.dispatchEvent(new CustomEvent('tt-ready'));
