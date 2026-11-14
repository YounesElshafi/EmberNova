export type Item = {
  id: string;
  x: number;
  z: number;
  kind: string;
  label: string;
  room: number;
};
export const rooms = [
  "Docking bay",
  "Combustion lab",
  "Zero-G chamber",
  "Airflow workshop",
  "Safety deck",
];
export const objectives = [
  "Activate the blue console, then enter the glowing door.",
  "Carry all three capsules to the sealed chamber.",
  "Switch gravity twice. Watch the flame and floating objects.",
  "Rotate the three fans to send air along the glowing route.",
  "Clear the vent, inspect the sensor, then reset the beacon.",
];
export const items: Item[] = [
  {
    id: "console",
    x: 2,
    z: 0,
    kind: "console",
    label: "Power station",
    room: 0,
  },
  { id: "fuel", x: 12, z: 2, kind: "fuel", label: "Fuel capsule", room: 1 },
  {
    id: "oxygen",
    x: 16,
    z: 2,
    kind: "oxygen",
    label: "Oxygen capsule",
    room: 1,
  },
  { id: "heat", x: 19, z: 2, kind: "heat", label: "Heat capsule", room: 1 },
  {
    id: "chamber",
    x: 16,
    z: -2,
    kind: "chamber",
    label: "Load sealed chamber",
    room: 1,
  },
  {
    id: "gravity",
    x: 31,
    z: 1,
    kind: "gravity",
    label: "Toggle gravity",
    room: 2,
  },
  { id: "fan0", x: 44, z: 1, kind: "fan", label: "Rotate fan A", room: 3 },
  { id: "fan1", x: 48, z: 1, kind: "fan", label: "Rotate fan B", room: 3 },
  { id: "fan2", x: 52, z: 1, kind: "fan", label: "Rotate fan C", room: 3 },
  {
    id: "vent",
    x: 60,
    z: 1,
    kind: "vent",
    label: "Clear blocked vent",
    room: 4,
  },
  {
    id: "sensor",
    x: 64,
    z: -1,
    kind: "sensor",
    label: "Inspect detector",
    room: 4,
  },
  {
    id: "beacon",
    x: 68,
    z: 1,
    kind: "beacon",
    label: "Reset safety beacon",
    room: 4,
  },
  ...[0, 1, 2, 3].map((n) => ({
    id: "door" + n,
    x: n * 16 + 7.8,
    z: 0,
    kind: "door",
    label: "Enter next room",
    room: n,
  })),
];
export class AcademyState {
  x = -3;
  z = 1;
  room = 0;
  unlocked = 0;
  held: string | null = null;
  loaded: string[] = [];
  fans = [1, 3, 1];
  gravity = false;
  toggles = 0;
  repaired: string[] = [];
  complete = false;
  pulse = 0;
  hint = "Pip: Follow the blue light. WASD to move · E to interact.";
  constructor(checkpoint = 0) {
    this.unlocked = Math.max(0, Math.min(4, checkpoint));
    this.room = this.unlocked;
    this.x = this.room * 16 - 3;
  }
  get objective() {
    return objectives[this.room];
  }
  canMove(x: number, z: number) {
    if (x < -7 || x > 71 || Math.abs(z) > 4.6) return false;
    for (let n = 0; n < 4; n++)
      if (
        Math.abs(x - (n * 16 + 8)) < 0.6 &&
        (Math.abs(z) > 1.35 || this.unlocked <= n)
      )
        return false;
    return !items.some(
      (i) => i.kind === "chamber" && Math.hypot(x - i.x, z - i.z) < 1.25,
    );
  }
  move(dx: number, dz: number) {
    if (this.canMove(this.x + dx, this.z)) this.x += dx;
    if (this.canMove(this.x, this.z + dz)) this.z += dz;
    this.room = Math.max(0, Math.min(4, Math.floor((this.x + 8) / 16)));
  }
  interact(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || Math.hypot(this.x - item.x, this.z - item.z) > 2.15)
      return false;
    if (item.kind === "door") {
      if (this.unlocked <= item.room) {
        this.hint = "Pip: Finish this room to power the door.";
        return false;
      }
      this.hint = "Pip: Door powered. Walk through!";
      return true;
    }
    if (item.id === "console") {
      this.unlocked = Math.max(this.unlocked, 1);
      this.hint = "Pip: Lab door powered! Follow the glowing floor path.";
    }
    if (["fuel", "oxygen", "heat"].includes(item.kind)) {
      if (this.loaded.includes(id)) return false;
      if (this.held) {
        this.hint = "Pip: Take your capsule to the glass chamber first.";
        return false;
      }
      this.held = id;
      this.hint = "Pip: Capsule secured. Carry it to the glass chamber.";
    }
    if (item.id === "chamber") {
      if (!this.held) {
        this.hint = "Pip: Bring a fuel, oxygen or heat capsule.";
        return false;
      }
      this.loaded.push(this.held);
      this.held = null;
      if (this.loaded.length === 3) {
        this.unlocked = Math.max(this.unlocked, 2);
        this.hint =
          "Pip: Fuel + oxygen + heat! Our sealed pretend flame is ready.";
      } else
        this.hint = "Pip: Capsule loaded. Find the other glowing capsules.";
    }
    if (item.id === "gravity") {
      this.gravity = !this.gravity;
      this.toggles++;
      if (this.toggles >= 2) this.unlocked = Math.max(this.unlocked, 3);
      this.hint = this.gravity
        ? "Pip: Quiet droplet flames can round out without buoyancy."
        : "Pip: Earth buoyancy stretches the flame upward.";
    }
    if (item.kind === "fan") {
      const n = Number(id.slice(-1));
      this.fans[n] = (this.fans[n] + 1) % 4;
      if (this.fans.every((f) => f === 0)) {
        this.unlocked = Math.max(this.unlocked, 4);
        this.hint =
          "Pip: Air carries oxygen along the route! Diffusion still happens.";
      } else
        this.hint = "Pip: Rotate each fan toward the next glowing floor arrow.";
    }
    if (item.id === "vent" || item.id === "sensor") {
      if (!this.repaired.includes(id)) this.repaired.push(id);
      this.hint =
        item.id === "vent"
          ? "Pip: Air path cleared. Find the detector."
          : "Pip: Detector inspected. Check the warning beacon.";
    }
    if (item.id === "beacon") {
      if (this.repaired.length === 2) {
        this.complete = true;
        this.hint =
          "Pip: Station checks complete! You earned your explorer wings.";
      } else {
        this.hint = "Pip: Clear the vent and inspect the detector first.";
        return false;
      }
    }
    this.pulse = 1;
    return true;
  }
}
export function loadCheckpoint() {
  try {
    const n = Number(localStorage.getItem("embernova-academy-v2"));
    return Number.isInteger(n) && n >= 0 && n <= 4 ? n : 0;
  } catch {
    return 0;
  }
}
