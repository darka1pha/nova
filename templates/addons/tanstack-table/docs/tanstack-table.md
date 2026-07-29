# TanStack Table Plugin

This addon provides a fully-featured data table component built with TanStack Table (React Table).

## Features

- **Sorting** — Click column headers to sort ascending/descending
- **Filtering** — Global filter to search table data
- **Pagination** — Navigate through large datasets with page controls
- **Column Visibility** — Toggle column visibility programmatically
- **Row Selection** — Built-in multi-select with checkboxes
- **Accessible** — Semantic HTML, keyboard navigation support
- **TypeScript** — Full type safety for columns and data

## Files Added

- `src/components/ui/data-table/index.tsx` — Reusable DataTable component

## Quick Start

### 1. Define Columns

```tsx
import { ColumnDef } from "@tanstack/react-table";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
];
```

### 2. Use the DataTable

```tsx
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";

export async function UsersPage() {
  const users = await fetchUsers();

  return (
    <div>
      <h1>Users</h1>
      <DataTable
        columns={columns}
        data={users}
        globalFilterColumn="name"
        pageSize={20}
      />
    </div>
  );
}
```

## Advanced Features

### Sorting

Columns are sortable by default. Customize with:

```tsx
{
  accessorKey: "createdAt",
  header: "Created",
  enableSorting: false, // Disable sorting for this column
}
```

### Filtering

Filter by column name:

```tsx
table.getColumn("email")?.setFilterValue("user@example.com");
```

### Row Selection

Access selected rows:

```tsx
const selectedRows = table.getSelectedRowModel().rows;
```

### Custom Rendering

```tsx
{
  id: "actions",
  cell: ({ row }) => (
    <Button onClick={() => editUser(row.original.id)}>Edit</Button>
  ),
}
```

## Dependencies

- `@tanstack/react-table` — Core table library (added automatically)

## Resources

- [TanStack Table Docs](https://tanstack.com/table/v8)
- [Column Definitions](https://tanstack.com/table/v8/docs/guide/column-defs)
- [API Reference](https://tanstack.com/table/v8/docs/api)
