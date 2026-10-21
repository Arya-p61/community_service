/**
 * CommonGround Reverse Geocoding Service
 * Uses OpenStreetMap Nominatim for free reverse address lookups with:
 * - In-memory cache
 * - Request debouncing
 * - AbortController cancellation for outdated requests
 * - Graceful failure handling without UI crashing
 */

const cache = new Map();
let abortController = null;

// Helper to round coordinate to ~10 meters for caching
function coordKey(lat, lon) {
  const roundedLat = Number(lat).toFixed(4);
  const roundedLon = Number(lon).toFixed(4);
  return `${roundedLat},${roundedLon}`;
}

/**
 * Reverse geocode latitude and longitude to a human-readable street address/landmark.
 * @param {number|string} lat - Latitude
 * @param {number|string} lon - Longitude
 * @param {Object} [options]
 * @param {number} [options.timeout=6000] - Timeout in ms
 * @returns {Promise<{ address: string, displayName: string, city: string } | null>}
 */
export async function reverseGeocode(lat, lon, options = {}) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  // Bounds validation
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  const key = coordKey(latitude, longitude);
  if (cache.has(key)) {
    return cache.get(key);
  }

  // Abort previous pending lookup
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  const signal = abortController.signal;

  const timeoutId = setTimeout(() => {
    if (abortController) abortController.abort();
  }, options.timeout || 6000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || !data.address) {
      return null;
    }

    // Build concise, clean municipal/civic address
    const a = data.address;
    const parts = [];

    // Road / street
    const street = a.road || a.pedestrian || a.footway || a.street || a.path;
    const houseNumber = a.house_number;
    if (houseNumber && street) {
      parts.push(`${houseNumber} ${street}`);
    } else if (street) {
      parts.push(street);
    } else if (a.suburb || a.neighbourhood || a.residential) {
      parts.push(a.suburb || a.neighbourhood || a.residential);
    }

    // Neighbourhood / locality / landmark
    const area = a.suburb || a.neighbourhood || a.quarter || a.hamlet;
    if (area && !parts.includes(area)) {
      parts.push(area);
    }

    // City / Town / District
    const city = a.city || a.town || a.village || a.county || a.municipality;
    if (city && !parts.includes(city)) {
      parts.push(city);
    }

    const postalCode = a.postcode;
    if (postalCode) {
      parts.push(postalCode);
    }

    const formattedAddress = parts.length > 0 ? parts.join(", ") : (data.display_name || "");

    const result = {
      address: formattedAddress,
      displayName: data.display_name || formattedAddress,
      city: city || "",
      neighbourhood: area || "",
    };

    cache.set(key, result);
    return result;
  } catch (err) {
    if (err.name === "AbortError") {
      // Intentionally aborted due to newer request or timeout
      return null;
    }
    // Graceful fallback on network failure or rate limit
    console.warn("Reverse geocode request failed (fallback to manual entry):", err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
