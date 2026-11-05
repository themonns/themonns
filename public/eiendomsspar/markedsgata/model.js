/* Markedsgata: modell av Mack Kvartalet med Monns romløsninger.
   Hotellet og Nybygget er arkitektens IFC (Mack_ARK, Draco i mackdrc.js). Teglgården er bygget opp fra arealtegningene.
   Romløsningene er Monns plantegninger, registrert mot byggets omriss: tegningen ligger på gulvet og veggene reises fra den.
   Meter. y opp. Planramme (OPAK) → verden via MG_PLANS.xf. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const D = window.MG_DATA, P = window.MG_PLANS;
const GROUND = 2.4;
const ORDER = ['1', 'm', '2', '3', '4', 'hotell'];
const TEGL = { base: 6.0, fh: 3.12, floors: ['1', '2', '3', '4'] };           // Teglgården: 1. etasje på kote 6,0, 3. etasje på +12,24 (tegning)
const tz = f => TEGL.base + (TEGL.floors.indexOf(f)) * TEGL.fh;
const COL = { land: 0xe6dccf, road: 0xd9cdbf, water: 0x8c9c9e, park: 0xb9bea5, nb: 0xf3ece4, nbTop: 0xf8f2ec, tree: 0x8f9a7e, trunk: 0x8a8577,
  brick: '#93513b', mortar: '#7c4331', glass: '#273c41', frame: '#e9e2d6', slab: 0xeee4d9, cut: 0x82401d, wall: 0xfaf5f0, core: 0xa3a39b, boat: 0xffffff };

// planramme → verden
const XF = P.xf, ca = Math.cos(XF.ang * Math.PI / 180), sa = Math.sin(XF.ang * Math.PI / 180);
export function o2w(x, y) { const a = x * XF.mir; return [a * ca - y * sa + XF.dx, a * sa + y * ca + XF.dy]; }
const AX = (() => { const [x0, z0] = o2w(0, 0), [x1, z1] = o2w(1, 0); return Math.atan2(z1 - z0, x1 - x0); })();

function polyGeo(pts, y, uvOf) {                 // pts i planramme
  const v2 = pts.map(p => new THREE.Vector2(p[0], p[1]));
  if (v2.length > 2 && v2[0].equals(v2[v2.length - 1])) v2.pop();
  const tris = THREE.ShapeUtils.triangulateShape(v2, []);
  const pos = [], uv = [];
  tris.flat().forEach(i => { const [X, Z] = o2w(v2[i].x, v2[i].y); pos.push(X, y, Z); if (uvOf) uv.push(...uvOf(v2[i].x, v2[i].y)); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uvOf) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}
function worldPoly(pts) { return pts.map(p => o2w(p[0], p[1])); }
function facade(pts, y0, h, repeat) {            // vegger rundt et omriss med UV i meter
  const W = worldPoly(pts); const pos = [], uv = []; let s = 0;
  for (let i = 0; i < W.length - 1; i++) {
    const a = W[i], b = W[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
    const u0 = s / repeat, u1 = (s + L) / repeat; s += L;
    pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y0 + h, b[1], a[0], y0, a[1], b[0], y0 + h, b[1], a[0], y0 + h, a[1]);
    uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function brickTex(sill) {                        // ett fag på 2,45 m: teglflate med vindu, i tegningens rytme
  const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = COL.brick; g.fillRect(0, 0, 128, 160);
  g.fillStyle = COL.mortar; for (let y = 0; y < 160; y += 5) g.fillRect(0, y, 128, 1);
  if (!sill) { g.fillStyle = COL.frame; g.fillRect(38, 44, 52, 56); g.fillStyle = COL.glass; g.fillRect(41, 47, 46, 50); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function glassTex() {                           // 4. etasje: glassfasade med smale poster, slik tegningen viser
  const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#4f6a70'; g.fillRect(0, 0, 128, 160); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, 0, 128, 60);
  g.fillStyle = '#d9dcd8'; g.fillRect(0, 0, 128, 10); g.fillRect(0, 150, 128, 10); g.fillRect(0, 0, 5, 160); g.fillRect(62, 0, 4, 160);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const ease = t => 1 - Math.pow(1 - t, 3);

export function mountModel(el, opts = {}) {
  const scene = new THREE.Scene();
  const BG = new THREE.Color(opts.background || 0xece1d6); scene.background = BG;
  scene.fog = new THREE.Fog(BG, 320, 700);
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 2500); camera.position.set(-150, 120, 190);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!opts.snap });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.localClippingEnabled = true;
  el.appendChild(renderer.domElement);
  const status = document.createElement('div'); status.className = 'mg-status'; status.textContent = 'Laster modellen'; el.appendChild(status);

  scene.add(new THREE.HemisphereLight(0xf4f8f8, 0xc9cfc8, 1.25));
  const sun = new THREE.DirectionalLight(0xfff3e4, 1.6); sun.position.set(-120, 160, 110); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 20, far: 520 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; scene.add(sun);

  // omgivelser fra OpenStreetMap
  const R = 260, near = pts => { const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]); return Math.hypot(c[0], c[1]) < R; };
  const land = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshStandardMaterial({ color: COL.land, roughness: 1 })); land.rotation.x = -Math.PI / 2; land.position.y = GROUND; land.receiveShadow = true; scene.add(land);
  const roadMat = new THREE.MeshStandardMaterial({ color: COL.road, roughness: 1 });
  D.roads.forEach(r => { for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; if (Math.hypot(a[0], a[1]) > R) continue; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.5) continue; const g = new THREE.PlaneGeometry(L + r.w * 0.6, r.w); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, roadMat); m.rotation.y = -Math.atan2(dz, dx); m.position.set((a[0] + b[0]) / 2, GROUND + 0.05, (a[1] + b[1]) / 2); m.receiveShadow = true; scene.add(m); } });
  const shape = pts => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])); return s; };
  const ext = (pts, h, mat, y0) => { const g = new THREE.ExtrudeGeometry(shape(pts), { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.y = y0; m.castShadow = m.receiveShadow = true; return m; };
  const parkMat = new THREE.MeshStandardMaterial({ color: COL.park, roughness: 1 });
  D.parks.forEach(p => { if (p.length > 2 && near(p)) { const g = new THREE.ShapeGeometry(shape(p)); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, parkMat); m.position.y = GROUND + 0.07; m.receiveShadow = true; scene.add(m); } });
  { const v = D.waterTris, pos = new Float32Array(v.length / 2 * 3); for (let i = 0, j = 0; i < v.length; i += 2, j += 3) { pos[j] = v[i]; pos[j + 1] = 0; pos[j + 2] = v[i + 1]; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals(); const wm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: COL.water, roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide })); wm.position.y = GROUND + 0.04; wm.receiveShadow = true; scene.add(wm); }
  const nbMat = [new THREE.MeshStandardMaterial({ color: COL.nbTop, roughness: 1 }), new THREE.MeshStandardMaterial({ color: COL.nb, roughness: 0.95 })];
  const tegOuter = worldPoly(P.tegl['4']);
  const inTegl = (x, z) => { let c = false; for (let i = 0, j = tegOuter.length - 1; i < tegOuter.length; j = i++) { const [xi, zi] = tegOuter[i], [xj, zj] = tegOuter[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; };
  D.bld.forEach(b => { if (b.pts.length > 2 && near(b.pts)) { const c = b.pts.reduce((a, p) => [a[0] + p[0] / b.pts.length, a[1] + p[1] / b.pts.length], [0, 0]); if (inTegl(c[0], c[1])) return; scene.add(ext(b.pts, b.h, nbMat, GROUND)); } });
  D.piers.forEach(p => { if (p.length > 2 && near(p)) scene.add(ext(p, 0.6, nbMat[0], GROUND + 0.1)); });
  const trunkG = new THREE.CylinderGeometry(0.16, 0.22, 3, 6), leafG = new THREE.IcosahedronGeometry(1, 1);
  const trunkM = new THREE.MeshStandardMaterial({ color: COL.trunk }), leafM = new THREE.MeshStandardMaterial({ color: COL.tree, roughness: 1, flatShading: true });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tree = (x, z, s) => { const t = new THREE.Mesh(trunkG, trunkM); t.position.set(x, GROUND + 1.5 * s, z); t.scale.setScalar(s); scene.add(t); const l = new THREE.Mesh(leafG, leafM); l.scale.set(2.3 * s, 2.8 * s, 2.3 * s); l.position.set(x, GROUND + 4.2 * s, z); l.castShadow = true; scene.add(l); };
  D.parks.forEach(p => { if (p.length < 3 || !near(p)) return; const xs = p.map(q => q[0]), ys = p.map(q => q[1]); for (let i = 0; i < 26; i++) { const x = Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + rnd() * (Math.max(...ys) - Math.min(...ys)); let c = false; for (let a = 0, b = p.length - 1; a < p.length; b = a++) { if (((p[a][1] > y) !== (p[b][1] > y)) && (x < (p[b][0] - p[a][0]) * (y - p[a][1]) / (p[b][1] - p[a][1]) + p[a][0])) c = !c; } if (c) tree(x, y, 0.75 + rnd() * 0.5); } });

  // båter i havna
  const boats = [];
  const boatM = new THREE.MeshStandardMaterial({ color: COL.boat, roughness: 0.6 }), cabM = new THREE.MeshStandardMaterial({ color: 0x82401d });
  [[1, 0.1, 0.8], [0, 0.45, 1.3], [0, 0.8, 1.0]].forEach(([big, t, sp]) => { const b = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(big ? 10 : 5.5, 1.3, big ? 3 : 1.9), boatM); h.position.y = 0.45; h.castShadow = true; b.add(h); const k = new THREE.Mesh(new THREE.BoxGeometry(big ? 3.4 : 1.8, 1.5, big ? 2.4 : 1.5), big ? cabM : boatM); k.position.set(big ? -1.8 : -0.8, 1.8, 0); b.add(k); scene.add(b); boats.push({ m: b, t, sp }); });
  const route = t => [-300 + t * 560, -(122 + 20 * Math.sin(t * 6.2))];

  // IFC: hotellet og Nybygget
  const groups = {}; ORDER.forEach(id => { const g = new THREE.Group(); g.userData.gid = id; groups[id] = g; scene.add(g); });
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
  const ifcMats = [];
  function loadScript(src) { return new Promise((res, rej) => { if (window.DracoDecoderModule) return res(); const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error(src)); document.head.appendChild(sc); }); }
  function decodeAll(draco, bytes) {
    const dv = new DataView(bytes), hl = dv.getUint32(0, true), hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 4, hl))), base = 4 + hl, dec = new draco.Decoder(), out = [];
    hdr.forEach(p => {
      const buf = new draco.DecoderBuffer(); buf.Init(new Int8Array(bytes, base + p.off, p.len), p.len); const mesh = new draco.Mesh(); const st = dec.DecodeBufferToMesh(buf, mesh);
      if (!st.ok()) throw new Error(st.error_msg());
      const nP = mesh.num_points(), nF = mesh.num_faces();
      const read = (type, dt, comp, Arr) => { const id = dec.GetAttributeId(mesh, type); if (id < 0) return null; const att = dec.GetAttribute(mesh, id); const n = nP * comp, bl = n * Arr.BYTES_PER_ELEMENT, ptr = draco._malloc(bl); dec.GetAttributeDataArrayForAllPoints(mesh, att, dt, bl, ptr); const a = new Arr(draco.HEAPU8.buffer, ptr, n).slice(); draco._free(ptr); return a; };
      const pos = read(draco.POSITION, draco.DT_FLOAT32, 3, Float32Array), col = read(draco.COLOR, draco.DT_UINT8, 3, Uint8Array);
      const bl = nF * 12, ptr = draco._malloc(bl); dec.GetTrianglesUInt32Array(mesh, bl, ptr); const idx = new Uint32Array(draco.HEAPU8.buffer, ptr, nF * 3).slice(); draco._free(ptr);
      draco.destroy(buf); draco.destroy(mesh);
      let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3, true)); g.setIndex(new THREE.BufferAttribute(idx, 1));
      g = g.toNonIndexed(); g.computeVertexNormals(); out.push({ name: p.name, geometry: g });
    });
    draco.destroy(dec); return out;
  }
  const ready = (async () => {
    await loadScript(opts.dracoPath || 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/draco_decoder.js');
    const draco = await new Promise(res => window.DracoDecoderModule({ onModuleLoaded: res }));
    const b = atob(window.MG_DRC), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
    decodeAll(draco, u8.buffer).forEach(({ name, geometry }) => {
      const [gid, kind] = name.split('_');
      const glass = kind === 'glass';
      const mat = glass ? new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.2, depthWrite: false, clippingPlanes: [clipPlane], clipShadows: true })
        : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02, clippingPlanes: [clipPlane], clipShadows: true, side: THREE.DoubleSide });
      if (gid === 'lark') { const m = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m); return; }
      const o = new THREE.Mesh(geometry, mat); o.castShadow = !glass; o.receiveShadow = true; o.userData.glass = glass; ifcMats.push(mat);
      if (groups[gid]) groups[gid].add(o);
    });
    status.remove();
  })().catch(e => { console.error(e); status.textContent = 'Modellen kunne ikke lastes i denne nettleseren.'; });

  // Teglgården
  const tegl = {};
  const slabMat = new THREE.MeshStandardMaterial({ color: COL.slab, roughness: 1, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xa3a39b, roughness: 1, side: THREE.DoubleSide });
  const brickMat = new THREE.MeshStandardMaterial({ map: brickTex(false), roughness: 0.95, side: THREE.DoubleSide });
  const sillMat = new THREE.MeshStandardMaterial({ map: brickTex(true), roughness: 0.95, side: THREE.DoubleSide });
  const glassMat4 = new THREE.MeshStandardMaterial({ map: glassTex(), roughness: 0.25, metalness: 0.15, side: THREE.DoubleSide });
  const cutMat = new THREE.MeshStandardMaterial({ color: COL.cut, roughness: 0.9, side: THREE.DoubleSide });
  const hatchMat = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#e8ddd1'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#cbbfb1'; g.lineWidth = 3; for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide }); })();
  { const plinth = new THREE.Mesh(facade(P.tegl['1'], GROUND, TEGL.base - GROUND, 2.45), sillMat); plinth.castShadow = plinth.receiveShadow = true; scene.add(plinth); }
  TEGL.floors.forEach((f, i) => {
    const g = new THREE.Group(), y = tz(f), pts = P.tegl[f];
    const full = new THREE.Mesh(facade(pts, y, TEGL.fh, 2.45), f === '4' ? glassMat4 : brickMat); full.castShadow = full.receiveShadow = true;
    const low = new THREE.Mesh(facade(pts, y, 1.05, 2.45), f === '4' ? new THREE.MeshStandardMaterial({ color: 0xd9dcd8, roughness: 0.6, side: THREE.DoubleSide }) : sillMat); low.castShadow = low.receiveShadow = true; low.visible = false;
    const cap = new THREE.Mesh(polyGeo(pts, y + 1.06), cutMat); cap.visible = false;            // snittflaten i brystningshøyde
    const slab = new THREE.Mesh(polyGeo(pts, y + 0.02, (x, yy) => [x / 2.5, yy / 2.5]), slabMat); slab.receiveShadow = true;
    const roof = new THREE.Mesh(polyGeo(pts, y + TEGL.fh), i === 3 ? roofMat : slabMat); roof.castShadow = true;
    g.add(full, low, slab, roof); scene.add(g);
    // snittflate: en tynn ring langs fasaden i stedet for hel flate
    cap.geometry.dispose(); cap.geometry = facadeRing(pts, y + 1.05);
    g.add(cap);
    tegl[f] = { g, full, low, roof, cap, slab, y };
  });
  function facadeRing(pts, y) {                  // 30 cm bred ring på toppen av den kuttede veggen
    const W = worldPoly(pts); const pos = [];
    const cx = W.reduce((a, p) => a + p[0], 0) / W.length, cz = W.reduce((a, p) => a + p[1], 0) / W.length;
    for (let i = 0; i < W.length - 1; i++) { const a = W[i], b = W[i + 1]; const ia = [a[0] + (cx - a[0]) * 0.012, a[1] + (cz - a[1]) * 0.012], ib = [b[0] + (cx - b[0]) * 0.012, b[1] + (cz - b[1]) * 0.012]; pos.push(a[0], y, a[1], b[0], y, b[1], ib[0], y, ib[1], a[0], y, a[1], ib[0], y, ib[1], ia[0], y, ia[1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }

  // romløsningen: tegning på gulvet og vegger reist fra tegningen
  const LOKALER = {
    '4': { bld: 'tegl', floor: '4', y: tz('4') },
    '3': { bld: 'tegl', floor: '3', y: tz('3') },
    '2': { bld: 'ifc', floor: '2', y: 10.42, clip: 11.55 },
  };
  const plan = new THREE.Group(); scene.add(plan);
  const texLoader = new THREE.TextureLoader(), texCache = {};
  const boxG = (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); const c = []; const top = new THREE.Color(COL.cut), side = new THREE.Color(COL.wall); for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const col = f === 2 ? top : side; c.push(col.r, col.g, col.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; })();
  const coreG = (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); const c = []; const top = new THREE.Color(COL.cut), side = new THREE.Color(COL.core); for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const col = f === 2 ? top : side; c.push(col.r, col.g, col.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; })();
  const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const coreMat = wallMat;
  let build = null;                                // { inst:[{mesh, data:[{m, d}]}], t0 }
  function clearPlan() { while (plan.children.length) { const c = plan.children.pop(); c.geometry && c.geometry !== boxG && c.geometry !== coreG && c.geometry.dispose(); } build = null; }
  function showPlan(altId, lokId, animate = true) {
    clearPlan(); if (!altId) return;
    const A = P.alts[altId], L = LOKALER[lokId]; if (!A || !L) return;
    const [bx0, by0, bx1, by1] = A.bounds, area = P.areas[A.area];
    const uvOf = (x, y) => [(x - bx0) / (bx1 - bx0), 1 - (y - by0) / (by1 - by0)];
    const tex = texCache[altId] || (texCache[altId] = texLoader.load((opts.texBase || 'tex/') + altId + '.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); }));
    const floor = new THREE.Mesh(polyGeo(area, L.y + 0.06, uvOf), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    floor.receiveShadow = true; plan.add(floor);
    const mk = (rects, geo, mat, h) => {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, rects.length)); mesh.castShadow = true; mesh.receiveShadow = true; mesh.count = rects.length;
      const [ex, ez] = o2w(...entry(area));
      const data = rects.map(r => { const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, [X, Z] = o2w(cx, cy); return { X, Z, w: Math.max(0.06, r[2] - r[0]), d: Math.max(0.06, r[3] - r[1]), delay: Math.hypot(X - ex, Z - ez) * 18 }; });
      plan.add(mesh); return { mesh, data, h };
    };
    build = { inst: [mk(A.part, boxG, wallMat, 2.35), mk(A.heavy, coreG, coreMat, 2.35)], t0: performance.now(), y: L.y + 0.06, animate: animate && !reduce };
    updateBuild(performance.now());
  }
  function entry(area) { let mx = Infinity, p = area[0]; area.forEach(q => { if (q[0] < mx) { mx = q[0]; p = q; } }); return p; }   // veggene reises fra adkomstsiden
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -AX), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  function updateBuild(now) {
    if (!build) return false; let busy = false;
    build.inst.forEach(({ mesh, data, h }) => {
      data.forEach((r, i) => {
        let k = 1; if (build.animate) { k = Math.min(1, Math.max(0, (now - build.t0 - r.delay) / 650)); if (k < 1) busy = true; k = ease(k); }
        ps.set(r.X, build.y, r.Z); sc.set(r.w, Math.max(0.001, h * k), r.d); mtx.compose(ps, q, sc); mesh.setMatrixAt(i, mtx);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
    if (!busy) build.animate = false; return busy;
  }

  // kamera
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false; controls.enableZoom = false;
  controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI / 2.2; controls.target.set(-2, 14, 0);
  controls.autoRotateSpeed = 0.25; controls.autoRotate = !!opts.autoRotate;
  renderer.domElement.style.touchAction = 'pan-y'; controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tween = null, zoomK = 1;
  function flyTo(pos, target, ms = 1800) { if (reduce) ms = 1; tween = { p0: camera.position.clone(), p1: new THREE.Vector3(...pos), t0: controls.target.clone(), t1: new THREE.Vector3(...target), s: performance.now(), ms }; }
  controls.addEventListener('start', () => { controls.autoRotate = false; tween = null; el.dispatchEvent(new CustomEvent('userdrag')); });

  const VIEW = {                                   // retning fra mål til kamera, avstand
    overview: { dir: [-0.62, 0.52, 0.59], dist: 250, target: [-4, 12, 4] },
    '4': { dir: [-0.42, 0.78, 0.47], dist: 118 },
    '3': { dir: [-0.42, 0.78, 0.47], dist: 100 },
    '2': { dir: [0.35, 0.80, -0.48], dist: 80 },
  };
  function centre(lok) { const A = P.areas[lok === '3' ? '3' : lok]; const W = worldPoly(A); const x = W.reduce((a, p) => a + p[0], 0) / W.length, z = W.reduce((a, p) => a + p[1], 0) / W.length; return [x, LOKALER[lok].y, z]; }
  let mode = '3d', current = { lok: null, alt: null };
  function aim(lok, ms) {
    const v = VIEW[lok || 'overview']; const t = lok ? centre(lok) : v.target;
    const d = v.dist * zoomK; let dir = v.dir;
    if (mode === 'plan' && lok) dir = [Math.cos(AX) * 0.02, 1, Math.sin(AX) * 0.02];
    const n = Math.hypot(...dir); flyTo([t[0] + dir[0] / n * d, t[1] + dir[1] / n * d, t[2] + dir[2] / n * d], t, ms);
  }
  function applyCut(lok) {
    const L = lok && LOKALER[lok];
    // Teglgården: etasjene over skjules, valgt etasje kuttes i brystningshøyde
    TEGL.floors.forEach(f => { const t = tegl[f]; const cut = L && L.bld === 'tegl' && f === L.floor; const above = L && L.bld === 'tegl' && TEGL.floors.indexOf(f) > TEGL.floors.indexOf(L.floor);
      t.g.visible = !above; t.full.visible = !cut; t.low.visible = cut; t.cap.visible = cut; t.roof.visible = !cut; t.slab.material = cut ? hatchMat : slabMat; });
    // IFC: etasjene over skjules og valgt etasje klippes
    const ifcCut = L && L.bld === 'ifc'; const ai = ifcCut ? ORDER.indexOf(L.floor) : -1;
    ORDER.forEach((id, i) => { groups[id].visible = !(ifcCut && i > ai); });
    clipPlane.constant = ifcCut ? L.clip : 1e4;
    ifcMats.forEach(m => { const g = m.transparent && m.depthWrite === false; m.opacity = g ? (L && L.bld === 'tegl' ? 0.35 : 0.55) : 1; });
  }
  function select(lok, alt, o = {}) {
    const changedLok = lok !== current.lok; current = { lok, alt };
    controls.autoRotate = !lok && !!opts.autoRotate;
    applyCut(lok); showPlan(lok ? alt : null, lok, o.animate !== false);
    if (changedLok || o.reaim) aim(lok, o.ms);
  }
  function setMode(m) { mode = m; controls.minPolarAngle = m === 'plan' ? 0.0 : 0.12; aim(current.lok); }
  function zoom(f) { zoomK = Math.min(2.2, Math.max(0.45, zoomK * f)); const t = controls.target, p = camera.position.clone().sub(t).multiplyScalar(f); flyTo([t.x + p.x, t.y + p.y, t.z + p.z], [t.x, t.y, t.z], 500); }

  const clock = new THREE.Clock(); let visible = true;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(el);
  function tick() {
    requestAnimationFrame(tick); if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), now = performance.now();
    if (tween) { const k = ease(Math.min(1, (now - tween.s) / tween.ms)); camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k); if (k >= 1) tween = null; }
    updateBuild(now);
    if (!reduce) boats.forEach(b => { b.t = (b.t + dt * 0.004 * b.sp) % 1; const [x, z] = route(b.t), [x2, z2] = route((b.t + 0.002) % 1); b.m.position.set(x, GROUND + 0.15 + Math.sin(now / 900 + b.t * 40) * 0.1, z); b.m.lookAt(x2, b.m.position.y, z2); b.m.rotateY(Math.PI / 2); });
    controls.update(); renderer.render(scene, camera);
  }
  function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 640 ? 34 : 26; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(el); resize();
  aim(null, 1); tick();
  return { select, setMode, zoom, ready, snapshot: () => renderer.domElement.toDataURL('image/jpeg', 0.85), get mode() { return mode; } };
}
