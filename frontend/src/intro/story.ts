// Historical content for the introduction and the home page. Each entry was checked against
// a public source on 2026-11-13; the source is shown to the visitor next to the text.

export const ARTEMIS_QUOTE = {
  text: "You want to get somebody's attention really quick, make the fire alarm go off in your spacecraft when you're still about 80,000 miles from home.",
  speaker: "Reid Wiseman, Artemis II commander",
  context:
    "Artemis II, April 2026. A smoke detector tripped aboard Orion on the second-to-last day of the mission. There was no fire.",
  source: "Aerospace America (AIAA), 16 April 2026",
  url: "https://aerospaceamerica.aiaa.org/artemis-ii-astronauts-praise-orion-capsule-reflect-on-mission-impact/",
};

export type HistoryEvent = {
  year: string;
  mission: string;
  title: string;
  text: string;
  kind: "fire" | "explosion" | "alarm";
  url: string;
};

export const HISTORY: HistoryEvent[] = [
  {
    year: "1967",
    mission: "Apollo 1",
    title: "A cabin fire on the launch pad",
    text: "During a ground test on 27 January 1967, fire swept through the command module's pure-oxygen, pressurized cabin. Astronauts Gus Grissom, Ed White and Roger Chaffee died. The spacecraft was redesigned around fire-resistant materials and a different launch atmosphere.",
    kind: "fire",
    url: "https://www.nasa.gov/mission/apollo-1/",
  },
  {
    year: "1970",
    mission: "Apollo 13",
    title: "An oxygen tank fails in flight",
    text: "On 13 April 1970, damaged wiring inside a service-module oxygen tank ignited its insulation, and the tank ruptured. This was a tank failure, not a cabin fire. The crew returned safely using the lunar module as a lifeboat.",
    kind: "explosion",
    url: "https://www.nasa.gov/missions/apollo/apollo-13-mission-details/",
  },
  {
    year: "1997",
    mission: "Mir",
    title: "An oxygen generator catches fire in orbit",
    text: "On 24 February 1997, a solid-fuel oxygen generator ignited aboard the Mir space station. Its flame burned for several minutes, cut off the route to one of the two Soyuz escape vehicles, and filled the modules with smoke. The six crew members, including NASA astronaut Jerry Linenger, put it out.",
    kind: "fire",
    url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/",
  },
  {
    year: "2026",
    mission: "Artemis II",
    title: "A smoke alarm far from home",
    text: "On the return from the Moon, a smoke detector tripped aboard Orion. It was not a fire, but it showed how far from help a crew can be.",
    kind: "alarm",
    url: ARTEMIS_QUOTE.url,
  },
];
