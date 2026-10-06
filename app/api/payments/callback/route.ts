/** Pesapal redirects guests here after the hosted page — send them to an
 * honest status page (payment claims are only made after the verified IPN). */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const ref =
    url.searchParams.get("OrderTrackingId") ||
    url.searchParams.get("orderTrackingId") ||
    "";
  const dest = new URL("/pay/thankyou", url);
  if (ref) dest.searchParams.set("ref", ref.slice(0, 8));
  return Response.redirect(dest, 302);
}
