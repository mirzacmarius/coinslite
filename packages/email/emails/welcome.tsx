import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export default function WelcomeEmail() {
  return (
    <Html>
      <Preview>Welcome to CoinsLite</Preview>
      <Tailwind>
        <Body className="my-auto mx-auto font-sans">
          <Container className="border-transparent my-[40px] mx-auto max-w-[600px]">
            <Heading className="font-normal text-center p-0 my-[30px] mx-0">
              Welcome to CoinsLite
            </Heading>
            <Section className="mb-6">
              Your account is ready. Start by adding the first item to your
              collection.
            </Section>
            <Section className="mb-6">
              <Link href={baseUrl}>
                <Button className="bg-black text-white p-4 text-center">
                  Open CoinsLite
                </Button>
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
