export function money(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return (
    n.toLocaleString("ru-RU", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + " ₽"
  );
}

export function num(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function qty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const digits = Math.abs(n) >= 100 ? 0 : n % 1 === 0 ? 0 : 1;
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
