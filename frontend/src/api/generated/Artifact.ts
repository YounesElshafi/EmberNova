/* Generated from canonical architecture JSON Schema. Do not edit. SI-assisted build. */

export interface Artifact {
  artifact_id: string;
  type:
    | "table"
    | "chart"
    | "timeseries"
    | "comparison"
    | "envelope"
    | "media"
    | "analysis_run"
    | "si_illustration";
  title: string;
  status: "ok" | "partial" | "invalid_result" | "timeout" | "error";
  created_at: string;
  session_id: string | null;
  turn_id?: string | null;
  parent_artifact_id?: string | null;
  /**
   * null only for si_illustration
   */
  evidence_id: string | null;
  labels: {
    si_generated: boolean;
    selected_by_si: boolean;
    /**
     * e.g. 'NASA PSI measured data', 'NASA PSI design conditions', 'SI-generated illustration'
     */
    data_origin: string;
    watermarked?: boolean | null;
  };
  payload:
    | TablePayload
    | ChartPayload
    | ComparisonPayload
    | EnvelopePayload
    | MediaPayload
    | AnalysisRunPayload
    | IllustrationPayload;
  reproducibility: {
    created_at: string;
    build_version: string;
    bundle_version: string;
    bundle_sha256?: string;
    git_sha?: string;
    tool: string;
    tool_version?: string;
    args: {
      [k: string]: unknown;
    };
    input_files?: {
      [k: string]: unknown;
    }[];
    environment?: {
      [k: string]: unknown;
    };
    llm?: {
      [k: string]: unknown;
    } | null;
    [k: string]: unknown;
  };
}
export interface TablePayload {
  kind: "table";
  columns: unknown[];
  rows: unknown[];
  excluded?: {
    [k: string]: unknown;
  };
  row_count?: number;
  [k: string]: unknown;
}
export interface ChartPayload {
  kind: "chart" | "timeseries";
  chart: ChartSpec;
  stats?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
export interface ChartSpec {
  spec_version: "1";
  chart_type:
    | "scatter"
    | "line"
    | "box"
    | "bar"
    | "histogram"
    | "envelope"
    | "timeseries";
  title: string;
  subtitle?: string | null;
  x: Axis;
  y: Axis;
  series: {
    name: string;
    style: {
      color_token: string;
      symbol: string;
      hollow: boolean;
      line?: boolean | null;
    };
    points: {
      x: unknown[];
      y: (number | null)[];
      run_uid: (string | null)[];
      error_x?: unknown[] | null;
      error_y?: unknown[] | null;
      hover?: string[] | null;
    };
  }[];
  annotations: {
    kind: "reference_line" | "region" | "point" | "isoline";
    label: string;
    [k: string]: unknown;
  }[];
  notes: string[];
  provenance: {
    bundle_version: string;
    query?: {
      [k: string]: unknown;
    };
    query_hash: string;
    table_ids: string[];
    evidence_ids: string[];
    transform_steps: string[];
    downsampling?: string | null;
    [k: string]: unknown;
  };
}
export interface Axis {
  field: string;
  label: string;
  unit: string | null;
  display_unit: string | null;
  scale: "linear" | "log" | "category";
}
export interface ComparisonPayload {
  kind: "comparison";
  groups: {
    label: string;
    n: number;
    run_uids?: unknown[];
    summary: {
      [k: string]: unknown;
    };
    [k: string]: unknown;
  }[];
  condition_diff: {
    variable: string;
    values: unknown[];
    differs: boolean;
    display_unit?: string | null;
    [k: string]: unknown;
  }[];
  validity: {
    verdict: "comparable" | "comparable_with_caveats" | "not_comparable";
    checks: {
      rule: string;
      status: "pass" | "warn" | "fail";
      detail: string;
      evidence_ids?: string[];
      [k: string]: unknown;
    }[];
    [k: string]: unknown;
  };
  chart: ChartSpec;
  association_note: string;
  [k: string]: unknown;
}
export interface EnvelopePayload {
  kind: "envelope";
  scenario: {
    [k: string]: unknown;
  };
  coverage: "inside_tested_envelope" | "partially_covered" | "outside_envelope";
  per_investigation: {
    investigation_id: string;
    coverage: "inside" | "partial" | "outside";
    n_runs_in_range?: number;
    [k: string]: unknown;
  }[];
  gaps: string[];
  bracketing_runs: unknown[];
  gravity_note: string | null;
  chart: ChartSpec;
  [k: string]: unknown;
}
export interface MediaPayload {
  kind: "media";
  items: {
    media_id: string;
    media_type: "video" | "image";
    stream_url: string;
    thumb_url: string | null;
    association: "from_metadata" | "inferred_from_filename" | "none";
    run_label?: string | null;
    is_representative: boolean;
    caption?: string | null;
    credit: string | null;
    attribution_note?: string | null;
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}
export interface AnalysisRunPayload {
  kind: "analysis_run";
  cells: {
    code: string;
    stdout?: string | null;
    stderr?: string | null;
    [k: string]: unknown;
  }[];
  /**
   * validated analysis_result.schema.json
   */
  result: {
    [k: string]: unknown;
  } | null;
  validation_errors?: string[];
  charts?: ChartSpec[];
  files: {
    name?: string;
    sha256?: string;
    url?: string;
    si_generated?: true;
    [k: string]: unknown;
  }[];
  container: {
    memory_limit?: string;
    input_file_ids?: unknown[];
    bundle_sha256?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface IllustrationPayload {
  kind: "si_illustration";
  image_url: string;
  prompt: string;
  model: string;
  watermark_text: "SI-GENERATED ILLUSTRATION — NOT EXPERIMENTAL DATA";
  [k: string]: unknown;
}
