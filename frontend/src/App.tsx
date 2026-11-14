import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  GitCompareArrows,
  Grid3x3,
  Images,
  Library,
  Menu,
  Orbit,
  ShieldCheck,
  Table2,
  X,
} from "lucide-react";
import { EvidenceMap, Systems } from "./pages/Systems";
import { Workspace } from "./pages/Workspace";
import { Dataset, Investigation, Investigations } from "./pages/Explorers";
import {
  About,
  Comparison,
  Envelope,
  Featured,
  Media,
} from "./pages/ResearchTools";
import { Home } from "./pages/Home";
import { Capabilities } from "./pages/Capabilities";
import { HowItWorks } from "./pages/HowItWorks";

import { ExperienceBoundary } from "./education/ExperienceBoundary";
const Learn = lazy(() =>
  import("./education/Experiences").then((m) => ({ default: m.Learn })),
);
const LabPage = lazy(() =>
  import("./education/Experiences").then((m) => ({ default: m.LabPage })),
);
const Kids = lazy(() => import("./kids/SpaceAcademy"));
export const EXPLORE = [
  [
    "/systems",
    "Fire-safety systems",
    "Prevention, detection, suppression",
    ShieldCheck,
  ],
  [
    "/evidence-map",
    "Evidence map",
    "What NASA has and has not tested",
    Grid3x3,
  ],
  ["/investigations", "Investigations", "Rank and search the catalog", Library],
  [
    "/data/PSI-69:flex_experimental",
    "Datasets",
    "Raw and normalized measurements",
    Table2,
  ],
  [
    "/compare",
    "Compare experiments",
    "Test groups with confounders",
    GitCompareArrows,
  ],
  ["/envelope", "Habitat envelope", "Check an atmosphere against tests", Orbit],
  ["/media", "NASA media", "Original flight video and images", Images],
] as const;

const EXPLORE_PREFIXES = [
  "/systems",
  "/evidence-map",
  "/investigations",
  "/data",
  "/compare",
  "/envelope",
  "/media",
];

