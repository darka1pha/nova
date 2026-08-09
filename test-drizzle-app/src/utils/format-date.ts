export function formatDate(
  date: Date | string,
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions,
) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options ?? { dateStyle: "medium" }).format(d);
}
