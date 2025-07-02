import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== Admin 測試路由被觸發 ===");

    try {
        console.log("【Test】開始認證...");
        const authResult = await authenticate.admin(request);

        console.log("【Test】認證結果:", {
            hasAdmin: !!authResult.admin,
            hasSession: !!authResult.session,
            shop: authResult.session?.shop || "未取得"
        });

        if (!authResult.admin) {
            console.error("【Test】認證失敗：admin 物件為空");
            return json({
                success: false,
                error: {
                    message: "認證失敗：無法獲取 admin 物件",
                    status: 401,
                    statusText: "Unauthorized"
                }
            }, { status: 401 });
        }

        const { admin } = authResult;
        console.log("【Test】Admin 物件類型:", typeof admin);
        console.log("【Test】Admin 物件方法:", Object.keys(admin));

        // 使用類型斷言來處理 admin 物件
        const adminAny = admin as any;

        // 檢查 admin.rest 是否存在
        if (!adminAny.rest) {
            console.error("【Test】Admin 物件缺少 rest 屬性");
            return json({
                success: false,
                error: {
                    message: "Admin 物件結構不正確：缺少 rest 屬性",
                    status: 500,
                    statusText: "Internal Server Error"
                }
            }, { status: 500 });
        }

        // 檢查 admin.rest.get 是否存在
        if (typeof adminAny.rest.get !== 'function') {
            console.error("【Test】Admin.rest.get 不是函數");
            return json({
                success: false,
                error: {
                    message: "Admin API 方法不可用：rest.get 不是函數",
                    status: 500,
                    statusText: "Internal Server Error"
                }
            }, { status: 500 });
        }

        console.log("【Test】開始測試 shop API...");

        // 測試 shop API
        const shopResponse = await adminAny.rest.get({ path: 'shop' });
        console.log("【Test】Shop API 測試成功:", JSON.stringify(shopResponse.body, null, 2));

        console.log("【Test】開始測試 script_tags API...");

        // 新增 debug log
        const accessToken = adminAny.session?.accessToken || adminAny.session?.access_token;
        console.log("[DEBUG] Access Token:", accessToken ? "存在" : "不存在");
        const shopDomain = adminAny.session?.shop || adminAny.session?.shopDomain;
        console.log("[DEBUG] Shop Domain:", shopDomain);
        console.log("[DEBUG] adminAny.rest.get:", typeof adminAny.rest.get);
        console.log("[DEBUG] SHOPIFY_API_KEY:", process.env.SHOPIFY_API_KEY ? "存在" : "不存在");
        console.log("[DEBUG] SHOPIFY_API_SECRET:", process.env.SHOPIFY_API_SECRET ? "存在" : "不存在");
        console.log("[DEBUG] SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL);
        console.log("[DEBUG] 準備查詢 ScriptTag，header:", {
            "X-Shopify-Access-Token": accessToken ? "存在" : "不存在"
        });

        // 測試 script_tags API
        const scriptTagsResponse = await adminAny.rest.get({ path: 'script_tags' });
        if (scriptTagsResponse.body && Array.isArray(scriptTagsResponse.body.script_tags)) {
            console.log("[DEBUG] ScriptTag API 回傳 script_tags 數量:", scriptTagsResponse.body.script_tags.length);
        } else {
            console.log("[DEBUG] ScriptTag API 回傳內容:", typeof scriptTagsResponse.body, scriptTagsResponse.body && Object.keys(scriptTagsResponse.body));
        }

        return json({
            success: true,
            adminInfo: {
                type: typeof admin,
                methods: Object.keys(admin),
                hasRest: !!adminAny.rest,
                hasRestGet: typeof adminAny.rest.get === 'function'
            },
            shopInfo: shopResponse.body,
            scriptTagsInfo: {
                count: scriptTagsResponse.body.script_tags.length,
                tags: scriptTagsResponse.body.script_tags
            }
        });
    } catch (error: any) {
        console.error("【Test】測試失敗:", error);
        console.error("【Test】錯誤詳情:", {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            status: error?.status,
            statusText: error?.statusText
        });

        return json({
            success: false,
            error: {
                message: error?.message || "未知錯誤",
                status: error?.status || 500,
                statusText: error?.statusText || "Internal Server Error",
                details: {
                    name: error?.name,
                    stack: error?.stack
                }
            }
        }, { status: error?.status || 500 });
    }
};

export default function TestAdmin() {
    const data = useLoaderData<typeof loader>() as any;

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>Admin API 測試結果</h1>

            <h2>測試狀態</h2>
            <div style={{
                padding: "10px",
                backgroundColor: data.success ? "#d4edda" : "#f8d7da",
                border: "1px solid",
                borderColor: data.success ? "#c3e6cb" : "#f5c6cb",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                {data.success ? "✅ 測試成功" : "❌ 測試失敗"}
            </div>

            {data.success && (
                <>
                    <h2>Admin 物件資訊</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>類型:</strong> {data.adminInfo.type}</p>
                        <p><strong>方法:</strong> {data.adminInfo.methods.join(", ")}</p>
                        <p><strong>有 REST 屬性:</strong> {data.adminInfo.hasRest ? "是" : "否"}</p>
                        <p><strong>有 REST.GET 方法:</strong> {data.adminInfo.hasRestGet ? "是" : "否"}</p>
                    </div>

                    <h2>商店資訊</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#e7f3ff",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>商店名稱:</strong> {data.shopInfo.shop.name}</p>
                        <p><strong>商店域名:</strong> {data.shopInfo.shop.domain}</p>
                        <p><strong>商店郵箱:</strong> {data.shopInfo.shop.email}</p>
                        <p><strong>商店地址:</strong> {data.shopInfo.shop.address1}</p>
                    </div>

                    <h2>ScriptTag 資訊</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#fff3cd",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>總數量:</strong> {data.scriptTagsInfo.count}</p>
                    </div>

                    {data.scriptTagsInfo.count > 0 && (
                        <div>
                            <h3>所有 ScriptTag</h3>
                            <div style={{ maxHeight: "400px", overflow: "auto" }}>
                                <pre style={{
                                    backgroundColor: "#f8f9fa",
                                    padding: "10px",
                                    borderRadius: "4px",
                                    fontSize: "12px"
                                }}>
                                    {JSON.stringify(data.scriptTagsInfo.tags, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!data.success && 'error' in data && data.error && (
                <div>
                    <h2>錯誤資訊</h2>
                    <pre style={{
                        backgroundColor: "#f8d7da",
                        padding: "10px",
                        borderRadius: "4px",
                        overflow: "auto"
                    }}>
                        {JSON.stringify(data.error, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
} 