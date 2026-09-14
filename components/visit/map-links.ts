import { siteConfig } from "@/lib/site-config";

const { lat, lng } = siteConfig.geo;

/** Half-width of the embedded map's bounding box, in degrees (~ a few blocks around the restaurant). */
const BBOX_LAT = 0.0045;
const BBOX_LNG = 0.0075;

/** OpenStreetMap embed centred on the restaurant with a marker. No API key, no cookies. */
export const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${[
  lng - BBOX_LNG,
  lat - BBOX_LAT,
  lng + BBOX_LNG,
  lat + BBOX_LAT,
]
  .map((n) => n.toFixed(4))
  .join("%2C")}&layer=mapnik&marker=${lat}%2C${lng}`;

/** Full-page OpenStreetMap view of the same spot. */
export const osmLargerMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