function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <circle
        cx="16"
        cy="16"
        r="14.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".28"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="14.5"
        ry="5.2"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".5"
        transform="rotate(-24 16 16)"
      />
      <circle cx="16" cy="16" r="5.4" fill="url(#emb)" />
      <defs>
        <radialGradient id="emb" cx=".42" cy=".38" r=".7">
          <stop offset="0" stopColor="#ffe2b8" />
          <stop offset=".45" stopColor="#ff7a33" />
          <stop offset="1" stopColor="#c8321c" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function ExploreMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="explore" ref={ref}>
      <button
        className={`nav-link ${active ? "active" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        Explore data <ChevronDown size={14} />
      </button>
      {open && (
        <div className="explore-panel" role="menu">
          {EXPLORE.map(([to, label, sub, Icon]) => (
            <Link key={to} to={to} role="menuitem" className="explore-item">
              <Icon size={17} />
              <span>
                <b>{label}</b>
                <small>{sub}</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteHeader({ workspace }: { workspace: boolean }) {
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const exploring = EXPLORE_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );
  return (
    <header className={`site-header ${scrolled || workspace ? "solid" : ""}`}>
      <Link to="/" className="brand" aria-label="EmberNova home">
        <Mark />
        <span>
          Ember<span className="brand-light">Nova</span>
        </span>
      </Link>
      <nav className="primary-nav" aria-label="Main navigation">
        <NavLink
          to="/workspace"
          className={({ isActive }) =>
            `nav-link ${isActive || location.pathname.startsWith("/s/") ? "active" : ""}`
          }
        >
          Research workspace
        </NavLink>
        <NavLink to="/learn" className="nav-link">
          Learn
        </NavLink>
        <NavLink to="/kids" className="nav-link">
          Play
        </NavLink>
        <ExploreMenu active={exploring} />
        <NavLink to="/featured" className="nav-link">
          Recorded demos
        </NavLink>
        <NavLink to="/capabilities" className="nav-link">
          Capabilities
        </NavLink>
        <NavLink to="/how-it-works" className="nav-link">
          How it works
        </NavLink>
        <NavLink to="/about" className="nav-link">
          About
        </NavLink>
      </nav>
      <Link to="/workspace" className="btn btn-ember btn-sm header-cta">
        Start research <ArrowRight size={14} />
      </Link>
      <button
        className="menu-button icon-button"
        aria-label={drawer ? "Close menu" : "Open menu"}
        aria-expanded={drawer}
        onClick={() => setDrawer((v) => !v)}
      >
        {drawer ? <X size={20} /> : <Menu size={20} />}
      </button>
      {drawer && (
        <div className="drawer" role="dialog" aria-label="Site menu">
          <nav aria-label="Mobile navigation">
            <NavLink to="/" end>
              Mission
            </NavLink>
            <NavLink to="/workspace">Research workspace</NavLink>
            <NavLink to="/learn">Learn</NavLink>
            <NavLink to="/kids">Play</NavLink>
            <NavLink to="/featured">Recorded demos</NavLink>
            <NavLink to="/capabilities">Capabilities</NavLink>
            <NavLink to="/how-it-works">How it works</NavLink>
            <NavLink to="/about">About & methods</NavLink>
            <div className="drawer-label">Explore data</div>
            {EXPLORE.map(([to, label, , Icon]) => (
              <NavLink key={to} to={to}>
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function ExploreBar() {
  const location = useLocation();
  return (
    <nav className="explore-bar" aria-label="Data explorers">
      {EXPLORE.map(([to, label, , Icon]) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            isActive ||
            (to.startsWith("/data/") && location.pathname.startsWith("/data/"))
              ? "active"
              : ""
          }
        >
          <Icon size={14} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link to="/" className="brand">
            <Mark />
            <span>
              Ember<span className="brand-light">Nova</span>
            </span>
          </Link>
          <p>
            Team EmberNova's entry for NASA Space Apps 2026, challenge “Flame in
            Freefall: SI-Powered Fire Safety Insights from Microgravity
            Combustion Data”.
          </p>
        </div>
        <nav aria-label="Footer">
          <Link to="/workspace">Workspace</Link>
          <Link to="/featured">Recorded demos</Link>
          <Link to="/capabilities">Capabilities</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/about">Methods & disclosure</Link>
          <Link to="/?intro=1">Replay intro</Link>
        </nav>
      </div>
      <p className="footer-fine">
        NASA PSI data is CC0-1.0; cite each investigation's DOI. Media are
        original NASA files, with credit shown. Introduction visuals are
        illustrations. EmberNova is not a NASA product and is not endorsed by
        NASA. SI-written content is labeled <span className="si-badge">SI</span>
        .
      </p>
    </footer>
  );
}

export default function App() {
  const location = useLocation();
  const workspace =
    location.pathname === "/research" ||
    location.pathname === "/workspace" ||
    location.pathname.startsWith("/s/");
  const kids = location.pathname.startsWith("/kids");
  const home = location.pathname === "/";
  const exploring = EXPLORE_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);
  return (
    <div
      className={`site ${workspace ? "is-workspace" : ""} ${home ? "is-home" : ""}`}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader workspace={workspace} />
      <div className="site-main" id="main" tabIndex={-1}>
        {exploring && <ExploreBar />}
        <ExperienceBoundary key={location.pathname}>
          <Suspense
            fallback={
              <main className="page" role="status">
                Preparing your experience...
              </main>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/research-overview" element={<Home />} />
              <Route path="/research" element={<Workspace />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/lab" element={<LabPage />} />
              <Route path="/kids" element={<Kids />} />
              <Route path="/kids/missions" element={<Kids />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/s/:sessionId" element={<Workspace />} />
              <Route path="/capabilities" element={<Capabilities />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/systems" element={<Systems />} />
              <Route path="/evidence-map" element={<EvidenceMap />} />
              <Route path="/investigations" element={<Investigations />} />
              <Route path="/investigations/:id" element={<Investigation />} />
              <Route path="/data/:tableId" element={<Dataset />} />
              <Route path="/compare" element={<Comparison />} />
              <Route path="/envelope" element={<Envelope />} />
              <Route path="/media" element={<Media />} />
              <Route path="/featured" element={<Featured />} />
              <Route path="/about" element={<About />} />
              <Route
                path="*"
                element={
                  <main className="page not-found">
                    <p className="eyebrow ember">404</p>
                    <h1 className="display-sm">
                      This page drifted out of range.
                    </h1>
                    <p className="lede">
                      The address does not match any EmberNova page.
                    </p>
                    <Link to="/" className="btn btn-ghost">
                      Return to mission home
                    </Link>
                  </main>
                }
              />
            </Routes>
          </Suspense>
        </ExperienceBoundary>
      </div>
      {!workspace && !kids && <SiteFooter />}
    </div>
  );
}
