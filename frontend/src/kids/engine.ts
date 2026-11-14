import * as T from "three";
import { AcademyState, items, rooms, type Item } from "./model";
export type Snapshot = {
  room: number;
  unlocked: number;
  hint: string;
  objective: string;
  held: string | null;
  complete: boolean;
  nearest: string;
  gravity: boolean;
  loaded: number;
  fans: number[];
  x: number;
  z: number;
  fps: number;
  targets: { id: string; x: number; y: number }[];
};
export class AcademyGame {
  readonly state: AcademyState;
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.OrthographicCamera(-11, 11, 8, -8, 0.1, 180);
  private root: T.Group;
  private limbs: T.Object3D[] = [];
  private robot: T.Group;
  private objects = new Map<string, T.Group>();
  private doors: T.Group[] = [];
  private fans: T.Group[] = [];
  private floats: T.Group[] = [];
  private flames: T.Group[] = [];
  private particles: T.Mesh[] = [];
  private keys = new Set<string>();
  private target: Item | null = null;
  private targetWalk: T.Vector2 | null = null;
  private clock = new T.Clock();
  private elapsed = 0;
  private emitTime = 0;
  private nearest = "";
  private muted = true;
  private audio: AudioContext | null = null;
  private paused = false;
  private jump = 0;
  private frameCount = 0;
  private fps = 0;
  private framesTime = 0;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private resizeObserver: ResizeObserver;
  private ray = new T.Raycaster();
  private pointer = new T.Vector2();
  private plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private lastSave = -1;
  constructor(
    private host: HTMLDivElement,
    private emit: (s: Snapshot) => void,
    checkpoint = 0,
  ) {
    this.state = new AcademyState(checkpoint);
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor("#071228");
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.host.append(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Space Fire Academy game world. WASD or arrows move, Space boosts, E interacts.",
    );
    this.scene.fog = new T.Fog("#071228", 35, 100);
    this.scene.add(new T.HemisphereLight("#d4f3ff", "#44446b", 2.5));
    const sun = new T.DirectionalLight("#ffe7cf", 3);
    sun.position.set(8, 20, 8);
    this.scene.add(sun);
    this.buildStation();
    this.root = this.astronaut();
    this.scene.add(this.root);
    this.robot = this.makeRobot();
    this.scene.add(this.robot);
    this.camera.position.set(this.state.x, 19, 15);
    this.camera.lookAt(this.state.x, 0, 0);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener("keydown", this.keydown);
    this.renderer.domElement.addEventListener("keyup", this.keyup);
    this.renderer.domElement.addEventListener("pointerdown", this.click);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.visibility);
    this.renderer.setAnimationLoop(this.tick);
  }
  private material(color: string, emissive = false, opacity = 1) {
    return new T.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.25,
      emissive: emissive ? color : "#000000",
      emissiveIntensity: emissive ? 0.6 : 0,
      transparent: opacity < 1,
      opacity,
    });
  }
  private box(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    glow = false,
  ) {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      this.material(color, glow),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private ball(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    color: string,
    opacity = 1,
  ) {
    const m = new T.Mesh(
      new T.SphereGeometry(r, 24, 16),
      this.material(color, opacity === 1 && color === "#73e9ff", opacity),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  private ring(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    color: string,
  ) {
    const m = new T.Mesh(
      new T.TorusGeometry(r, 0.055, 8, 32),
      this.material(color, true),
    );
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  private label(
    parent: T.Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    color = "#c1f4ff",
    scale = 3,
  ) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 60);
    const tex = new T.CanvasTexture(c);
    const sprite = new T.Sprite(
      new T.SpriteMaterial({ map: tex, depthTest: false }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(scale, (scale * 96) / 512, 1);
    parent.add(sprite);
  }
  private astronaut() {
    const g = new T.Group();
    this.box(g, 0, 0.85, 0, 0.65, 0.8, 0.48, "#f2eee3");
    this.box(g, 0, 0.9, -0.33, 0.52, 0.65, 0.27, "#ffad53");
    this.box(g, 0, 0.95, 0.25, 0.38, 0.27, 0.08, "#42cec9");
    this.ball(g, 0, 1.57, 0, 0.47, "#f7f2e8");
    const visor = this.ball(g, 0, 1.58, 0.2, 0.38, "#163759");
    visor.scale.set(1, 0.7, 0.8);
    this.box(g, -0.13, 1.67, 0.48, 0.12, 0.04, 0.03, "#b7f6ff", true);
    this.box(g, 0.19, 1.57, 0.46, 0.04, 0.07, 0.03, "#b7f6ff", true);
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * 0.47, 1.12, 0);
      this.box(arm, 0, -0.17, 0, 0.22, 0.6, 0.24, "#e9e3d5");
      this.ball(arm, 0, -0.47, 0.01, 0.14, "#ffad53");
      g.add(arm);
      this.limbs.push(arm);
      const leg = new T.Group();
      leg.position.set(side * 0.2, 0.53, 0);
      this.box(leg, 0, -0.2, 0, 0.27, 0.5, 0.3, "#eee8df");
      this.box(leg, 0, -0.43, 0.1, 0.3, 0.19, 0.45, "#ffad53");
      g.add(leg);
      this.limbs.push(leg);
    }
    return g;
  }
  private makeRobot() {
    const g = new T.Group();
    this.ball(g, 0, 0, 0, 0.38, "#74d9d6");
    this.box(g, 0, 0, 0.29, 0.53, 0.28, 0.16, "#153557");
    for (const x of [-0.15, 0.15]) this.ball(g, x, 0.02, 0.4, 0.055, "#73e9ff");
    this.box(g, 0, 0.45, 0, 0.04, 0.2, 0.04, "#d3e6ef");
    this.ball(g, 0, 0.57, 0, 0.08, "#ffda78");
    this.ring(g, 0, -0.38, 0, 0.24, "#74edee");
    return g;
  }
  private buildStation() {
    const stars = new T.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 450; i++)
      positions.push(
        Math.sin(i * 72.31) * 90 + 30,
        Math.cos(i * 32.4) * 30 + 8,
        -18 - Math.abs(Math.sin(i * 3.8)) * 50,
      );
    stars.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    this.scene.add(
      new T.Points(
        stars,
        new T.PointsMaterial({ color: "#c6ddff", size: 0.08 }),
      ),
    );
    const earth = this.ball(this.scene, -8, 5, -25, 7, "#27648f");
    this.ball(earth, 0, 0, 0, 1.025, "#80cad2", 0.12);
    for (let n = 0; n < 5; n++) {
      const base = n * 16;
      const room = new T.Group();
      room.position.x = base;
      this.scene.add(room);
      this.box(room, 0, -0.4, 0, 15.8, 0.6, 10.8, "#263b58");
      this.box(room, 0, -0.08, 0, 15.1, 0.08, 9.7, "#405677");
      for (let x = -7; x <= 7; x += 2)
        for (let z = -4; z <= 4; z += 2)
          this.box(
            room,
            x,
            -0.025,
            z,
            1.94,
            0.03,
            1.94,
            (x + z) % 4 === 0 ? "#4d6483" : "#445a79",
          );
      this.box(room, 0, 1.25, -5.1, 15.8, 2.5, 0.35, "#697c9d");
      for (let x = -6; x <= 6; x += 4) {
        this.box(room, x, 1.6, -4.85, 3.2, 1.7, 0.12, "#102645");
        this.box(room, x, 2.5, -4.65, 3.2, 0.06, 0.08, "#71dfe1", true);
        this.box(room, x, 1.5, -4.6, 0.06, 1.9, 0.08, "#94acc5");
      }
      this.box(room, 0, 0.13, 5, 15.8, 0.26, 0.2, "#8194b1");
      this.box(room, 0, 0.33, 4.92, 15.8, 0.04, 0.04, "#60d6de", true);
      this.label(room, rooms[n].toUpperCase(), 0, 3.3, -4.8, "#c8f6ff", 5);
      for (let x = -5; x < 7; x += 2) {
        const a = this.box(
          room,
          x,
          0.025,
          -0.4,
          0.55,
          0.035,
          0.09,
          "#83e1cc",
          true,
        );
        a.rotation.y = 0.5;
        const b = this.box(
          room,
          x,
          0.025,
          -0.65,
          0.55,
          0.035,
          0.09,
          "#83e1cc",
          true,
        );
        b.rotation.y = -0.5;
      }
      for (const x of [-6, 6]) {
        this.box(room, x, 0.5, -3.7, 1.1, 1, 1, "#bac7d7");
        this.box(room, x, 1.05, -3.7, 0.8, 0.1, 0.75, "#f7bf67");
      }
      if (n < 4) {
        const door = new T.Group();
        door.position.set(base + 8, 0, 0);
        this.scene.add(door);
        this.box(door, 0, 1.55, -1.9, 0.5, 3.1, 0.4, "#b3c3d4");
        this.box(door, 0, 1.55, 1.9, 0.5, 3.1, 0.4, "#b3c3d4");
        this.box(door, 0, 3.1, 0, 0.5, 0.3, 4.2, "#7bc4d4");
        const panel = new T.Group();
        this.box(panel, 0, 1.5, 0, 0.22, 3, 3.4, "#365c77");
        this.box(panel, -0.13, 1.5, 0, 0.06, 2.4, 0.1, "#ffb763", true);
        door.add(panel);
        this.doors.push(panel);
        this.label(door, "AIRLOCK", 0, 3.7, 0, "#a8d9e8", 2);
      }
    }
    for (const item of items) {
      if (item.kind === "door") continue;
      const g = new T.Group();
      g.position.set(item.x, 0, item.z);
      g.userData.id = item.id;
      this.objects.set(item.id, g);
      this.scene.add(g);
      this.ring(g, 0, 0.06, 0, 0.85, "#63e1d5");
      if (["fuel", "oxygen", "heat"].includes(item.kind)) {
        const c = { fuel: "#ffbd64", oxygen: "#7ce8ff", heat: "#f27f9d" }[
          item.kind as "fuel"
        ];
        this.box(g, 0, 0.35, 0, 0.55, 0.65, 0.55, "#d6e4ee");
        this.ball(g, 0, 0.9, 0, 0.32, c);
        this.ring(g, 0, 0.65, 0, 0.4, c);
        this.label(g, item.kind.toUpperCase(), 0, 1.8, 0, c, 1.8);
      } else if (item.kind === "chamber") {
        this.makeChamber(g);
      } else if (item.kind === "fan") {
        this.box(g, 0, 0.45, 0, 0.85, 0.85, 0.85, "#b6c9d8");
        const blades = new T.Group();
        blades.position.y = 1.12;
        for (let i = 0; i < 4; i++) {
          const blade = this.box(blades, 0, 0, 0.3, 0.17, 0.1, 0.55, "#70e0e0");
          blade.rotation.y = (i * Math.PI) / 2;
          blade.position.set(
            Math.sin((i * Math.PI) / 2) * 0.3,
            0,
            Math.cos((i * Math.PI) / 2) * 0.3,
          );
        }
        g.add(blades);
        this.fans.push(blades);
        const arrow = this.box(
          g,
          0,
          0.09,
          -1,
          0.6,
          0.04,
          0.12,
          "#ffdb88",
          true,
        );
        arrow.rotation.y = 0.6;
        const direction = new T.Mesh(
          new T.ConeGeometry(0.23, 0.65, 3),
          this.material("#ffde8c", true),
        );
        direction.rotation.z = -Math.PI / 2;
        direction.position.set(0.95, 0.65, 0);
        g.add(direction);
      } else {
        this.box(g, 0, 0.55, 0, 1.1, 1.1, 0.8, "#a4bace");
        this.box(
          g,
          0,
          1.15,
          -0.08,
          0.9,
          0.1,
          0.65,
          item.kind === "beacon" ? "#ff8c75" : "#4ed3d2",
          true,
        );
        for (let i = 0; i < 3; i++)
          this.box(g, (i - 1) * 0.23, 0.7, 0.42, 0.1, 0.15, 0.04, "#183a55");
        if (item.kind === "vent")
          for (let i = 0; i < 5; i++)
            this.box(g, 0, 0.3 + i * 0.13, 0.44, 0.85, 0.04, 0.05, "#193b51");
        if (item.kind === "vent") {
          const obstruction = this.box(
            g,
            0,
            0.75,
            0.55,
            0.8,
            0.25,
            0.2,
            "#e59b6a",
          );
          obstruction.rotation.z = 0.5;
          obstruction.name = "obstruction";
        }
        if (item.kind === "beacon")
          this.ball(g, 0, 1.65, 0, 0.25, "#ff8c75").name = "warning";
        this.label(
          g,
          item.kind === "gravity"
            ? "GRAVITY"
            : item.kind === "console"
              ? "POWER"
              : item.kind.toUpperCase(),
          0,
          1.85,
          0,
          "#bde9f3",
          2,
        );
      }
    }
    const gravityChamber = new T.Group();
    gravityChamber.position.set(34, 0, -2);
    this.makeChamber(gravityChamber);
    this.scene.add(gravityChamber);
    for (let i = 0; i < 4; i++) {
      const f = new T.Group();
      f.position.set(28 + i * 1.2, 0.35, -2.5 + (i % 2));
      this.box(f, 0, 0, 0, 0.35, 0.35, 0.35, i % 2 ? "#ffd27d" : "#89dcd2");
      this.scene.add(f);
      this.floats.push(f);
    }
    for (let i = 0; i < 50; i++) {
      const p = this.ball(
        this.scene,
        0,
        0,
        0,
        0.045,
        i % 2 ? "#91eff2" : "#ffd88c",
      );
      this.particles.push(p);
    }
  }
  private makeChamber(g: T.Group) {
    this.box(g, 0, 0.2, 0, 1.65, 0.4, 1.65, "#b9cedb");
    this.ring(g, 0, 0.5, 0, 0.85, "#6be7f0");
    this.ring(g, 0, 2.3, 0, 0.85, "#6be7f0");
    const glass = new T.Mesh(
      new T.CylinderGeometry(0.85, 0.85, 1.8, 32, 1, true),
      this.material("#9bdff2", false, 0.12),
    );
    glass.position.y = 1.4;
    g.add(glass);
    const flame = new T.Group();
    flame.position.y = 1.25;
    this.ball(flame, 0, 0, 0, 0.48, "#318dff", 0.65);
    this.ball(flame, 0, 0, 0, 0.32, "#68dfff", 0.8);
    this.ball(flame, 0, 0, 0, 0.16, "#c8faff");
    g.add(flame);
    const light = new T.PointLight("#4ca5ff", 2, 4);
    light.position.y = 1.4;
    g.add(light);
    this.flames.push(flame);
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    const span = w / h < 1 ? 7 : 6;
    this.camera.left = (-span * w) / h;
    this.camera.right = (span * w) / h;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
  }
  private keydown = (e: KeyboardEvent) => {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyE",
      ].includes(e.code)
    ) {
      e.preventDefault();
      this.target = null;
      this.targetWalk = null;
      this.keys.add(e.code);
      if (e.code === "KeyE" && !e.repeat) this.interact();
      if (e.code === "Space" && !e.repeat) this.jump = 1;
    }
  };
  private keyup = (e: KeyboardEvent) => this.keys.delete(e.code);
  private clear = () => {
    this.keys.clear();
    this.target = null;
    this.targetWalk = null;
  };
  private visibility = () => {
    if (document.hidden) this.clear();
  };
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.paused = true;
    this.state.hint = "Graphics paused. Reload the game to reconnect.";
    this.publish();
  };
  setPaused(value: boolean) {
    this.paused = value;
    this.clear();
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (!value) this.beep(true);
  }
  private beep(success: boolean) {
    if (this.muted) return;
    try {
      this.audio ??= new AudioContext();
      void this.audio.resume();
      const o = this.audio.createOscillator(),
        g = this.audio.createGain();
      o.connect(g);
      g.connect(this.audio.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(success ? 520 : 180, this.audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        success ? 880 : 120,
        this.audio.currentTime + 0.15,
      );
      g.gain.setValueAtTime(0.05, this.audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.24);
      o.start();
      o.stop(this.audio.currentTime + 0.25);
    } catch {
      /* silent play remains available */
    }
  }
  input(code: string, down: boolean) {
    if (down) {
      this.target = null;
      this.targetWalk = null;
      this.keys.add(code);
      if (code === "KeyE") this.interact();
      if (code === "Space") this.jump = 1;
    } else this.keys.delete(code);
  }
  private interact(id = this.nearest) {
    const success = this.state.interact(id);
    this.beep(success);
    this.publish();
  }
  private click = (e: PointerEvent) => {
    this.renderer.domElement.focus();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const projected = items
      .filter(
        (i) =>
          i.room <= this.state.unlocked &&
          !this.state.loaded.includes(i.id) &&
          this.state.held !== i.id,
      )
      .map((item) => {
        const p = new T.Vector3(
          item.x,
          item.kind === "door" ? 1 : 1.1,
          item.z,
        ).project(this.camera);
        return {
          item,
          distance: Math.hypot(
            ((p.x + 1) * rect.width) / 2 - (e.clientX - rect.left),
            ((1 - p.y) * rect.height) / 2 - (e.clientY - rect.top),
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    if (
      projected &&
      projected.distance < 35 &&
      projected.item.kind !== "door"
    ) {
      this.target = projected.item;
      this.targetWalk = null;
      return;
    }
    if (
      projected &&
      projected.distance < 45 &&
      projected.item.kind === "door" &&
      this.state.unlocked > projected.item.room
    ) {
      this.targetWalk = new T.Vector2(projected.item.x + 2, 0);
      this.target = null;
      return;
    }
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects([...this.objects.values()], true);
    if (hits.length) {
      let o: T.Object3D | null = hits[0].object;
      while (o && !o.userData.id) o = o.parent;
      const item = items.find((i) => i.id === o?.userData.id);
      if (item && item.room <= this.state.unlocked) {
        this.target = item;
        this.targetWalk = null;
        return;
      }
    }
    const point = new T.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, point)) {
      const door = items.find(
        (i) =>
          i.kind === "door" && Math.hypot(point.x - i.x, point.z - i.z) < 2,
      );
      if (door && this.state.unlocked > door.room) {
        this.targetWalk = new T.Vector2(door.x + 2, 0);
        this.target = null;
      } else {
        this.targetWalk = new T.Vector2(point.x, point.z);
        this.target = null;
      }
    }
  };
  private tick = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.paused || document.hidden) return;
    this.elapsed += dt;
    this.emitTime += dt;
    this.frameCount++;
    this.framesTime += dt;
    if (this.framesTime > 1) {
      this.fps = Math.round(this.frameCount / this.framesTime);
      this.framesTime = 0;
      this.frameCount = 0;
    }
    const s = this.state;
    let dx =
        Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
        Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")),
      dz =
        Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) -
        Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
    const target = this.target
      ? new T.Vector2(this.target.x, this.target.z)
      : this.targetWalk;
    if (target) {
      const distance = Math.hypot(target.x - s.x, target.y - s.z);
      if (distance < (this.target ? 1.8 : 0.2)) {
        if (this.target) this.interact(this.target.id);
        this.target = null;
        this.targetWalk = null;
      } else {
        dx = (target.x - s.x) / distance;
        dz = (target.y - s.z) / distance;
      }
    }
    const length = Math.hypot(dx, dz);
    if (length > 1) {
      dx /= length;
      dz /= length;
    }
    s.move(dx * dt * 4.8, dz * dt * 4.8);
    if (length > 0.01) this.root.rotation.y = Math.atan2(dx, dz);
    const zero = s.room === 2 && s.gravity;
    this.jump = Math.max(0, this.jump - dt * 1.8);
    this.root.position.set(
      s.x,
      (zero ? 0.65 + Math.sin(this.elapsed * 2) * 0.15 : 0) +
        Math.sin(this.jump * Math.PI) * 0.7,
      s.z,
    );
    this.root.rotation.z = zero ? Math.sin(this.elapsed * 2) * 0.09 : 0;
    for (let i = 0; i < this.limbs.length; i++)
      this.limbs[i].rotation.x =
        length > 0.01
          ? Math.sin(this.elapsed * 10 + (i % 2) * Math.PI) * 0.5
          : Math.sin(this.elapsed * 2 + i) * 0.045;
    this.robot.position.lerp(
      new T.Vector3(
        s.x - 1.1,
        1.8 + Math.sin(this.elapsed * 3) * 0.15,
        s.z - 0.8,
      ),
      Math.min(1, dt * 3),
    );
    if (s.pulse > 0)
      this.limbs[0].rotation.x = -1.1 * Math.sin(s.pulse * Math.PI);
    const vent = this.objects.get("vent")?.getObjectByName("obstruction");
    if (vent)
      vent.position.x = T.MathUtils.damp(
        vent.position.x,
        s.repaired.includes("vent") ? 1.4 : 0,
        5,
        dt,
      );
    const warning = this.objects.get("beacon")?.getObjectByName("warning") as
      T.Mesh | undefined;
    if (warning) {
      const mat = warning.material as T.MeshStandardMaterial;
      mat.color.set(s.complete ? "#79ffcc" : "#ff8c75");
      mat.emissive.set(s.complete ? "#79ffcc" : "#ff8c75");
      mat.emissiveIntensity = this.reduced
        ? 0.4
        : 0.4 + Math.sin(this.elapsed * 5) * 0.3;
    }
    this.robot.rotation.y = Math.sin(this.elapsed) * 0.2;
    this.robot.rotation.z = s.pulse > 0 ? Math.sin(this.elapsed * 18) * 0.2 : 0;
    s.pulse = Math.max(0, s.pulse - dt);
    for (let n = 0; n < this.doors.length; n++)
      this.doors[n].position.y = T.MathUtils.damp(
        this.doors[n].position.y,
        s.unlocked > n ? 3.3 : 0,
        5,
        dt,
      );
    this.nearest =
      items
        .filter(
          (i) =>
            i.room <= s.unlocked &&
            !(s.loaded.includes(i.id) || s.held === i.id),
        )
        .sort(
          (a, b) =>
            Math.hypot(s.x - a.x, s.z - a.z) - Math.hypot(s.x - b.x, s.z - b.z),
        )
        .find((i) => Math.hypot(s.x - i.x, s.z - i.z) < 2.15)?.id ?? "";
    for (const [id, g] of this.objects) {
      const item = items.find((i) => i.id === id)!;
      if (["fuel", "oxygen", "heat"].includes(item.kind)) {
        g.visible = !s.loaded.includes(id);
        if (s.held === id) {
          g.position.set(s.x, 2.5 + Math.sin(this.elapsed * 3) * 0.06, s.z);
          g.scale.setScalar(0.6);
        } else {
          g.position.y = Math.sin(this.elapsed * 2 + item.x) * 0.08;
        }
      }
      const ring = g.children[0];
      if (ring instanceof T.Mesh)
        (ring.material as T.MeshStandardMaterial).emissiveIntensity =
          this.nearest === id ? 2 : 0.5;
    }
    this.flames.forEach((f, n) => {
      f.visible = n === 0 ? s.loaded.length === 3 : true;
      const spherical = n === 1 && s.gravity;
      f.scale.set(
        spherical ? 1 : 0.65,
        spherical ? 1 : 1.9,
        spherical ? 1 : 0.65,
      );
      f.rotation.z = spherical ? 0 : Math.sin(this.elapsed * 4) * 0.05;
    });
    this.fans.forEach((f, i) => {
      f.rotation.y = this.elapsed * 6;
      const g = this.objects.get("fan" + i)!;
      g.rotation.y = (-s.fans[i] * Math.PI) / 2;
    });
    this.floats.forEach((f, i) => {
      f.position.y = zero ? 1.3 + Math.sin(this.elapsed * 1.7 + i) * 0.5 : 0.3;
      f.rotation.z = zero ? this.elapsed * 0.3 + i : 0;
    });
    this.particles.forEach((p, i) => {
      const flow = s.fans.every((f) => f === 0);
      const t = (this.elapsed * (flow ? 2 : 1) + i * 0.3) % 12;
      p.position.set(
        42 + t,
        flow ? 0.5 : 1 + Math.sin(this.elapsed + i) * 0.4,
        flow ? -0.8 : -0.8 + Math.cos(this.elapsed * 0.7 + i) * 0.7,
      );
      if (s.complete) {
        p.position.set(
          s.x + Math.cos(i + this.elapsed) * 2.4,
          1.5 + ((i * 0.17 + this.elapsed) % 3),
          s.z + Math.sin(i + this.elapsed) * 2,
        );
        p.scale.setScalar(2);
      }
      p.visible = !this.reduced;
    });
    const follow = s.x;
    this.camera.position.x = T.MathUtils.damp(
      this.camera.position.x,
      follow,
      4,
      dt,
    );
    this.camera.lookAt(this.camera.position.x, 0, 0);
    this.renderer.render(this.scene, this.camera);
    if (s.unlocked !== this.lastSave) {
      try {
        localStorage.setItem("embernova-academy-v2", String(s.unlocked));
      } catch {
        /* guest session still works */
      }
      this.lastSave = s.unlocked;
    }
    if (this.emitTime > 0.12) {
      this.publish();
      this.emitTime = 0;
    }
  };
  private publish() {
    const rect = this.host.getBoundingClientRect();
    this.emit({
      room: this.state.room,
      unlocked: this.state.unlocked,
      hint: this.state.hint,
      objective: this.state.objective,
      held: this.state.held,
      complete: this.state.complete,
      nearest: items.find((i) => i.id === this.nearest)?.label ?? "",
      gravity: this.state.gravity,
      loaded: this.state.loaded.length,
      fans: [...this.state.fans],
      x: this.state.x,
      z: this.state.z,
      fps: this.fps,
      targets: items
        .filter(
          (i) =>
            Math.abs(i.x - this.state.x) < 11 && i.room <= this.state.unlocked,
        )
        .map((i) => {
          const p = new T.Vector3(
            i.x,
            i.kind === "door" ? 1 : 1.1,
            i.z,
          ).project(this.camera);
          return {
            id: i.id,
            x: ((p.x + 1) * rect.width) / 2,
            y: ((1 - p.y) * rect.height) / 2,
          };
        }),
    });
  }
  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.visibility);
    const c = this.renderer.domElement;
    c.removeEventListener("keydown", this.keydown);
    c.removeEventListener("keyup", this.keyup);
    c.removeEventListener("pointerdown", this.click);
    c.removeEventListener("webglcontextlost", this.contextLost);
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Points) o.geometry.dispose();
      if ("material" in o) {
        const mat = (o as T.Mesh).material;
        for (const m of Array.isArray(mat) ? mat : [mat]) {
          if (m instanceof T.Material) {
            if ("map" in m) (m.map as T.Texture | null)?.dispose();
            m.dispose();
          }
        }
      }
    });
    void this.audio?.close();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    c.remove();
  }
}
