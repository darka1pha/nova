"use client";

import type { ComponentProps } from "react";
import { useFormContext } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";

interface TextFieldProps extends ComponentProps<typeof Input> {
  name: string;
  label: string;
}

export function TextField({ name, label, ...props }: TextFieldProps) {
  const { register } = useFormContext();

  return (
    <FormField name={name} label={label}>
      <Input id={name} {...register(name)} {...props} />
    </FormField>
  );
}
