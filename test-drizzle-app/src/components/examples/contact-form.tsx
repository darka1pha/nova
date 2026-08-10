"use client";

import { z } from "zod";

import { Form } from "@/components/forms/form";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  company: z.string().optional(),
});

type ContactValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  async function handleSubmit(values: ContactValues) {
    await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  }

  return (
    <Form
      schema={contactSchema}
      defaultValues={{ name: "", email: "", company: "" }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <TextField name="name" label="Name" autoComplete="name" />
      <TextField name="email" label="Email" type="email" autoComplete="email" />
      <TextField name="company" label="Company" autoComplete="organization" />
      <Button type="submit">Send</Button>
    </Form>
  );
}
