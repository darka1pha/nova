# UI Library: Chakra UI

This project includes Chakra UI with a client provider in
`src/providers/chakra-provider.tsx`.

Use Chakra when your product benefits from composable accessible components
and style props.

```tsx
import { Button, Field, Input, Stack } from "@chakra-ui/react";

export function InviteForm() {
  return (
    <Stack gap="3">
      <Field.Root>
        <Field.Label>Email</Field.Label>
        <Input name="email" type="email" />
      </Field.Root>
      <Button type="submit">Send invite</Button>
    </Stack>
  );
}
```

Provider-level system customization belongs in
`src/providers/chakra-provider.tsx`. Keep product-specific wrappers in
`src/components/`.
