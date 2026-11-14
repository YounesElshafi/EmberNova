import { Component, type ReactNode } from "react";
export class ExperienceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="page">
        <h1>This experience could not load.</h1>
        <p>Your research data is safe. Reload to try again.</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Reload experience
        </button>
        <a href="/workspace">Open research workspace</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
