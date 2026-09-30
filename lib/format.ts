/** Display helpers shared by client and server. */

export function fmtAlt(m: number): string {
  return m >= 10000 ? `${(Math.round(m / 100) / 10).toLocaleString('en-US')} km` : `${Math.round(m).toLocaleString('en-US')} m`;
}

/** Spoken form for aria-live: "23.8 kilometres". */
export function spokenAlt(m: number): string {
  return m >= 10000 ? `${(Math.round(m / 100) / 10).toLocaleString('en-US')} kilometres` : `${Math.round(m).toLocaleString('en-US')} metres`;
}

export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
