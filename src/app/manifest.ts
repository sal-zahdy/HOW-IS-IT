import type { MetadataRoute } from "next";

// Lets students "Add to Home Screen" and open the map like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Campus Map",
    short_name: "Campus Map",
    description: "Find and rate bathrooms, chill spots, cafeterias and halls around the college of engineering.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
