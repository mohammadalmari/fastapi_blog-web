// The headers every page of the app must be served with. `vite preview`
// sends them, so the browser tests run under them and a change that breaks
// the policy fails them. Whatever serves the built app in production must
// send the same; see "Serving the build" in the README.
//
// The API sends its own, stricter set on its responses; these are for the
// pages, which have to run scripts and show pictures.

const CONTENT_SECURITY_POLICY = [
  // Everything comes from the site itself unless said otherwise.
  "default-src 'self'",
  // No inline scripts and no eval: the build has none, and an injected one
  // would not run.
  "script-src 'self'",
  // Inline style attributes: React's `style` and the UI library's
  // positioning set them. No inline <style> is needed by the app, but the
  // directive can't tell the two apart.
  "style-src 'self' 'unsafe-inline'",
  // A post may show a picture from any https site its author names.
  "img-src 'self' https:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};
