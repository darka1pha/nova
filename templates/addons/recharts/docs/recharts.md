# Recharts Plugin

This addon provides chart and visualization components using Recharts.

## Features

- **Line Charts** — Visualize trends and time-series data
- **Bar Charts** — Compare values across categories
- **Pie Charts** — Display proportions and distributions
- **Responsive** — Auto-scales to container width
- **Dark Mode Ready** — Works with theme providers
- **Accessible** — Semantic HTML and keyboard navigation
- **Example Components** — Copy-paste ready chart templates

## Files Added

- `src/components/ui/charts/examples.tsx` — Pre-built chart components
- `docs/recharts.md` — Complete documentation and examples

## Quick Start

### Line Chart

```tsx
import { LineChartExample } from "@/components/ui/charts/examples";

export function Dashboard() {
  return <LineChartExample />;
}
```

### Bar Chart

```tsx
import { BarChartExample } from "@/components/ui/charts/examples";

export function Analytics() {
  return <BarChartExample />;
}
```

### Custom Chart

```tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function MyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="sales" stroke="#0070F3" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## Chart Types Included

- ✓ Line Chart (trends, time-series)
- ✓ Bar Chart (comparisons)
- ✓ Pie Chart (proportions)
- ✓ Mixed (line + bar combinations)
- ✓ Area Chart (emphasis on magnitude)

## Customization

### Colors

Define your color palette in chart components:

```tsx
const COLORS = ["#0070F3", "#FF1053", "#17C950"];
```

### Responsive Sizing

```tsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

### Dark Mode

Charts automatically adapt to your theme. Use CSS variables:

```tsx
const strokeColor = "var(--foreground)";
```

## Dependencies

- `recharts` — Chart library (added automatically)

## Best Practices

1. Use `ResponsiveContainer` for mobile support
2. Keep legends clear and concise
3. Use color contrast that works in light and dark modes
4. Show meaningful tooltips on hover
5. Add axis labels for clarity
6. Test with different screen sizes

## Resources

- [Recharts Docs](https://recharts.org/)
- [Component API](https://recharts.org/en-US/api)
- [Examples](https://recharts.org/en-US/examples)
