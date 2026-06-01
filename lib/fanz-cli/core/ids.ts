import type { FanzState } from "../types";

export type IdPrefix = "EVT" | "DAT" | "TCK" | "DSC" | "ORD" | "ISS" | "AUD";

export function nextId(state: FanzState, prefix: IdPrefix): string {
  state.counters[prefix] = (state.counters[prefix] ?? 0) + 1;
  return `${prefix}_${state.counters[prefix]}`;
}
