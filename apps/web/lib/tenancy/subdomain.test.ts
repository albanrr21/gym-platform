import { describe, expect, it } from "vitest";
import { buildGymBaseUrl, getSubdomainFromHost } from "./subdomain";

describe("getSubdomainFromHost", () => {
  it("returns null for localhost", () => {
    expect(getSubdomainFromHost("localhost:3000")).toBeNull();
  });

  it("returns subdomain for elite.localhost:3000", () => {
    expect(getSubdomainFromHost("elite.localhost:3000")).toBe("elite");
  });

  it("returns subdomain for elite.myapp.com", () => {
    expect(getSubdomainFromHost("elite.myapp.com")).toBe("elite");
  });

  it("returns null for www.myapp.com", () => {
    expect(getSubdomainFromHost("www.myapp.com")).toBeNull();
  });

  it("handles nip.io addresses", () => {
    expect(getSubdomainFromHost("elite.127.0.0.1.nip.io:3000")).toBe("elite");
  });
});

describe("buildGymBaseUrl", () => {
  it("builds correct localhost URL", () => {
    expect(
      buildGymBaseUrl({
        currentHost: "localhost:3000",
        subdomain: "elite",
      }),
    ).toBe("http://elite.localhost:3000");
  });

  it("builds correct production URL", () => {
    expect(
      buildGymBaseUrl({
        currentHost: "app.myapp.com",
        subdomain: "elite",
        configuredRootDomain: "myapp.com",
      }),
    ).toBe("https://elite.myapp.com");
  });

  it("handles nip.io", () => {
    expect(
      buildGymBaseUrl({
        currentHost: "127.0.0.1.nip.io:3000",
        subdomain: "elite",
      }),
    ).toBe("http://elite.127.0.0.1.nip.io:3000");
  });
});
