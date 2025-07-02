import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("【Extension】=== 手動安裝 Extension 路由被觸發 ===");

    try {
        const { admin } = await authenticate.admin(request);

        // 獲取商店資訊
        const { body: shopInfo } = await (admin as any).rest.get({ path: 'shop' });
        console.log("【Extension】商店資訊:", JSON.stringify(shopInfo.body.shop));

        // 檢查現有 Web Pixels
        console.log("【Extension】查詢現有 Web Pixels...");
        const { body: webPixels } = await (admin as any).rest.get({ path: 'web_pixels' });
        console.log("【Extension】現有 Web Pixels:", JSON.stringify(webPixels.web_pixels || []));

        // 檢查是否有我們的 extension
        const ourPixel = webPixels.web_pixels?.find((pixel: any) =>
            pixel.title === 'DDKT Analysis Tracking' ||
            pixel.title === 'ddkt-tracking' ||
            pixel.title?.includes('ddkt')
        );

        return json({
            success: true,
            shop: shopInfo.body.shop,
            existingPixels: webPixels.web_pixels || [],
            ourExtension: ourPixel ? {
                id: ourPixel.id,
                title: ourPixel.title,
                status: ourPixel.status,
                created_at: ourPixel.created_at,
                updated_at: ourPixel.updated_at
            } : null,
            environment: {
                SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
                SHOPIFY_DDKT_TRACKING_ID: process.env.SHOPIFY_DDKT_TRACKING_ID
            }
        });
    } catch (error: any) {
        console.error("【Extension】檢查失敗:", error.message, error.stack);
        return json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};

export const action = async ({ request }: ActionFunctionArgs) => {
    console.log("【Extension】=== 開始手動安裝 Extension ===");

    try {
        const { admin } = await authenticate.admin(request);
        const formData = await request.formData();
        const action = formData.get('action') as string;

        if (action === 'install') {
            console.log("【Extension】嘗試安裝 Web Pixel Extension...");

            // 這裡我們需要手動創建 Web Pixel Extension
            // 注意：這通常需要通過 Partner API 或 App Bridge 來完成
            // 但我們可以嘗試通過 REST API 來安裝

            try {
                // 檢查是否已經存在
                const { body: existingPixels } = await (admin as any).rest.get({ path: 'web_pixels' });
                const ourPixel = existingPixels.web_pixels?.find((pixel: any) =>
                    pixel.title === 'DDKT Analysis Tracking' ||
                    pixel.title === 'ddkt-tracking'
                );

                if (ourPixel) {
                    console.log("【Extension】Extension 已存在，ID:", ourPixel.id);
                    return json({
                        success: true,
                        message: "Extension 已經存在",
                        extensionId: ourPixel.id
                    });
                }

                // 嘗試安裝 extension
                // 注意：這可能需要特定的 API 端點或權限
                console.log("【Extension】Extension 不存在，嘗試安裝...");

                // 由於 Web Pixel Extension 的安裝通常需要通過 Partner API，
                // 我們提供指導而不是直接安裝
                return json({
                    success: false,
                    message: "無法通過此介面直接安裝 Extension。請按照以下步驟操作：",
                    instructions: [
                        "1. 到 Shopify Partner 後台確認 extension 已部署",
                        "2. 重新安裝 App 到商店",
                        "3. 到商店後台「設定 > 顧客事件」新增像素",
                        "4. 選擇「應用程式像素」並選擇我們的 App"
                    ]
                });

            } catch (installError: any) {
                console.error("【Extension】安裝失敗:", installError.message);
                return json({
                    success: false,
                    message: "安裝失敗",
                    error: installError.message
                });
            }
        }

        return json({
            success: false,
            message: "無效的操作"
        });

    } catch (error: any) {
        console.error("【Extension】操作失敗:", error.message, error.stack);
        return json({
            success: false,
            message: "操作失敗",
            error: error.message
        });
    }
};

