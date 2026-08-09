# Server Actions

Preferred over Route Handlers for mutations that originate from a form in
this app, per current Next.js guidance. Use a Route Handler instead when:

- The consumer is not a form in this app (public API, webhook, third-party
  client).
- You need a stable REST-style URL.
- The response must not be a redirect/revalidate but raw data with custom
  headers/status codes.

## Conventions

- Colocate actions under `features/<feature>/actions/`.
- Validate input with the same zod schema used on the client.
- Return a typed result object (`{ success, error? }`) rather than throwing,
  so the UI can render inline errors without an error boundary.

## Example: create a user

```ts
"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { api } from "@/lib/api/client";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

type CreateUserState = {
  success: boolean;
  error?: string;
};

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: "Please check the highlighted fields." };
  }

  try {
    await api.post("/users", parsed.data, { next: { tags: ["users"] } });
    revalidateTag("users");
    return { success: true };
  } catch {
    return { success: false, error: "Could not create the user." };
  }
}
```

## Example: file upload action

Use `FormData` directly when the request body is not JSON.

```ts
"use server";

import { api } from "@/lib/api/client";

export async function uploadAvatarAction(formData: FormData) {
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose an image first." };
  }

  const body = new FormData();
  body.set("avatar", file);

  await api.post("/me/avatar", undefined, {
    body,
    headers: {},
  });

  return { success: true };
}
```

## Example: client form

```tsx
"use client";

import { useActionState } from "react";

import { createUserAction } from "@/features/users/actions/create-user-action";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, { success: false });

  return (
    <form action={formAction}>
      <input name="name" />
      <input name="email" type="email" />
      {state.error ? <p>{state.error}</p> : null}
      <button disabled={pending}>{pending ? "Saving..." : "Create user"}</button>
    </form>
  );
}
```
