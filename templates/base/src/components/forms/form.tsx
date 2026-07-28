"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { type DefaultValues, type FieldValues, FormProvider, useForm } from "react-hook-form";
import type { ZodType } from "zod";

interface FormProps<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: (values: T) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}

/**
 * Thin wrapper around react-hook-form + zod. Centralizing this means every
 * form in the app gets consistent validation resolution and typed values
 * without repeating boilerplate per form.
 */
export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  return (
    <FormProvider {...methods}>
      <form className={className} onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        {children}
      </form>
    </FormProvider>
  );
}
