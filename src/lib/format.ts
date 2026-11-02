const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(value: number | string | { toString(): string }) {
  return money.format(Number(value));
}
