/**
 * Append-only run observations (no LLM, no network).
 */

export class ObservationLog {
  constructor() {
    /** @type {Array<Record<string, unknown>>} */
    this.entries = [];
  }

  /** @param {Record<string, unknown>} obs */
  push(obs) {
    this.entries.push({ at: new Date().toISOString(), ...obs });
  }

  snapshot() {
    return {
      entryCount: this.entries.length,
      kinds: [...new Set(this.entries.map((e) => String(e.kind || '')))],
    };
  }
}
