import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://alban-rrahmani.me/login",
      lastModified: new Date(),
    },
  ];
}
