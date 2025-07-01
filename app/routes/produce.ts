import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
    const body = await request.text();
    console.log("[/produce] 收到請求：", body);
    return new Response(JSON.stringify({ status: "ok", path: "/produce" }), {
        headers: { "Content-Type": "application/json" },
    });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
    return new Response(JSON.stringify({ status: "ok", path: "/produce" }), {
        headers: { "Content-Type": "application/json" },
    });
}; 