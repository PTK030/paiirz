/**
 * @description Verifies that a media payload is a well-formed `data:` URI of
 * the expected MIME category. All media in this app travels as base64 data
 * URIs (never as external links), so anything else - an `http(s):` URL,
 * `javascript:`, or a malformed string from a tampered/malicious peer - is
 * rejected before it is ever assigned to an `<img>`/`<video>`/`<audio>` src.
 *
 * @param value    - the untrusted string received from the network
 * @param category - expected MIME top-level type ("image", "video", or "audio")
 * @returns true if `value` is a safe `data:<category>/...;base64,...` URI
 *
 * @example
 * isSafeMediaDataUrl("data:image/png;base64,AAAA", "image"); // true
 * isSafeMediaDataUrl("https://evil.example/x.png", "image"); // false
 */
export function isSafeMediaDataUrl(
  value: string | undefined,
  category: "image" | "video" | "audio"
): value is string {
  if (!value) return false;
  const pattern = new RegExp(`^data:${category}/[a-zA-Z0-9.+-]+;base64,`);
  return pattern.test(value);
}
