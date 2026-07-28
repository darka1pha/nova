import { render } from "@react-email/render";

import { WelcomeEmail } from "@/emails/welcome-email";

export async function renderWelcomeEmail(input: { name: string; dashboardUrl: string }) {
  const html = await render(<WelcomeEmail {...input} />);
  const text = await render(<WelcomeEmail {...input} />, { plainText: true });

  return { html, text };
}
