import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to your workspace</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ margin: "0 auto", maxWidth: 560, padding: "32px 20px" }}>
          <Section style={{ backgroundColor: "#ffffff", padding: 24 }}>
            <Heading style={{ color: "#111827", fontSize: 24 }}>Welcome, {name}</Heading>
            <Text style={{ color: "#374151", fontSize: 16, lineHeight: "24px" }}>
              Your workspace is ready. Open the dashboard to finish setup and invite your team.
            </Text>
            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: "#111827",
                color: "#ffffff",
                display: "inline-block",
                marginTop: 12,
                padding: "12px 18px",
                textDecoration: "none",
              }}
            >
              Open dashboard
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Ava",
  dashboardUrl: "http://localhost:3000/en/dashboard",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
