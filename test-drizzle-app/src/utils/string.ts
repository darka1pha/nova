export function truncate(input: string, maxLength: number) {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength).trimEnd()}…`;
}

export function capitalize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
