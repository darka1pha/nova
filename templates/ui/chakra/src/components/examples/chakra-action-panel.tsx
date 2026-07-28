"use client";

import { Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { useActionState } from "react";

type ActionState = {
  success: boolean;
  error?: string;
};

async function demoAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "");

  if (name.trim().length < 2) {
    return { success: false, error: "Enter at least two characters." };
  }

  return { success: true };
}

export function ChakraActionPanel() {
  const [state, formAction, pending] = useActionState(demoAction, { success: false });

  return (
    <form action={formAction}>
      <Stack gap="3" maxW="sm">
        <Text fontWeight="semibold">Create teammate</Text>
        <Field.Root invalid={Boolean(state.error)}>
          <Field.Label>Name</Field.Label>
          <Input name="name" />
          <Field.ErrorText>{state.error}</Field.ErrorText>
        </Field.Root>
        <Button type="submit" loading={pending}>
          Create
        </Button>
      </Stack>
    </form>
  );
}
