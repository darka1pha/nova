# Email

React Email templates live in `src/emails`.

```bash
npm run email:dev
```

Render templates from server-only mailer code:

```ts
import { renderWelcomeEmail } from "@/lib/email/render";

const { html, text } = await renderWelcomeEmail({
  name: user.name,
  dashboardUrl: "https://example.com/en/dashboard",
});
```

Wire the rendered HTML/text into your provider of choice, such as Resend,
Postmark, SES, or SendGrid. Keep provider credentials in environment
variables and call mailers only from Server Actions, Route Handlers, or jobs.
