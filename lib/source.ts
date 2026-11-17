/** Where a visit came from, for the `visit_home` event: the referring host (never a full URL) and UTM tags. Pure; shared with tests. */
export type SourceProps = Record<string, string>;

export function sourceProps(referrer: string, search: string, ownHost: string): SourceProps {
  const out: SourceProps = {};
  try {
    const host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : '';
    out.referrer = host && host !== ownHost.replace(/^www\./, '') ? host : 'direct';
  } catch {
    out.referrer = 'direct';
  }
  const q = new URLSearchParams(search);
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const v = q.get(k);
    if (v) out[k] = v.slice(0, 60);
  }
  return out;
}

/** The label the dashboard groups a visit under: utm_source first, else the referring host. */
export function sourceLabel(props: Record<string, unknown>): string {
  const utm = typeof props.utm_source === 'string' && props.utm_source;
  const ref = typeof props.referrer === 'string' && props.referrer;
  return utm ? `utm: ${utm}` : ref || 'unknown';
}
