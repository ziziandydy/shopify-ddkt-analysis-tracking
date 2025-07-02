import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== Web Pixel Extension 狀態檢查路由被觸發 ===");

    try {
        const { admin } = await authenticate.admin(request);

        // 獲取商店資訊
        const { body: shopInfo } = await (admin as any).rest.get({ path: 'shop' });
        console.log("【Web Pixel Status】商店資訊:", JSON.stringify(shopInfo.body.shop));

        // 檢查 Web Pixel Extensions
        console.log("【Web Pixel Status】查詢 Web Pixels...");
        const { body: webPixels } = await (admin as any).rest.get({ path: 'web_pixels' });
        console.log("【Web Pixel Status】所有 Web Pixels:", JSON.stringify(webPixels.web_pixels || []));

        // 檢查是否有我們的 extension
        const ourPixel = webPixels.web_pixels?.find((pixel: any) =>
            pixel.title === 'DDKT Analysis Tracking' ||
            pixel.title === 'ddkt-tracking' ||
            pixel.title?.includes('ddkt')
        );

        // 檢查 ScriptTags
        console.log("【Web Pixel Status】查詢 ScriptTags...");
        const { body: scriptTags } = await (admin as any).rest.get({ path: 'script_tags' });
        console.log("【Web Pixel Status】所有 ScriptTags:", JSON.stringify(scriptTags.script_tags || []));

        // 檢查我們的 ScriptTag
        const ourScriptTag = scriptTags.script_tags?.find((tag: any) =>
            tag.src && tag.src.includes('pixel.js')
        );

        return json({
            success: true,
            shop: shopInfo.body.shop,
            webPixels: {
                total: webPixels.web_pixels?.length || 0,
                all: webPixels.web_pixels || [],
                ourExtension: ourPixel ? {
                    id: ourPixel.id,
                    title: ourPixel.title,
                    status: ourPixel.status,
                    created_at: ourPixel.created_at,
                    updated_at: ourPixel.updated_at
                } : null
            },
            scriptTags: {
                total: scriptTags.script_tags?.length || 0,
                all: scriptTags.script_tags || [],
                ourScriptTag: ourScriptTag ? {
                    id: ourScriptTag.id,
                    src: ourScriptTag.src,
                    event: ourScriptTag.event,
                    created_at: ourScriptTag.created_at,
                    updated_at: ourScriptTag.updated_at
                } : null
            },
            environment: {
                SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
                NODE_ENV: process.env.NODE_ENV,
                SHOPIFY_DDKT_TRACKING_ID: process.env.SHOPIFY_DDKT_TRACKING_ID
            }
        });
    } catch (error: any) {
        console.error("【Web Pixel Status】檢查失敗:", error.message, error.stack);
        return json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};

