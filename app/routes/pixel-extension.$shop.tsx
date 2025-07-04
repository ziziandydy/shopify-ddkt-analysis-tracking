import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const shopDomain = params.shop || "test-shop";
    const trackid = "spfyex-" + Buffer.from(shopDomain).toString("base64").replace(/=+$/, "");
    const jsContent = `register(({ analytics }) => {
    analytics.subscribe("all_standard_events", (event) => {
      const payload = {
        event: event.name,
        data: event.data,
        trackid: "${trackid}",
        timestamp: Date.now(),
      };
      fetch("https://violet.ghtinc.com/tracking/track/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    });
  });`;
    return new Response(jsContent, {
        headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=3600"
        }
    });
}; 