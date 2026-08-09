# Forms

Stack: **React Hook Form** + **Zod**, wired together in
`src/components/forms/form.tsx`.

React Hook Form and `@hookform/resolvers` are included by default because
most enterprise apps need fast client-side validation for search forms,
filters, wizards, drafts, and settings screens.

## Client-side form pattern

Use this when the user needs field-level validation or local form state before
submitting.

```tsx
"use client";

import { z } from "zod";

import { Form } from "@/components/forms/form";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type Values = z.infer<typeof schema>;

export function InviteForm() {
  async function handleSubmit(values: Values) {
    await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  }

  return (
    <Form schema={schema} defaultValues={{ email: "" }} onSubmit={handleSubmit}>
      <TextField name="email" label="Email" type="email" />
      <Button type="submit">Invite</Button>
    </Form>
  );
}
```

A larger copyable example lives in
`src/components/examples/contact-form.tsx`.

## Custom fields

Use `useFormContext` when building select, checkbox, date, or composite
fields.

```tsx
"use client";

import { useFormContext } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";

export function TermsField() {
  const { register } = useFormContext();

  return (
    <FormField name="acceptedTerms" label="Terms">
      <input type="checkbox" {...register("acceptedTerms")} />
    </FormField>
  );
}
```

## Server Actions

For simple mutations, prefer the native `<form action={serverAction}>` +
`useActionState` pattern shown in
`src/features/auth/components/login-form.tsx`. It works with progressive
enhancement and keeps the server as the source of truth.

Use React Hook Form when the client experience needs richer behavior:
multi-step flows, dependent fields, live previews, autosave drafts, dynamic
field arrays, or validation before a network round trip.
