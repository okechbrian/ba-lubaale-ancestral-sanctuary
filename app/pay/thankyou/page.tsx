import Link from "next/link";

export const metadata = {
  title: "Payment — Ba Lubaale Ancestral Sanctuary",
};

export default function PaymentThankYouPage() {
  return (
    <section className="bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-ink">
          Thank you
        </h1>
        <p className="mt-4 text-ink/70">
          If your payment completed, you do not need to do anything else. Every
          payment is verified with the payment provider before it counts — a
          confirmation email with your receipt follows within a few minutes.
        </p>
        <p className="mt-3 text-ink/70">
          Nothing was charged twice, and this page never claims a payment
          succeeded on its own.
        </p>
        <p className="mt-6 text-sm text-ink/50">
          Questions? Reply to your confirmation email or{" "}
          <Link href="/" className="font-semibold text-leaf hover:text-leaf/80">
            return to the site
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
