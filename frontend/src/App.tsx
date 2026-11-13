import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client";
import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import {
  Flame,
  Plus,
  MessageSquare,
  Library,
  Table2,
  GitCompareArrows,
  Orbit,
  PlayCircle,
  Info,
  Images,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  ShieldCheck,
  Grid3x3,
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

const navigation = [
  ["/systems", "Fire-safety systems", ShieldCheck],
  ["/evidence-map", "Evidence map", Grid3x3],
  ["/investigations", "Investigations", Library],
  ["/data/PSI-69:flex_experimental", "Datasets", Table2],
  ["/compare", "Compare experiments", GitCompareArrows],
  ["/envelope", "Habitat envelope", Orbit],
  ["/media", "NASA media", Images],
  ["/featured", "Recorded research", PlayCircle],
] as const;

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { data: sessions = [] } = useQuery<
    { session_id: string; title: string; turn_count: number }[]
  >({
    queryKey: ["recent-sessions", location.pathname],
    queryFn: () => api("/sessions"),
    staleTime: 10000,
  });
  const research =
    location.pathname === "/" || location.pathname.startsWith("/s/");
  return (
    <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="EmberNova home">
          <span className="brand-mark">
            <Flame size={23} />
          </span>
          <span>
            Ember<span className="brand-light">Nova</span>
            <small>RESEARCH WORKSPACE</small>
          </span>
        </Link>
        <button
          className="collapse-button icon-button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>
        <Link to="/" className="new-research" aria-label="New research">
          <Plus size={17} />
          <span>New research</span>
          <kbd>↗</kbd>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <NavLink
            to="/"
            aria-label="Research assistant"
            end
            className={({ isActive }) =>
              isActive || location.pathname.startsWith("/s/") ? "active" : ""
            }
          >
            <MessageSquare size={17} />
            <span>Research assistant</span>
          </NavLink>
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} aria-label={label}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {sessions.length > 0 && !collapsed && (
          <div className="recent-research">
            <div className="nav-label">RECENT RESEARCH</div>
            <nav aria-label="Recent research threads">
              {sessions.slice(0, 5).map((session) => (
                <NavLink
                  key={session.session_id}
                  to={`/s/${session.session_id}`}
                  title={session.title}
                >
                  <MessageSquare size={13} />
                  <span>{session.title}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="source-status">
            <span className="live-dot" />
            <div>
              NASA evidence corpus<small>Local verified snapshot</small>
            </div>
          </div>
          <NavLink to="/about" aria-label="Methods & disclosure">
            <Info size={16} />
            <span>Methods & disclosure</span>
            <ArrowUpRight size={13} />
          </NavLink>
          <div className="local-label">LOCAL RESEARCH ENVIRONMENT</div>
        </div>
      </aside>
      <div className="main-shell" id="main" tabIndex={-1}>
        {!research && (
          <div className="global-top">
            <span>
              EmberNova <span>/ Research tools</span>
            </span>
            <span className="source-chip">NASA source evidence</span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Workspace />} />
          <Route path="/s/:sessionId" element={<Workspace />} />
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
              <main className="page">
                <h1>Research page not found</h1>
                <Link to="/">Return to workspace</Link>
              </main>
            }
          />
        </Routes>
      </div>
    </div>
  );
}
