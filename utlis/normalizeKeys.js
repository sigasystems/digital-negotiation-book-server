// utils/normalizeKeys.js
export const toCamelCaseKeys = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    acc[camelKey] =
      value && typeof value === "object" && !Array.isArray(value)
        ? toCamelCaseKeys(value)
        : value;
    return acc;
  }, {});
};

export const normalizeKeysToCamelCase = (obj) => {
  if (Array.isArray(obj)) return obj.map(normalizeKeysToCamelCase);
  if (obj && typeof obj === "object") {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      acc[camelKey] = normalizeKeysToCamelCase(val);
      return acc;
    }, {});
  }
  return obj;
};
