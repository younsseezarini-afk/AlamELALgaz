// Procedural 3D objects for the Typography reel, modelled after the carousel's satin-pink renders.
// One shared WebGL renderer draws each object into its own 2D canvas: OBJ3D.draw(name, canvas, {rx, ry, rz, t}).
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const font = await new FontLoader().loadAsync('assets/vendor/helvetiker_bold.typeface.json');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd59bd1, metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.14, envMapIntensity: 0.75 });
const glyph = new THREE.MeshPhysicalMaterial({ color: 0xffe6f8, metalness: 0.15, roughness: 0.35, clearcoat: 0.6, envMapIntensity: 0.8 });
const dark = new THREE.MeshPhysicalMaterial({ color: 0x331639, metalness: 0.5, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 });
const rimGlow = new THREE.MeshBasicMaterial({ color: 0xd88fd0 });

function stage(camPos, look = [0, 0, 0], fov = 30) {
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xffe6fa, 0x2a0e2c, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf2b6e8, 3.2); rim.position.set(4, -1, -3); scene.add(rim);
  const under = new THREE.DirectionalLight(0xdca0dc, 1.4); under.position.set(0, -4, 2); scene.add(under);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 50);
  camera.position.set(...camPos); camera.lookAt(...look);
  const pivot = new THREE.Group(); scene.add(pivot);
  return { scene, camera, pivot };
}

function text(str, size, depth, mat, bevel = 0) {
  const g = new TextGeometry(str, { font, size, height: depth, curveSegments: 10,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.7, bevelSegments: 3 });
  g.computeBoundingBox(); const b = g.boundingBox;
  g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
  return new THREE.Mesh(g, mat);
}

function coinGeometry(r = 1, h = 0.26, c = 0.08) {
  const p = [new THREE.Vector2(0, -h / 2)];
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2); p.push(new THREE.Vector2(r - c + Math.cos(a) * c, -h / 2 + c + Math.sin(a) * c)); }
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); p.push(new THREE.Vector2(r - c + Math.cos(a) * c, h / 2 - c + Math.sin(a) * c)); }
  p.push(new THREE.Vector2(0, h / 2));
  const g = new THREE.LatheGeometry(p, 128); g.rotateX(Math.PI / 2); return g;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.62);
  s.bezierCurveTo(-0.2, -0.45, -0.66, -0.12, -0.66, 0.2);
  s.bezierCurveTo(-0.66, 0.5, -0.42, 0.66, -0.2, 0.66);
  s.bezierCurveTo(-0.08, 0.66, 0, 0.58, 0, 0.46);
  s.bezierCurveTo(0, 0.58, 0.08, 0.66, 0.2, 0.66);
  s.bezierCurveTo(0.42, 0.66, 0.66, 0.5, 0.66, 0.2);
  s.bezierCurveTo(0.66, -0.12, 0.2, -0.45, 0, -0.62);
  return s;
}
function plusShape(w = 0.32, l = 0.56) {
  const s = new THREE.Shape(), a = w / 2;
  const pts = [[-a, l], [a, l], [a, a], [l, a], [l, -a], [a, -a], [a, -l], [-a, -l], [-a, -a], [-l, -a], [-l, a], [-a, a]];
  s.moveTo(pts[0][0], pts[0][1]);
  pts.forEach((p, i) => { const n = pts[(i + 1) % pts.length]; s.lineTo(n[0], n[1]); });
  return s;
}
function flatSymbol(shape, depth = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 24 });
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0);
  return new THREE.Mesh(g, glyph);
}

function coin(face) {
  const s = stage([0, 0, 4.6]);
  const body = new THREE.Mesh(coinGeometry(), chrome); s.pivot.add(body);
  const sym = face === 'heart' ? flatSymbol(heartShape()) : face === 'plus' ? flatSymbol(plusShape()) : text(face, 0.95, 0.04, glyph);
  if (face === 'heart' || face === 'plus') sym.scale.setScalar(face === 'heart' ? 0.88 : 0.95);
  sym.position.z = 0.135; s.pivot.add(sym);
  return s;
}