export default function WebPixelStatus() {
    const data = useLoaderData<typeof loader>();

    if (!data.success) {
        const errorData = data as { success: false; error: string; stack: string };
        return (
            <div style={{ padding: "20px", fontFamily: "monospace" }}>
                <h1>Web Pixel Extension 狀態檢查 - 錯誤</h1>
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
        shop: any;
        webPixels: any;
        scriptTags: any;
        environment: any;
    };

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>Web Pixel Extension 狀態檢查</h1>

            <h2>商店資訊</h2>
            <div style={{ padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px", marginBottom: "20px" }}>
                <p><strong>商店名稱:</strong> {successData.shop.name}</p>
                <p><strong>商店網域:</strong> {successData.shop.domain}</p>
                <p><strong>商店郵箱:</strong> {successData.shop.email}</p>
            </div>

            <h2>Web Pixel Extensions</h2>
            <div style={{ padding: "15px", backgroundColor: "#e7f3ff", borderRadius: "4px", marginBottom: "20px" }}>
                <p><strong>總數:</strong> {successData.webPixels.total}</p>

                {successData.webPixels.ourExtension ? (
                    <div style={{ backgroundColor: "#d4edda", padding: "10px", borderRadius: "4px", marginTop: "10px" }}>
                        <h3>✅ 找到我們的 Extension</h3>
                        <p><strong>ID:</strong> {successData.webPixels.ourExtension.id}</p>
                        <p><strong>標題:</strong> {successData.webPixels.ourExtension.title}</p>
                        <p><strong>狀態:</strong> {successData.webPixels.ourExtension.status}</p>
                        <p><strong>建立時間:</strong> {successData.webPixels.ourExtension.created_at}</p>
                        <p><strong>更新時間:</strong> {successData.webPixels.ourExtension.updated_at}</p>
                    </div>
                ) : (
                    <div style={{ backgroundColor: "#f8d7da", padding: "10px", borderRadius: "4px", marginTop: "10px" }}>
                        <h3>❌ 未找到我們的 Extension</h3>
                        <p>所有 Web Pixels:</p>
                        <ul>
                            {successData.webPixels.all.map((pixel: any, index: number) => (
                                <li key={index}>
                                    <strong>{pixel.title}</strong> (ID: {pixel.id}, 狀態: {pixel.status})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <h2>Script Tags</h2>
            <div style={{ padding: "15px", backgroundColor: "#fff3cd", borderRadius: "4px", marginBottom: "20px" }}>
                <p><strong>總數:</strong> {successData.scriptTags.total}</p>

                {successData.scriptTags.ourScriptTag ? (
                    <div style={{ backgroundColor: "#d4edda", padding: "10px", borderRadius: "4px", marginTop: "10px" }}>
                        <h3>✅ 找到我們的 Script Tag</h3>
                        <p><strong>ID:</strong> {successData.scriptTags.ourScriptTag.id}</p>
                        <p><strong>來源:</strong> {successData.scriptTags.ourScriptTag.src}</p>
                        <p><strong>事件:</strong> {successData.scriptTags.ourScriptTag.event}</p>
                        <p><strong>建立時間:</strong> {successData.scriptTags.ourScriptTag.created_at}</p>
                    </div>
                ) : (
                    <div style={{ backgroundColor: "#f8d7da", padding: "10px", borderRadius: "4px", marginTop: "10px" }}>
                        <h3>❌ 未找到我們的 Script Tag</h3>
                        <p>所有 Script Tags:</p>
                        <ul>
                            {successData.scriptTags.all.map((tag: any, index: number) => (
                                <li key={index}>
                                    <strong>{tag.src}</strong> (ID: {tag.id}, 事件: {tag.event})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <h2>環境變數</h2>
            <div style={{ padding: "10px", backgroundColor: "#f1f1f1", borderRadius: "4px", marginBottom: "20px" }}>
                <p><strong>SHOPIFY_APP_URL:</strong> {successData.environment.SHOPIFY_APP_URL || '未設定'}</p>
                <p><strong>NODE_ENV:</strong> {successData.environment.NODE_ENV || '未設定'}</p>
                <p><strong>SHOPIFY_DDKT_TRACKING_ID:</strong> {successData.environment.SHOPIFY_DDKT_TRACKING_ID || '未設定'}</p>
            </div>

            <h2>故障排除建議</h2>
            <div style={{ padding: "15px", backgroundColor: "#e7f3ff", borderRadius: "4px" }}>
                <h3>如果 Web Pixel Extension 未出現：</h3>
                <ol>
                    <li>確認 Partner 後台 extension 已正確部署</li>
                    <li>重新安裝 App 到商店</li>
                    <li>檢查 extension 名稱是否正確</li>
                    <li>確認 App 權限設定</li>
                </ol>

                <h3>如果 Script Tag 未出現：</h3>
                <ol>
                    <li>檢查 afterAuth 流程是否正常執行</li>
                    <li>確認 App URL 設定正確</li>
                    <li>檢查 API 權限</li>
                </ol>
            </div>
        </div>
    );
} 