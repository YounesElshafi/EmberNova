/* Generated from canonical architecture JSON Schema. Do not edit. SI-assisted build. */

export interface Evidence {
  evidence_id: string;
  kind:
    | "document_span"
    | "data_rows"
    | "investigation_record"
    | "media"
    | "derived_artifact";
  investigation_ids: string[];
  title: string;
  locator:
    | {
        type: "page_span";
        document_id: string;
        page: number;
        page_end?: number | null;
        char_start: number;
        char_end: number;
      }
    | {
        type: "rows";
        table_id: string;
        run_uids: string[];
        quantities: string[];
        query_hash: string;
        source_rows?: number[];
      }
    | {
        type: "record";
        investigation_id: string;
        field: string;
      }
    | {
        type: "media";
        media_id: string;
        t_start_s?: number | null;
      }
    | {
        type: "artifact";
        artifact_id: string;
      };
  excerpt: string;
  /**
   * @maxItems 20
   */
  preview_rows?:
    | []
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | [
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
        {
          run_uid: string;
          values: {
            name: string;
            value_raw: string | null;
            unit_raw: string | null;
            display_value: number | null;
            display_unit: string | null;
            qualifier: string;
            quality_flags?: string[];
          }[];
        },
      ]
    | null;
  source: {
    file_id: string | null;
    sha256: string | null;
    doi: string | null;
    ntrs_id: string | null;
    source_url: string | null;
    local_url: string | null;
    file_version?: string | null;
    source_version?: string | null;
    is_psi?: boolean;
  };
  value_kind:
    | "measured"
    | "design"
    | "derived"
    | "modeled"
    | "reported_in_publication"
    | "metadata"
    | "media";
  transform?: string[] | null;
}
