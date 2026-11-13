/* Generated from canonical architecture JSON Schema. Do not edit. SI-assisted build. */

export type SSEEventDataPayloadsEventNameInTheSSEEventFieldMustEqualEventBelow =
  {
    [k: string]: unknown;
  } & {
    event:
      | "turn.started"
      | "status"
      | "tool.started"
      | "tool.completed"
      | "evidence.added"
      | "artifact.created"
      | "text.delta"
      | "text.completed"
      | "turn.completed"
      | "error";
    seq: number;
    turn_id: string;
    /**
     * ms since turn start
     */
    t_ms: number;
    [k: string]: unknown;
  };
