import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    return json({
        SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
        SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
        SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
        SCOPES: process.env.SCOPES,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        HOST: process.env.HOST,
        FRONTEND_PORT: process.env.FRONTEND_PORT,
        // 你可以根據需要加更多變數
    }, {
        headers: {
            "Content-Type": "application/json"
        }
    });
}; 