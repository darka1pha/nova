/**
 * Example chart components using Recharts.
 * These are ready-to-use examples demonstrating common chart types.
 */

"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Example data
export const chartData = [
  { name: "Jan", value: 400, revenue: 2400 },
  { name: "Feb", value: 300, revenue: 1398 },
  { name: "Mar", value: 200, revenue: 9800 },
  { name: "Apr", value: 278, revenue: 3908 },
  { name: "May", value: 189, revenue: 4800 },
  { name: "Jun", value: 239, revenue: 3800 },
];

export const pieData = [
  { name: "Product A", value: 400 },
  { name: "Product B", value: 300 },
  { name: "Product C", value: 300 },
  { name: "Product D", value: 200 },
];

const COLORS = ["#0070F3", "#FF1053", "#17C950", "#FFA500", "#FF4757", "#0070F3"];

/**
 * Line chart — Ideal for trends over time
 */
export function LineChartExample() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#0070F3" strokeWidth={2} />
        <Line type="monotone" dataKey="revenue" stroke="#FF1053" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Bar chart — Compare categories
 */
export function BarChartExample() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#0070F3" />
        <Bar dataKey="revenue" fill="#FF1053" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Pie chart — Show proportions
 */
export function PieChartExample() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Responsive chart hook
 * Use this to create custom responsive charts
 */
export function useChartTheme() {
  return {
    colors: COLORS,
    grid: { strokeDasharray: "3 3" },
    tooltip: { contentStyle: { backgroundColor: "#f5f5f5" } },
  };
}
