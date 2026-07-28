# UI Library: Material UI

This project includes Material UI with the official Next.js App Router cache
provider in `src/providers/mui-provider.tsx`.

Use MUI when your product needs a broad, accessible component catalog with
strong data-entry primitives.

```tsx
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

export function InviteForm() {
  return (
    <Stack spacing={2}>
      <TextField name="email" label="Email" type="email" />
      <Button type="submit" variant="contained">
        Send invite
      </Button>
    </Stack>
  );
}
```

Theme changes belong in `src/providers/mui-provider.tsx`. Keep reusable
product-specific components in `src/components/` so feature code does not
depend on low-level library details everywhere.
