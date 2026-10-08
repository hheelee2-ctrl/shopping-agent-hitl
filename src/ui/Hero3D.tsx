import { useEffect, useRef } from 'react';
import { photoUrl } from '../store/photos';
import { reducedMotion } from './motion';

/** 궤도를 도는 상품. 사진이 없거나 못 불러오면 색 면으로 보인다. */
const PICKS: { id: string; sw: string }[] = [
  { id: 'c2', sw: '--sw-beige' }, { id: 'j3', sw: '--sw-navy' }, { id: 's2', sw: '--sw-white' },
  { id: 'k1', sw: '--sw-gray' }, { id: 'l2', sw: '--sw-brown' }, { id: 'sh1', sw: '--sw-white' },
  { id: 'j1', sw: '--sw-khaki' }, { id: 'c4', sw: '--sw-black' },
];

/** 한 바퀴(초): 둘러보기 → 하나 고르기 → 원 안에 체크 → 제자리 */
const CYCLE = 6.4;
const T_PICK = 2.2;
const T_CHECK = 2.7;
const T_RELEASE = 5.3;

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const span = (t: number, a: number, b: number) => ease((t - a) / (b - a));

/**
 * 히어로 3D 장면. Nod의 원(구) 둘레를 상품 카드가 가는 선 궤도를 따라 돈다.
 * 에이전트가 하나를 골라 앞으로 당기면 구 앞의 호가 멈추고 체크가 그려진다. 포인터 쪽으로 장면이 기운다.
 * WebGL이 없거나 실패하면 아무것도 그리지 않는다(배경의 CSS 원이 대신 보인다).
 */
