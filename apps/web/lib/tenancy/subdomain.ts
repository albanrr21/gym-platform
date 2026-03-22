function normalizeHost(host: string) {
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function stripPort(hostname: string) {
  // `Host` can be `example.com:3000`
  return hostname.includes(":") ? hostname.split(":")[0] : hostname;
}

function getConfiguredRootDomain() {
  const raw = process.env.ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (!raw) return null;
  return stripPort(normalizeHost(raw));
}

export function getSubdomainFromHost(hostHeader: string | null | undefined) {
  const rawHost = hostHeader ? normalizeHost(hostHeader) : "";
  const hostname = stripPort(rawHost);
  if (!hostname) return null;

  // Local dev: `gym.localhost[:port]`
  if (hostname === "localhost") return null;
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    return sub || null;
  }

  if (hostname.endsWith(".nip.io")) {
    return hostname.split(".")[0] || null;
  }

  // Treat Vercel preview/prod domains as "main", unless you explicitly set ROOT_DOMAIN to them.
  if (hostname.endsWith(".vercel.app")) return null;

  const rootDomain = getConfiguredRootDomain();

  if (rootDomain) {
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null;

    if (hostname.endsWith(`.${rootDomain}`)) {
      const sub = hostname.slice(0, -(`.${rootDomain}`).length);
      if (!sub || sub === "www") return null;
      // If someone hits `a.b.example.com`, treat the left-most label as the tenant.
      return sub.split(".")[0] || null;
    }

    // If the host doesn't match our configured root domain, fall back to generic parsing.
    // This helps when ROOT_DOMAIN is misconfigured in an environment.
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") return parts[0];
    return null;
  }

  // Fallback: treat 3+ labels (foo.example.com) as subdomain.
  const parts = hostname.split(".");
  if (parts.length > 2 && parts[0] !== "www") return parts[0];

  return null;
}

export function normalizeRootDomain(
  rootDomain: string,
  subdomain?: string | null,
) {
  let cleaned = rootDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "");

  if (subdomain && cleaned.startsWith(`${subdomain}.`)) {
    cleaned = cleaned.slice(subdomain.length + 1);
  }

  return cleaned;
}
