import { json } from "@remix-run/node";

export const loader = async () => {
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
    });
};

export default function DebugEnv() {
    return <div>請用 GET 請求取得 JSON 結果 </div>;
} 