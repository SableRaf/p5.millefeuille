import { BlendModes } from './constants.js';

const VALID_BLEND_MODES = new Set(Object.values(BlendModes));

/**
 * Parses URL query parameters for layer state configuration.
 * @param {string} baseName - The prefix before the layer name (e.g., "layers")
 * @param {string} [queryString] - Query string to parse; defaults to window.location.search
 * @returns {{ layers: Map<string, Object>, show: Set<string>|null }}
 */
export function parseLayerParams(baseName, queryString) {
  const search = queryString !== undefined
    ? queryString
    : (typeof window !== 'undefined' ? window.location.search : '');

  const params = new URLSearchParams(search);
  const layers = new Map();
  let show = null;

  const showKey = `${baseName}.show`;
  const prefix = `${baseName}.`;

  for (const [key, value] of params.entries()) {
    if (key === showKey) {
      show = new Set(value.split(',').map(s => s.trim()).filter(s => s.length > 0));
      continue;
    }

    if (!key.startsWith(prefix)) continue;

    const rest = key.slice(prefix.length);
    const dotIndex = rest.indexOf('.');
    if (dotIndex === -1) continue;

    const layerName = rest.slice(0, dotIndex);
    const property = rest.slice(dotIndex + 1);

    if (!layerName.trim() || !property.trim()) continue;

    let parsed;

    if (property === 'opacity') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 1) continue;
      parsed = num;
    } else if (property === 'visible') {
      if (value === 'true' || value === '1') {
        parsed = true;
      } else if (value === 'false' || value === '0') {
        parsed = false;
      } else {
        continue;
      }
    } else if (property === 'blendMode') {
      const upper = value.toUpperCase();
      if (!VALID_BLEND_MODES.has(upper)) continue;
      parsed = upper;
    } else {
      continue;
    }

    if (!layers.has(layerName)) {
      layers.set(layerName, {});
    }
    layers.get(layerName)[property] = parsed;
  }

  return { layers, show };
}
