"use client";

import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";

import { FormError } from "@/components/forms/form-error";
import { Label } from "@/components/ui/label";

export function FormField({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: ReactNode;
}) {
  const {
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      <FormError message={error} />
    </div>
  );
}