export default function InstallExtension() {
    const data = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();

    if (!data.success) {
        const errorData = data as { success: false; error: string; stack: string };
        return (
            <div style={{ padding: "20px", fontFamily: "monospace" }}>
                <h1>手動安裝 Extension - 錯誤</h1>
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
        existingPixels: any[];
        ourExtension: any;
        environment: any;
    };

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>手動安裝 Web Pixel Extension</h1>

            <h2>商店資訊</h2>
            <div style={{ padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px", marginBottom: "20px" }}>
                <p><strong>商店名稱:</strong> {successData.shop.name}</p>
                <p><strong>商店網域:</strong> {successData.shop.domain}</p>
            </div>

            <h2>Extension 狀態</h2>
            <div style={{ padding: "15px", backgroundColor: "#e7f3ff", borderRadius: "4px", marginBottom: "20px" }}>
                {successData.ourExtension ? (
                    <div style={{ backgroundColor: "#d4edda", padding: "10px", borderRadius: "4px" }}>
                        <h3>✅ Extension 已安裝</h3>
                        <p><strong>ID:</strong> {successData.ourExtension.id}</p>
                        <p><strong>標題:</strong> {successData.ourExtension.title}</p>
                        <p><strong>狀態:</strong> {successData.ourExtension.status}</p>
                        <p><strong>建立時間:</strong> {successData.ourExtension.created_at}</p>
                    </div>
                ) : (
                    <div style={{ backgroundColor: "#f8d7da", padding: "10px", borderRadius: "4px" }}>
                        <h3>❌ Extension 未安裝</h3>
                        <p>現有 Web Pixels ({successData.existingPixels.length}):</p>
                        <ul>
                            {successData.existingPixels.map((pixel: any, index: number) => (
                                <li key={index}>
                                    <strong>{pixel.title}</strong> (ID: {pixel.id}, 狀態: {pixel.status})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {actionData && (
                <div style={{
                    padding: "15px",
                    backgroundColor: actionData.success ? "#d4edda" : "#f8d7da",
                    borderRadius: "4px",
                    marginBottom: "20px",
                    color: actionData.success ? "#155724" : "#721c24"
                }}>
                    <h3>{actionData.success ? "✅ 成功" : "❌ 失敗"}</h3>
                    <p>{actionData.message}</p>
                    {(actionData as any).instructions && (
                        <div>
                            <h4>安裝步驟：</h4>
                            <ol>
                                {(actionData as any).instructions.map((instruction: string, index: number) => (
                                    <li key={index}>{instruction}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {(actionData as any).error && (
                        <p><strong>錯誤:</strong> {(actionData as any).error}</p>
                    )}
                </div>
            )}

            <h2>手動安裝</h2>
            <div style={{ padding: "15px", backgroundColor: "#fff3cd", borderRadius: "4px", marginBottom: "20px" }}>
                <Form method="post">
                    <input type="hidden" name="action" value="install" />
                    <button
                        type="submit"
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "16px"
                        }}
                        disabled={!!successData.ourExtension}
                    >
                        {successData.ourExtension ? "Extension 已安裝" : "嘗試安裝 Extension"}
                    </button>
                </Form>
            </div>

            <h2>手動安裝步驟</h2>
            <div style={{ padding: "15px", backgroundColor: "#e7f3ff", borderRadius: "4px" }}>
                <h3>方法 1: 重新安裝 App</h3>
                <ol>
                    <li>到商店後台「應用程式」頁面</li>
                    <li>找到「DDKT Analysis Tracking」</li>
                    <li>點擊「移除應用程式」</li>
                    <li>重新安裝應用程式</li>
                    <li>檢查是否觸發了 afterAuth 流程</li>
                </ol>

                <h3>方法 2: 手動新增像素</h3>
                <ol>
                    <li>到商店後台「設定」→「顧客事件」</li>
                    <li>點擊「新增像素」</li>
                    <li>選擇「應用程式像素」</li>
                    <li>找到「DDKT Analysis Tracking」並選擇</li>
                    <li>填寫必要的設定欄位</li>
                    <li>儲存設定</li>
                </ol>

                <h3>方法 3: 檢查 Partner 後台</h3>
                <ol>
                    <li>到 <a href="https://partners.shopify.com/" target="_blank" rel="noopener noreferrer">Shopify Partner</a> 後台</li>
                    <li>找到你的 App</li>
                    <li>檢查 Extensions 頁面</li>
                    <li>確認 `ddkt-tracking` extension 狀態為「已發佈」</li>
                    <li>如果沒有，重新執行 `npx shopify app deploy`</li>
                </ol>
            </div>

            <h2>環境變數</h2>
            <div style={{ padding: "10px", backgroundColor: "#f1f1f1", borderRadius: "4px", marginTop: "20px" }}>
                <p><strong>SHOPIFY_APP_URL:</strong> {successData.environment.SHOPIFY_APP_URL || '未設定'}</p>
                <p><strong>SHOPIFY_DDKT_TRACKING_ID:</strong> {successData.environment.SHOPIFY_DDKT_TRACKING_ID || '未設定'}</p>
            </div>
        </div>
    );
} 