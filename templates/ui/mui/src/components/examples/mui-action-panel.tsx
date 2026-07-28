"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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

export function MuiActionPanel() {
  const [state, formAction, pending] = useActionState(demoAction, { success: false });

  return (
    <Box component="form" action={formAction} sx={{ maxWidth: 420 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Create teammate</Typography>
        <TextField name="name" label="Name" error={Boolean(state.error)} helperText={state.error} />
        <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={pending}>
          {pending ? "Creating..." : "Create"}
        </Button>
      </Stack>
    </Box>
  );
}