export function Hero3D() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    import('three').then(async (THREE) => {
      if (disposed) return;
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1;
      el.appendChild(renderer.domElement);
      el.classList.add('live');

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      scene.environmentIntensity = 0.5;

      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0.2, 8.2);
      camera.lookAt(0, 0, 0);

      const world = new THREE.Group();
      scene.add(world);

      // ── 색: 토큰에서 읽는다(테마가 바뀌면 다시 읽는다)
      const col = {
        brand: new THREE.Color(), ink: new THREE.Color(), line: new THREE.Color(), on: new THREE.Color(),
      };
      const readColors = () => {
        col.brand.set(cssVar('--brand') || 'green');
        col.ink.set(cssVar('--stage-ink') || 'white');
        col.line.set(cssVar('--stage-ink-2') || 'gray');
        col.on.set(cssVar('--on-brand') || 'white');
      };
      readColors();

      // ── 구: Nod의 원
      const orbMat = new THREE.MeshPhysicalMaterial({ color: col.brand, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), orbMat);
      world.add(orb);

      // 구 앞면의 호(둘러보는 중)와 체크(골랐다). 로고의 호·체크와 같은 모양.
      const markMat = new THREE.MeshBasicMaterial({ color: col.on, transparent: true });
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 16, 64, Math.PI * 0.62), markMat);
      arc.position.z = 1.04;
      world.add(arc);
      const ckPath = new THREE.CurvePath<InstanceType<typeof THREE.Vector3>>();
      const P = (x: number, y: number) => new THREE.Vector3(x, y, 1.05);
      ckPath.add(new THREE.LineCurve3(P(-0.4, 0.02), P(-0.12, -0.27)));
      ckPath.add(new THREE.LineCurve3(P(-0.12, -0.27), P(0.42, 0.3)));
      const TUBE = 80, RAD = 12;
      const ckGeo = new THREE.TubeGeometry(ckPath, TUBE, 0.06, RAD, false);
      const check = new THREE.Mesh(ckGeo, new THREE.MeshBasicMaterial({ color: col.on }));
      world.add(check);

      // ── 가는 선 궤도 세 개
      const rings = [
        { r: 1.75, rx: 1.28, rz: 0.18, speed: 0.11 },
        { r: 2.2, rx: 1.12, rz: -0.32, speed: -0.08 },
        { r: 2.65, rx: 1.36, rz: 0.06, speed: 0.06 },
      ].map((d) => {
        const e = new THREE.Euler(d.rx, 0, d.rz);
        const q = new THREE.Quaternion().setFromEuler(e);
        const pts: InstanceType<typeof THREE.Vector3>[] = [];
        for (let i = 0; i <= 180; i++) {
          const a = (i / 180) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * d.r, 0, Math.sin(a) * d.r).applyQuaternion(q));
        }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col.line, transparent: true, opacity: 0.55 }));
        world.add(line);
        // 궤도를 따라 흐르는 점 하나
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: col.ink }));
        world.add(dot);
        return { ...d, q, line, dot };
      });
      const onRing = (ri: number, a: number, out: InstanceType<typeof THREE.Vector3>) => {
        const g = rings[ri];
        return out.set(Math.cos(a) * g.r, 0, Math.sin(a) * g.r).applyQuaternion(g.q);
      };

      // ── 상품 카드: 둥근 사각형, 사진은 가운데를 잘라 4:5로
      const W = 0.62, H = 0.78, R = 0.08;
      const shape = new THREE.Shape();
      shape.moveTo(-W / 2 + R, -H / 2);
      shape.lineTo(W / 2 - R, -H / 2); shape.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
      shape.lineTo(W / 2, H / 2 - R); shape.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
      shape.lineTo(-W / 2 + R, H / 2); shape.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
      shape.lineTo(-W / 2, -H / 2 + R); shape.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
      const cardGeo = new THREE.ShapeGeometry(shape, 8);
      const uv = cardGeo.attributes.uv;
      const pos = cardGeo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
      const frameGeo = new THREE.ShapeGeometry(shape, 8);
      frameGeo.scale(1.06, 1.05, 1);

      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      const cards = PICKS.map((p, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar(p.sw) || 'gray') });
        const src = photoUrl(p.id, 480);
        if (src) {
          loader.load(src, (tex) => {
            if (disposed) { tex.dispose(); return; }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.repeat.set(0.8, 1);
            tex.offset.set(0.1, 0);
            mat.map = tex; mat.color.set('white'); mat.needsUpdate = true;
          });
        }
        const frame = new THREE.Mesh(frameGeo, new THREE.MeshBasicMaterial({ color: col.ink, transparent: true, opacity: 0.9 }));
        frame.position.z = -0.004;
        const face = new THREE.Mesh(cardGeo, mat);
        const g = new THREE.Group();
        g.add(frame, face);
        world.add(g);
        return { g, frame, ring: i % 3, phase: (i / PICKS.length) * Math.PI * 2 + i * 0.4, home: new THREE.Vector3() };
      });

      // ── 크기·포인터·가시성
      let w = 1, h = 1;
      const fit = () => {
        w = el.clientWidth || 1; h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // 좁은 화면에서는 장면 전체가 들어오도록 물러선다
        camera.position.z = 9 * Math.max(1, 1.25 / camera.aspect);
        camera.updateProjectionMatrix();
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(el);

      const pointer = { x: 0, y: 0 };
      const look = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      };
      const onLeave = () => { pointer.x = 0; pointer.y = 0; };
      window.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave);

      const themeObs = new MutationObserver(() => {
        readColors();
        orbMat.color.copy(col.brand);
        markMat.color.copy(col.on);
        (check.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.copy(col.on);
        rings.forEach((g) => { (g.line.material as InstanceType<typeof THREE.LineBasicMaterial>).color.copy(col.line); (g.dot.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.copy(col.ink); });
      });
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      let visible = true;
      const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }, { threshold: 0 });
      io.observe(el);

      // ── 한 프레임
      const tmp = new THREE.Vector3();
      const front = new THREE.Vector3(-1.32, 0.12, 1.35);
      const draw = (sec: number) => {
        const cyc = Math.floor(sec / CYCLE);
        const t = sec - cyc * CYCLE;
        const chosen = cyc % cards.length;

        look.x += (pointer.x - look.x) * 0.06;
        look.y += (pointer.y - look.y) * 0.06;
        world.rotation.y = look.x * 0.32;
        world.rotation.x = look.y * 0.16;
        world.position.y = Math.sin(sec * 0.7) * 0.06;

        // 고르는 동안 궤도는 느려진다
        const pull = span(t, T_PICK, T_PICK + 0.5) * (1 - span(t, T_RELEASE, T_RELEASE + 0.8));
        const slow = 1 - pull * 0.7;

        rings.forEach((g, ri) => {
          onRing(ri, sec * g.speed * 3 + ri * 2, g.dot.position);
        });
        cards.forEach((c, i) => {
          const a = c.phase + sec * rings[c.ring].speed * slow;
          onRing(c.ring, a, c.home);
          const p = i === chosen ? pull : 0;
          tmp.copy(c.home).lerp(front, p);
          c.g.position.copy(tmp);
          c.g.quaternion.copy(camera.quaternion);
          c.g.rotateY(-world.rotation.y);
          const s = 1 + p * 0.45;
          c.g.scale.setScalar(s);
          (c.frame.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.copy(col.ink).lerp(col.brand, p);
        });

        // 호: 둘러보는 동안 돌고, 고르면 사라진다. 체크: 그 자리에 그려진다.
        const busy = 1 - span(t, T_PICK, T_CHECK);
        arc.rotation.z = -sec * 4.2;
        markMat.opacity = busy;
        arc.visible = busy > 0.01;
        const ck = span(t, T_CHECK, T_CHECK + 0.55) * (1 - span(t, T_RELEASE + 0.2, T_RELEASE + 0.7));
        const n = Math.floor(ck * TUBE);
        ckGeo.setDrawRange(0, n * RAD * 6);
        check.visible = n > 0;
        orb.scale.setScalar(1 + Math.sin(Math.min(1, Math.max(0, (t - T_CHECK) / 0.5)) * Math.PI) * 0.035);

        renderer.render(scene, camera);
      };

      const still = reducedMotion();
      let raf = 0;
      const t0 = performance.now();
      const tick = () => {
        raf = 0;
        if (disposed || !visible || document.hidden) return;
        draw((performance.now() - t0) / 1000);
        raf = requestAnimationFrame(tick);
      };
      const kick = () => { if (still) { draw(T_CHECK + 1.2); return; } if (!raf) raf = requestAnimationFrame(tick); };
      const onVis = () => { if (!document.hidden) kick(); };
      document.addEventListener('visibilitychange', onVis);
      kick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect(); io.disconnect(); themeObs.disconnect();
        window.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
        document.removeEventListener('visibilitychange', onVis);
        scene.traverse((o) => {
          const m = o as InstanceType<typeof THREE.Mesh>;
          m.geometry?.dispose?.();
          const mat = m.material as InstanceType<typeof THREE.MeshBasicMaterial> | undefined;
          mat?.map?.dispose();
          mat?.dispose?.();
        });
        env.dispose(); pmrem.dispose(); renderer.dispose();
        renderer.domElement.remove();
        el.classList.remove('live');
      };
    }).catch(() => {});

    return () => { disposed = true; cleanup(); };
  }, []);

  return <div className="hero3d" ref={host} aria-hidden="true" />;
}
