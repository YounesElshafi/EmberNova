// The introduction's space scene. Everything is procedural (no textures or models to download):
// a starfield, a shaded Earth with an atmosphere, the Moon, and a generic crew capsule.
// The capsule is an illustration, not a model of a specific vehicle.
import * as THREE from "three";

export type SpaceScene = {
  render: (scene: number, t: number, time: number) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

const noise = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
`;

function earthMaterial(sun: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: { sun: { value: sun }, time: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix)*normal); vP = position; vW = (modelMatrix*vec4(position,1.)).xyz;
        gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sun; uniform float time; varying vec3 vN; varying vec3 vP; varying vec3 vW;
      ${noise}
      void main(){
        vec3 p = normalize(vP);
        float land = smoothstep(0.52, 0.56, fbm(p*2.2 + 3.1));
        float ice = smoothstep(0.82, 0.9, abs(p.y));
        vec3 ocean = mix(vec3(0.02,0.07,0.18), vec3(0.04,0.16,0.32), fbm(p*6.0));
        vec3 ground = mix(vec3(0.20,0.17,0.11), vec3(0.32,0.27,0.18), fbm(p*9.0));
        vec3 col = mix(ocean, ground, land);
        col = mix(col, vec3(0.86,0.9,0.95), ice);
        float cloud = smoothstep(0.55, 0.75, fbm(p*3.5 + vec3(time*0.01,0.,0.)));
        col = mix(col, vec3(0.95), cloud*0.85);
        float light = max(dot(normalize(vN), normalize(sun)), 0.0);
        float term = smoothstep(-0.05, 0.25, dot(normalize(vN), normalize(sun)));
        vec3 viewDir = normalize(cameraPosition - vW);
        float rim = pow(1.0 - max(dot(viewDir, normalize(vN)), 0.0), 3.0);
        vec3 c = col * (0.02 + 1.15*light) * term;
        c += vec3(0.25,0.5,1.0) * rim * (0.15 + 0.85*term);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

function glowMaterial(color: THREE.Color, sun: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: color }, sun: { value: sun } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix)*normal); vW = (modelMatrix*vec4(position,1.)).xyz;
      gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: /* glsl */ `uniform vec3 color; uniform vec3 sun; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 v = normalize(cameraPosition - vW);
        float i = pow(max(0.0, 0.72 - dot(v, normalize(vN))), 2.4);
        float lit = smoothstep(-0.4, 0.6, dot(normalize(vN), normalize(sun)));
        gl_FragColor = vec4(color * i * (0.25 + 1.6*lit), 1.0); }`,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

function moonMaterial(sun: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: { sun: { value: sun } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vP;
      void main(){ vN = normalize(mat3(modelMatrix)*normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `uniform vec3 sun; varying vec3 vN; varying vec3 vP; ${noise}
      void main(){ vec3 p = normalize(vP); float n = fbm(p*4.0); float mare = smoothstep(0.5,0.62,fbm(p*1.6+7.0));
        vec3 c = mix(vec3(0.62,0.6,0.57), vec3(0.32,0.31,0.3), mare) * (0.75 + 0.5*n);
        float l = max(dot(normalize(vN), normalize(sun)), 0.0);
        gl_FragColor = vec4(c * (0.015 + l), 1.0); }`,
  });
}

function glowSprite(inner: string, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, inner.replace(/[\d.]+\)$/, "0.35)"));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
}

function capsule() {
  const group = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0xd9d6d0, metalness: 0.35, roughness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.5, roughness: 0.6 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x2a3d6e, metalness: 0.55, roughness: 0.32, emissive: 0x0b1430 });
  // Crew module: a truncated cone, heat shield at its wide end.
  const crew = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 1.05, 1.05, 64, 1), hull);
  crew.position.y = 0.95;
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.07, 0.12, 64), dark);
  shield.position.y = 0.38;
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.22, 48), hull);
  nose.position.y = 1.58;
  // Service module and engine.
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 1.35, 64), new THREE.MeshStandardMaterial({ color: 0xb9b6b0, metalness: 0.45, roughness: 0.5 }));
  service.position.y = -0.38;
  const engine = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 48, 1, true), dark);
  engine.position.y = -1.42;
  engine.rotation.x = Math.PI;
  group.add(crew, shield, nose, service, engine);
  // Four solar array wings in an X.
  for (let i = 0; i < 4; i++) {
    const wing = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), dark);
    arm.position.x = 1.2;
    wing.add(arm);
    for (let s = 0; s < 3; s++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.03, 0.82), panel);
      cell.position.x = 1.98 + s * 1.1;
      wing.add(cell);
    }
    wing.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    wing.rotation.x = 0.08;
    wing.position.y = -0.55;
    group.add(wing);
  }
  // Cabin window: the warning light shows here.
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x9fb8ff });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), windowMat);
  win.position.set(0, 1.1, 0.79);
  win.rotation.x = -0.52;
  group.add(win);
  const alarm = new THREE.PointLight(0xff2a14, 0, 6, 1.6);
  alarm.position.set(0, 1.15, 1.05);
  group.add(alarm);
  return { group, windowMat, alarm };
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (a: number[], b: number[], t: number) =>
  new THREE.Vector3(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));

// Camera keyframes per scene: [from, to, lookFrom, lookTo]
const SHOTS: number[][][] = [
  [[-6, 4, 46], [5, 1.6, 11], [0, 0, 0], [0, 0.4, 0]],
  [[5, 1.6, 11], [4.4, 1.7, 8.6], [0, 0.4, 0], [0, 0.7, 0]],
  [[4.4, 1.7, 8.6], [-9, 3, 26], [0, 0.8, 0], [-14, -2, -40]],
  [[-9, 3, 26], [-14, 5, 40], [-14, -2, -40], [-30, -4, -120]],
];

export function createSpaceScene(canvas: HTMLCanvasElement, lowPower: boolean): SpaceScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.75));
  renderer.setClearColor(0x020306, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 3000);
  const sunDir = new THREE.Vector3(1, 0.35, 0.55).normalize();

  // Stars
  const starCount = lowPower ? 1800 : 4200;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 900 + Math.random() * 400;
    const s = Math.sqrt(1 - u * u);
    positions.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
    const warm = Math.random();
    const b = 0.35 + Math.random() * 0.65;
    colors.set([b, b * (0.92 + warm * 0.06), b * (0.85 + (1 - warm) * 0.2)], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 }));
  scene.add(stars);

  // Earth, atmosphere, Moon
  const earthMat = earthMaterial(sunDir);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(26, lowPower ? 64 : 128, lowPower ? 48 : 96), earthMat);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(27.6, 96, 64), glowMaterial(new THREE.Color(0.35, 0.6, 1.0), sunDir));
  const earthGroup = new THREE.Group();
  earthGroup.add(earth, atmosphere);
  earthGroup.position.set(-46, -14, -210);
  earth.rotation.z = 0.4;
  scene.add(earthGroup);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 64, 48), moonMaterial(sunDir));
  moon.position.set(70, 22, -260);
  scene.add(moon);

  // Sun glare
  const sun = new THREE.Sprite(glowSprite("rgba(255,236,210,1)", 256));
  sun.position.copy(sunDir.clone().multiplyScalar(800));
  sun.scale.setScalar(220);
  scene.add(sun);

  // Spacecraft
  const craft = capsule();
  craft.group.rotation.set(0.25, -0.6, -0.18);
  scene.add(craft.group);
  const alarmGlow = new THREE.Sprite(glowSprite("rgba(255,60,30,1)"));
  alarmGlow.scale.setScalar(0);
  alarmGlow.position.set(0, 1.15, 1.0);
  craft.group.add(alarmGlow);

  scene.add(new THREE.AmbientLight(0x22304a, 0.55));
  const key = new THREE.DirectionalLight(0xfff1de, 2.6);
  key.position.copy(sunDir.clone().multiplyScalar(50));
  scene.add(key);
  const earthshine = new THREE.DirectionalLight(0x4d7cff, 0.35);
  earthshine.position.set(-40, -10, -100);
  scene.add(earthshine);

  const look = new THREE.Vector3();
  return {
    render(index, t, time) {
      const shot = SHOTS[Math.min(index, SHOTS.length - 1)];
      const k = ease(Math.min(1, Math.max(0, t)));
      camera.position.copy(v3(shot[0], shot[1], k));
      look.copy(v3(shot[2], shot[3], k));
      // Slight handheld drift; a short shake when the alarm starts.
      const shake = index === 1 ? Math.max(0, 1 - t * 3) * 0.06 : 0;
      camera.position.x += Math.sin(time * 0.31) * 0.12 + (Math.random() - 0.5) * shake;
      camera.position.y += Math.cos(time * 0.23) * 0.08 + (Math.random() - 0.5) * shake;
      camera.lookAt(look);
      craft.group.rotation.y = -0.6 + time * 0.018;
      earth.rotation.y = time * 0.012;
      earthMat.uniforms.time.value = time;
      // Distance: on the "stakes" shot Earth recedes to show how far the crew is from home.
      const far = index >= 2 ? ease(Math.min(1, index === 2 ? t : 1)) : 0;
      earthGroup.position.z = -210 - far * 160;
      earthGroup.position.x = -46 - far * 30;
      // Alarm light: off in the first shot, pulsing from the second onward.
      const alarmOn = index >= 1 && index <= 2;
      const pulse = alarmOn ? 0.5 + 0.5 * Math.sin(time * 9.5) : 0;
      craft.alarm.intensity = pulse * 7;
      alarmGlow.scale.setScalar(alarmOn ? 0.6 + pulse * 1.3 : 0);
      craft.windowMat.color.setRGB(alarmOn ? 0.6 + pulse * 0.4 : 0.62, alarmOn ? 0.1 : 0.72, alarmOn ? 0.06 : 1.0);
      renderer.render(scene, camera);
    },
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < h ? 58 : 38;
      camera.updateProjectionMatrix();
    },
    dispose() {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
    },
  };
}
