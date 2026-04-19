/**
 * GraphQL envelope parsing + lightweight helpers.
 */

export function parseGraphqlEnvelope(bodyPreview) {
  if (!bodyPreview) return { data: null, errors: null, okJson: false };
  try {
    const j = JSON.parse(bodyPreview);
    return {
      data: /** @type {Record<string, unknown> | null} */ (j?.data ?? null),
      errors: Array.isArray(j?.errors) ? /** @type {unknown[]} */ (j.errors) : null,
      okJson: true,
    };
  } catch {
    return { data: null, errors: null, okJson: false };
  }
}

export function graphqlErrorMessages(bodyPreview) {
  const { errors } = parseGraphqlEnvelope(bodyPreview);
  if (!errors) return [];
  return errors
    .map((e) => {
      const o = /** @type {Record<string, unknown>} */ (e);
      return typeof o.message === 'string' ? o.message : '';
    })
    .filter(Boolean);
}

export function hintsVerboseGraphqlErrors(bodyPreview) {
  const txt = (bodyPreview || '').toLowerCase();
  const msgs = graphqlErrorMessages(bodyPreview).join(' ').toLowerCase();
  const hay = `${txt} ${msgs}`;
  const stackLike =
    /traceback|exception|stack trace|internal error|sql syntax|file:|line \d/.test(hay);
  return stackLike ? ['Possible verbose error or stack-like content in GraphQL HTTP response'] : [];
}

export function extractIdCandidates(value, out = new Set()) {
  if (value == null) return out;
  if (Array.isArray(value)) {
    for (const v of value) extractIdCandidates(v, out);
    return out;
  }
  if (typeof value === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    for (const [k, v] of Object.entries(o)) {
      if (/id$/i.test(k) && (typeof v === 'string' || typeof v === 'number')) out.add(String(v));
      extractIdCandidates(v, out);
    }
  }
  return out;
}
