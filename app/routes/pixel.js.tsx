import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import fs from "fs";
import path from "path";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const pixelPath = path.join(process.cwd(), "public", "pixel.js");

    try {
        const pixelContent = fs.readFileSync(pixelPath, "utf-8");

        return new Response(pixelContent, {
            headers: {
                "Content-Type": "application/javascript",
                "Cache-Control": "no-cache",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("無法讀取 pixel.js:", error);
        return new Response("console.error('Pixel script not found');", {
            status: 404,
            headers: {
                "Content-Type": "application/javascript",
            },
        });
    }
}; 