function aaKey() {
  const s = stage([3.3, 2.7, 4.6], [0, 0.55, 0]);
  const base = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.5, 1.6, 6, 0.2), dark); base.position.y = -0.1; s.pivot.add(base);
  const rim = new THREE.Mesh(new RoundedBoxGeometry(2.44, 0.035, 1.64, 4, 0.017), rimGlow); rim.position.y = -0.12; s.pivot.add(rim);
  const aa = text('Aa', 1.25, 0.42, chrome, 0.035); aa.position.set(0, 0.78, 0.05); s.pivot.add(aa);
  return s;
}

function keys() {
  const s = stage([2.6, 5.6, 4.7], [0, -0.1, 0], 30);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.3, 3.0, 6, 0.16), dark); s.pivot.add(plate);
  const glow = new THREE.Mesh(new RoundedBoxGeometry(3.08, 0.1, 3.08, 4, 0.06), rimGlow); glow.position.y = -0.12; s.pivot.add(glow);
  [['Aa', -1, -1], ['Av', 1, -1], ['Ag', -1, 1], ['Tt', 1, 1]].forEach(([lab, x, z]) => {
    const k = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.5, 1.2, 6, 0.2), dark); k.position.set(x * 0.7, 0.4, z * 0.7); s.pivot.add(k);
    const edge = new THREE.Mesh(new RoundedBoxGeometry(1.24, 0.06, 1.24, 4, 0.03), rimGlow); edge.position.set(x * 0.7, 0.18, z * 0.7); s.pivot.add(edge);
    const t = text(lab, 0.36, 0.02, glyph); t.rotation.x = -Math.PI / 2; t.position.set(x * 0.7, 0.66, z * 0.7); s.pivot.add(t);
  });
  return s;
}

// seeded so every render worker draws the same particles
let seedState = 7;
const rand = () => { seedState = (seedState * 1664525 + 1013904223) % 4294967296; return seedState / 4294967296; };

function shield() {
  const s = stage([0, 0, 5.0]);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x3a1842, metalness: 0.35, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48, Math.PI * 1.5, Math.PI), lensMat); // x <= 0 half
  lens.scale.set(0.9, 1.25, 0.42); s.pivot.add(lens);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshPhysicalMaterial({ color: 0x4a2050, metalness: 0.3, roughness: 0.25, side: THREE.DoubleSide, envMapIntensity: 1.2 }));
  cut.rotation.y = Math.PI / 2; cut.scale.set(0.42, 1.25, 1); s.pivot.add(cut);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 120, Math.PI), rimGlow); edge.rotation.z = Math.PI / 2; edge.scale.set(1.25, 0.9, 1); s.pivot.add(edge);
  const aa = text('Aa', 0.42, 0.02, glyph); aa.position.set(-0.46, 0, 0.47); s.pivot.add(aa);
  const n = 6000, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI - Math.PI / 2; // right half (x >= 0)
    const r = Math.sqrt(1 - u * u), x = Math.abs(r * Math.cos(th)), z = r * Math.sin(th);
    const spread = 1 + x * x * 0.55 * rand();
    pos.set([x * 0.9 * spread, u * 1.25, z * 0.42 * spread], i * 3); seed[i] = rand() * 6.28;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc77dc0, size: 0.03, transparent: true, opacity: 0.95, depthWrite: false }));
  s.pivot.add(pts); s.points = { g, base: pos.slice(), seed };
  return s;
}

const OBJ = { aa: aaKey(), bigA: coin('A'), smalla: coin('a'), heart: coin('heart'), plus: coin('plus'), keys: keys(), shield: shield() };

function draw(name, canvas, p = {}) {
  const o = OBJ[name]; if (!o) return;
  const w = canvas.width, h = canvas.height;
  renderer.setSize(w, h, false);
  o.camera.aspect = w / h; o.camera.updateProjectionMatrix();
  o.pivot.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
  if (o.points) {
    const { g, base, seed } = o.points, a = g.attributes.position.array, t = p.t || 0;
    for (let i = 0; i < seed.length; i++) {
      const x = base[i * 3]; const d = x * x * 0.05;
      a[i * 3] = x + Math.sin(t * 1.3 + seed[i]) * d; a[i * 3 + 1] = base[i * 3 + 1] + Math.cos(t * 1.1 + seed[i]) * d; a[i * 3 + 2] = base[i * 3 + 2];
    }
    g.attributes.position.needsUpdate = true;
  }
  renderer.render(o.scene, o.camera);
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, 0, w, h);
}

window.OBJ3D = { draw };
window.__obj3dResolve && window.__obj3dResolve(true);
