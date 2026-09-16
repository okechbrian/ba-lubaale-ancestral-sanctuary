import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request an Immersion",
  description:
    "Apply for a private immersion at Ba Lubaale Ancestral Sanctuary — cave work, root-water cleansing, bark cloth craft, and quiet time with land and herd on the Ssese Islands of Lake Victoria, Uganda.",
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
