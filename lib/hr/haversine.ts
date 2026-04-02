/** Earth radius in metres */
const R = 6371000;

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinOfficeRadius(lat: number, lng: number): boolean {
  const olat = process.env.OFFICE_LAT;
  const olng = process.env.OFFICE_LNG;
  if (olat === undefined || olng === undefined || olat === "" || olng === "") return true;
  const flat = parseFloat(olat);
  const flng = parseFloat(olng);
  if (Number.isNaN(flat) || Number.isNaN(flng)) return true;
  const maxM = parseInt(process.env.OFFICE_RADIUS_METERS || "500", 10);
  const radius = Number.isFinite(maxM) && maxM > 0 ? maxM : 500;
  return haversineMeters(lat, lng, flat, flng) <= radius;
}
