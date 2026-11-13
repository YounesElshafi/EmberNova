import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Copy, Check } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import type { Evidence } from "../api/generated/Evidence";
import { DataTable } from "../artifacts/ArtifactView";

export function EvidenceInspector({ id }: { id: string }) {
  const {
    data: e,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["evidence", id],
    queryFn: () => api<Evidence>(`/evidence/${encodeURIComponent(id)}`),
  });
  const [copied, setCopied] = useState(false);
  const locator = e?.locator as any;
  const { data: page } = useQuery({
    queryKey: ["source-page", locator?.document_id, locator?.page],
    queryFn: () =>
      api(
        `/documents/${encodeURIComponent(locator.document_id)}/pages/${locator.page}`,
      ),
    enabled: locator?.type === "page_span",
  });
  if (isLoading)
    return <div className="skeleton">Opening verified evidence…</div>;
  if (error || !e)
    return (
      <div className="error">
        Evidence could not be opened. {error?.message}
      </div>
    );
  return (
    <div className="evidence-inspector">
      <div className="eyebrow">
        <FileText size={14} /> Source inspector
      </div>
      <h2>{e.title}</h2>
      <div className="badge-row">
        <span className="source-chip">{e.value_kind.replaceAll("_", " ")}</span>
        <span className="muted">{e.investigation_ids.join(" · ")}</span>
      </div>
      {locator?.type === "page_span" && (
        <div className="source-location">
          Physical page / extracted part {locator.page} · characters{" "}
          {locator.char_start}–{locator.char_end}
        </div>
      )}
      {locator?.type === "rows" && (
        <div className="source-location">
          {locator.run_uids.length} source rows · {locator.table_id}
        </div>
      )}
      <blockquote>{e.excerpt}</blockquote>
      {page && (
        <>
          <h3>Complete source page / part</h3>
          <pre className="source-text">
            {page.text || "Scanned or image-only page. Open the original PDF."}
          </pre>
        </>
      )}
      {e.preview_rows && (
        <>
          <h3>Raw and normalized preview</h3>
          {e.preview_rows.map((r) => (
            <details key={r.run_uid}>
              <summary>{r.run_uid}</summary>
              <DataTable rows={r.values} />
            </details>
          ))}
        </>
      )}
      {e.source.local_url && (
        <a
          className="button secondary"
          href={e.source.local_url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={14} /> Open original source
        </a>
      )}
      {e.source.source_url && (
        <a
          className="text-button"
          href={e.source.source_url}
          target="_blank"
          rel="noreferrer"
        >
          NASA source record <ExternalLink size={12} />
        </a>
      )}
      <h3>Chain of evidence</h3>
      <dl>
        <dt>Evidence ID</dt>
        <dd>{e.evidence_id}</dd>
        <dt>Source file</dt>
        <dd>{e.source.file_id || "Metadata record"}</dd>
        <dt>SHA-256</dt>
        <dd className="hash">{e.source.sha256 || "Unknown"}</dd>
        <dt>DOI</dt>
        <dd>{e.source.doi || "Unknown"}</dd>
        <dt>Transformations</dt>
        <dd>
          {e.transform?.join(" → ") || "Source text; no numerical transform"}
        </dd>
      </dl>
      <button
        className="text-button"
        onClick={async () => {
          await navigator.clipboard.writeText(
            `${e.title}; ${JSON.stringify(e.locator)}; SHA-256 ${e.source.sha256}; ${e.source.source_url}`,
          );
          setCopied(true);
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
        {copied ? "Copied" : "Copy citation"}
      </button>
    </div>
  );
}
