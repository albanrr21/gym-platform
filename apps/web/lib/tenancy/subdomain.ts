function normalizeHost(host: string) {
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function splitHostAndPort(host: string) {
  const normalized = normalizeHost(host);
  const lastColonIndex = normalized.lastIndexOf(":");

  if (lastColonIndex > -1 && normalized.indexOf(":") === lastColonIndex) {
    const maybePort = normalized.slice(lastColonIndex + 1);
    if (/^\d+$/.test(maybePort)) {
      return {
        hostname: normalized.slice(0, lastColonIndex),
        port: maybePort,
      };
    }
  }

  return {
    hostname: normalized,
    port: "",
  };
}

function stripPort(hostname: string) {
  // `Host` can be `example.com:3000`
  return splitHostAndPort(hostname).hostname;
}

function isIpv4Address(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
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
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (subdomain && cleaned.startsWith(`${subdomain}.`)) {
    cleaned = cleaned.slice(subdomain.length + 1);
  }

  return stripPort(cleaned);
}

export function buildGymBaseUrl({
  currentHost,
  subdomain,
  configuredRootDomain,
}: {
  currentHost: string;
  subdomain: string;
  configuredRootDomain?: string | null;
}) {
  const { hostname, port } = splitHostAndPort(currentHost);
  const tenant = subdomain.trim().toLowerCase();
  const portSuffix = port ? `:${port}` : "";

  if (!hostname) {
    throw new Error("Cannot resolve redirect host");
  }

  if (!tenant) {
    throw new Error("Cannot resolve redirect subdomain");
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return `http://${tenant}.localhost${portSuffix}`;
  }

  if (hostname.endsWith(".nip.io")) {
    const nipBase = hostname.startsWith(`${tenant}.`)
      ? hostname.slice(tenant.length + 1)
      : hostname;
    return `http://${tenant}.${nipBase}${portSuffix}`;
  }

  if (isIpv4Address(hostname)) {
    return `http://${tenant}.${hostname}.nip.io${portSuffix}`;
  }

  const normalizedConfiguredRoot = configuredRootDomain
    ? normalizeRootDomain(configuredRootDomain, tenant)
    : null;
  const inferredRoot = hostname.startsWith(`${tenant}.`)
    ? hostname.slice(tenant.length + 1)
    : hostname;
  const rootDomain =
    normalizedConfiguredRoot && normalizedConfiguredRoot.length > 0
      ? normalizedConfiguredRoot
      : inferredRoot;

  return `https://${tenant}.${rootDomain}`;
}
