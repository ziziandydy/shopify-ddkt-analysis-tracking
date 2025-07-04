import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== Web Pixel API 測試路由被觸發 ===");

    try {
        const { admin } = await authenticate.admin(request);

        const results: {
            web_pixels: any;
            web_pixel_extensions: any;
            extensions: any;
            errors: Array<{ endpoint: string; error: string; status: number }>;
        } = {
            web_pixels: null,
            web_pixel_extensions: null,
            extensions: null,
            errors: []
        };

        // 測試 web_pixels 端點
        try {
            console.log("測試 web_pixels 端點...");
            const response = await admin.rest.get({ path: 'web_pixels' });
            results.web_pixels = {
                status: response.status,
                data: response.body
            };
            console.log("web_pixels 端點可用");
        } catch (error: any) {
            results.errors.push({
                endpoint: 'web_pixels',
                error: error.message,
                status: error.status
            });
            console.log("web_pixels 端點不可用:", error.message);
        }

        // 測試 web_pixel_extensions 端點
        try {
            console.log("測試 web_pixel_extensions 端點...");
            const response = await admin.rest.get({ path: 'web_pixel_extensions' });
            results.web_pixel_extensions = {
                status: response.status,
                data: response.body
            };
            console.log("web_pixel_extensions 端點可用");
        } catch (error: any) {
            results.errors.push({
                endpoint: 'web_pixel_extensions',
                error: error.message,
                status: error.status
            });
            console.log("web_pixel_extensions 端點不可用:", error.message);
        }

        // 測試 extensions 端點
        try {
            console.log("測試 extensions 端點...");
            const response = await admin.rest.get({ path: 'extensions' });
            results.extensions = {
                status: response.status,
                data: response.body
            };
            console.log("extensions 端點可用");
        } catch (error: any) {
            results.errors.push({
                endpoint: 'extensions',
                error: error.message,
                status: error.status
            });
            console.log("extensions 端點不可用:", error.message);
        }

        return json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Web Pixel API 測試失敗:", error.message, error.stack);
        return json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};

export default function TestWebPixelAPI() {
    const data = useLoaderData<typeof loader>();

    if (!data.success) {
        const errorData = data as any;
        return (
            <div style={{ padding: "20px", fontFamily: "monospace" }}>
                <h1>Web Pixel API 測試 - 錯誤</h1>
                <div style={{ color: "red", padding: "10px", backgroundColor: "#ffe6e6", borderRadius: "4px" }}>
                    <h3>錯誤訊息:</h3>
                    <p>{errorData.error}</p>
                    <h3>錯誤堆疊:</h3>
                    <pre style={{ fontSize: "12px", overflow: "auto" }}>{errorData.stack}</pre>
                </div>
            </div>
        );
    }

    const successData = data as {
        success: true;
        results: any;
        timestamp: string;
    };

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>Web Pixel API 測試結果</h1>
            <p><strong>測試時間:</strong> {successData.timestamp}</p>

            <h2>API 端點測試結果</h2>

            <h3>1. web_pixels 端點</h3>
            {successData.results.web_pixels ? (
                <div style={{ padding: "10px", backgroundColor: "#e7f3ff", borderRadius: "4px" }}>
                    <p><strong>狀態:</strong> ✅ 可用 (HTTP {successData.results.web_pixels.status})</p>
                    <p><strong>數據:</strong></p>
                    <pre style={{ fontSize: "12px", overflow: "auto" }}>
                        {JSON.stringify(successData.results.web_pixels.data, null, 2)}
                    </pre>
                </div>
            ) : (
                <div style={{ padding: "10px", backgroundColor: "#ffe6e6", borderRadius: "4px" }}>
                    <p><strong>狀態:</strong> ❌ 不可用</p>
                </div>
            )}

            <h3>2. web_pixel_extensions 端點</h3>
            {successData.results.web_pixel_extensions ? (
                <div style={{ padding: "10px", backgroundColor: "#e7f3ff", borderRadius: "4px" }}>
                    <p><strong>狀態:</strong> ✅ 可用 (HTTP {successData.results.web_pixel_extensions.status})</p>
                    <p><strong>數據:</strong></p>
                    <pre style={{ fontSize: "12px", overflow: "auto" }}>
                        {JSON.stringify(successData.results.web_pixel_extensions.data, null, 2)}
                    </pre>
                </div>
            ) : (
                <div style={{ padding: "10px", backgroundColor: "#ffe6e6", borderRadius: "4px" }}>
                    <p><strong>狀態:</strong> ❌ 不可用</p>
                </div>
            )}

            <h3>3. extensions 端點</h3>
            {successData.results.extensions ? (
                <div style={{ padding: "10px", backgroundColor: "#e7f3ff", borderRadius: "4px" }}>
                    <p><strong>狀態:</strong> ✅ 可用 (HTTP {successData.results.extensions.status})</p>
                    <p><strong>數據:</strong></p>
                    <pre style={{ fontSize: "12px", overflow: "auto" }}>
                        {JSON.stringify(successData.results.extensions.data, null, 2)}
                    </pre>
                </div>
            ) : (
                <div style={{ padding: "10px", backgroundColor: "#ffe6e6", borderRadius: "4px" }}>
                    <p><strong>狀態:</strong> ❌ 不可用</p>
                </div>
            )}

            <h2>錯誤詳情</h2>
            <div>
                {successData.results.errors.length > 0 ? (
                    <div style={{ padding: "10px", backgroundColor: "#fff3cd", borderRadius: "4px" }}>
                        {successData.results.errors.map((error: any, index: number) => (
                            <div key={index} style={{ marginBottom: "10px" }}>
                                <p><strong>端點:</strong> {error.endpoint}</p>
                                <p><strong>錯誤:</strong> {error.error}</p>
                                <p><strong>狀態碼:</strong> {error.status}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>沒有錯誤</p>
                )}
            </div>

            <h2>結論</h2>
            <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                {successData.results.web_pixels || successData.results.web_pixel_extensions ? (
                    <div>
                        <p>✅ 至少有一個 Web Pixel API 端點可用，可以嘗試註冊 Web Pixel Extension</p>
                    </div>
                ) : (
                    <div>
                        <p>❌ 所有 Web Pixel API 端點都不可用，可能需要：</p>
                        <ul>
                            <li>部署 Extension 到 Partner 後台</li>
                            <li>檢查 App 權限</li>
                            <li>等待 Shopify 完全支援 Web Pixel API</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
} 