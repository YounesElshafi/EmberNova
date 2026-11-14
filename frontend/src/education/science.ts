export const source =
  "https://www.nasa.gov/missions/station/studying-combustion-and-fire-safety/";
export const lessons = [
  {
    title: "Build a flame",
    topic: "Fire on Earth",
    text: "Combustion releases energy when fuel reacts with an oxidizer. The fire triangle describes fuel, oxygen and heat. On Earth, buoyancy carries hot gases upward and draws fresh air toward a flame.",
    question: "What brings fresh air toward a still candle on Earth?",
    choices: [
      "Buoyancy-driven convection",
      "The flame creates oxygen",
      "Magnetism",
    ],
    answer: 0,
  },
  {
    title: "Remove the up",
    topic: "Fire in microgravity",
    text: "In microgravity, buoyancy-driven flow is greatly reduced. Molecules still diffuse. Around an isolated droplet in quiet gas, a flame can become rounded. Ventilation and fuel geometry can change that shape.",
    question: "Does every spacecraft flame form a perfect sphere?",
    choices: [
      "Always",
      "No — airflow and fuel geometry matter",
      "Only if oxygen disappears",
    ],
    answer: 1,
  },
  {
    title: "Meet the experiments",
    topic: "NASA research",
    text: "FLEX studied burning fuel droplets. SoFIE investigates solid fuels. Different apparatus and fuel geometries answer different questions; a droplet result cannot simply be applied to every material.",
    question: "How should we use a droplet experiment?",
    choices: [
      "Predict all spacecraft fires",
      "Ignore its conditions",
      "Check fuel, atmosphere and apparatus before comparing",
    ],
    answer: 2,
  },
  {
    title: "Follow the air",
    topic: "Detection in space",
    text: "Smoke cannot be assumed to rise toward a ceiling in microgravity. Ventilation carries particles through a cabin. Detection design must consider flow paths and be validated for the actual spacecraft.",
    question: "What matters when planning detection in a cabin?",
    choices: [
      "Only ceiling height",
      "Ventilation paths and validated testing",
      "Paint color",
    ],
    answer: 1,
  },
  {
    title: "Design with evidence",
    topic: "Space safety engineering",
    text: "Prevention, detection and suppression work together. Laboratory evidence has limits: matching oxygen conditions does not establish the same behavior at a different gravity. Never test these ideas with real fire at home.",
    question: "What makes a defensible safety claim?",
    choices: [
      "A convincing animation",
      "A single pretty flame",
      "Relevant evidence with conditions and limitations",
    ],
    answer: 2,
  },
];
export function readProgress(key: string): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (n): n is number =>
                Number.isInteger(n) && n >= 0 && n < lessons.length,
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
export function saveProgress(key: string, values: number[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
    return true;
  } catch {
    return false;
  }
}
export function explain(gravity: string, airflow: string, oxygen: string) {
  if (oxygen === "absent")
    return "Without an oxidizer, this simplified fire-triangle scenario cannot sustain combustion. This is a conceptual condition, not a measured extinction threshold.";
  if (airflow === "directed")
    return "Directed airflow transports oxygen and combustion products and can distort a flame. Its real response depends on flow speed, fuel and conditions; strong flow can also extinguish some flames.";
  return gravity === "earth"
    ? "Buoyancy drives hot gases upward and draws surrounding air inward. A familiar flame becomes elongated."
    : "With buoyancy greatly reduced, diffusion transports oxygen. A quiet, isolated droplet flame can be rounded. This does not describe every spacecraft fire.";
}
