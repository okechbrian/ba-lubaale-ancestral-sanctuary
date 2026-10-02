import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ba-lubaale-ancestral-sanctuary.vercel.app";

  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${base}/the-land`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/the-cave`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/the-host`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/immersions`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/practices`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/atelier`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/prepare`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/arrive`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/apply`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/policies`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
  ];
}
