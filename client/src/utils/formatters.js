/**
 * Formatea direcciones Ethereum (ej: 0x1234...abcd)
 */
export function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Formatea cantidades con separadores de miles
 */
export function formatNumber(value) {
  if (value === undefined || value === null || value === "") return "0";
  const num = Number(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(num);
}

/**
 * Formatea fecha local
 */
export function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("es-ES", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
