/**
 * Small helper for unwrapping `supabase.functions.invoke` errors. The
 * generic `FunctionsHttpError.message` is "Edge Function returned a
 * non-2xx status code" — useless in a toast. The actual Shesa error
 * envelope lives on `error.context` (a `Response`). This reads it and
 * surfaces `error.message` (or the raw body as a fallback).
 */

export async function extractInvokeMessage(error: unknown, fallback: string): Promise<string> {
  const anyErr = error as { message?: string; context?: unknown };
  const ctx = anyErr.context;
  if (
    ctx &&
    typeof ctx === 'object' &&
    'clone' in ctx &&
    typeof (ctx as Response).clone === 'function'
  ) {
    const response = (ctx as Response).clone();
    try {
      const parsed = (await response.json()) as {
        message?: string;
        error?: { message?: string };
      } | null;
      if (parsed?.error?.message) return parsed.error.message;
      if (parsed?.message) return parsed.message;
    } catch {
      try {
        const text = await (ctx as Response).clone().text();
        if (text.trim().length > 0) return text.slice(0, 240);
      } catch {
        // fall through
      }
    }
  }
  return anyErr.message ?? fallback;
}

/**
 * `supabase.functions.invoke` returns { data, error }. On success, some
 * of our functions return { scopeId } directly, others nest it under
 * `.data`. Handle both.
 */
export function extractScopeId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { data?: { scopeId?: unknown }; scopeId?: unknown };
  const nested = record.data?.scopeId;
  const flat = record.scopeId;
  return typeof nested === 'string' ? nested : typeof flat === 'string' ? flat : null;
}
