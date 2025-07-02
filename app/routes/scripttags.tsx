import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== ScriptTag 檢查路由被觸發 ===");

    try {
        console.log("【ScriptTag】開始認證...");
        const authResult = await authenticate.admin(request);

        console.log("【ScriptTag】認證結果:", {
            hasAdmin: !!authResult.admin,
            hasSession: !!authResult.session,
            shop: authResult.session?.shop || "未取得"
        });

        if (!authResult.admin) {
            console.error("【ScriptTag】認證失敗：admin 物件為空");
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
        console.log("【ScriptTag】Admin 物件類型:", typeof admin);
        console.log("【ScriptTag】Admin 物件方法:", Object.keys(admin));

        // 使用類型斷言來處理 admin 物件
        const adminAny = admin as any;

        // 檢查 admin.rest 是否存在
        if (!adminAny.rest) {
            console.error("【ScriptTag】Admin 物件缺少 rest 屬性");
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
            console.error("【ScriptTag】Admin.rest.get 不是函數");
            return json({
                success: false,
                error: {
                    message: "Admin API 方法不可用：rest.get 不是函數",
                    status: 500,
                    statusText: "Internal Server Error"
                }
            }, { status: 500 });
        }

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

        console.log("【ScriptTag】開始查詢所有 ScriptTag...");

        // 查詢所有 ScriptTag
        const { body } = await adminAny.rest.get({ path: 'script_tags' });
        if (body && Array.isArray(body.script_tags)) {
            console.log("[DEBUG] ScriptTag API 回傳 script_tags 數量:", body.script_tags.length);
        } else {
            console.log("[DEBUG] ScriptTag API 回傳內容:", typeof body, body && Object.keys(body));
        }

        const appUrl = process.env.SHOPIFY_APP_URL || 'https://shopify-ddkt-analysis-tracking.vercel.app';
        const ourScriptTags = body.script_tags.filter((tag: any) =>
            tag.src && tag.src.includes('pixel.js')
        );

        console.log("【ScriptTag】我們的 ScriptTag:", JSON.stringify(ourScriptTags, null, 2));

        return json({
            success: true,
            allScriptTags: body.script_tags,
            ourScriptTags,
            appUrl,
            totalCount: body.script_tags.length,
            ourCount: ourScriptTags.length
        });
    } catch (error: any) {
        console.error("【ScriptTag】查詢失敗:", error);
        console.error("【ScriptTag】錯誤詳情:", {
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

export default function ScriptTags() {
    const data = useLoaderData<typeof loader>();

    return (
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
            <h1>ScriptTag 檢查結果</h1>

            <h2>查詢狀態</h2>
            <div style={{
                padding: "10px",
                backgroundColor: data.success ? "#d4edda" : "#f8d7da",
                border: "1px solid",
                borderColor: data.success ? "#c3e6cb" : "#f5c6cb",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                {data.success ? "✅ 查詢成功" : "❌ 查詢失敗"}
            </div>

            {data.success && (
                <>
                    <h2>統計資訊</h2>
                    <div style={{
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "4px",
                        marginBottom: "20px"
                    }}>
                        <p><strong>總 ScriptTag 數量:</strong> {'totalCount' in data ? data.totalCount : 'N/A'}</p>
                        <p><strong>我們的 ScriptTag 數量:</strong> {'ourCount' in data ? data.ourCount : 'N/A'}</p>
                        <p><strong>應用程式 URL:</strong> {'appUrl' in data ? data.appUrl : 'N/A'}</p>
                    </div>

                    {'ourScriptTags' in data && data.ourScriptTags && data.ourScriptTags.length > 0 && (
                        <div>
                            <h2>我們的 ScriptTag</h2>
                            {data.ourScriptTags.map((tag: any, index: number) => (
                                <div key={index} style={{
                                    margin: "10px 0",
                                    padding: "15px",
                                    backgroundColor: "#d4edda",
                                    border: "1px solid #c3e6cb",
                                    borderRadius: "4px"
                                }}>
                                    <h3>ScriptTag #{index + 1}</h3>
                                    <p><strong>ID:</strong> {tag.id}</p>
                                    <p><strong>事件:</strong> {tag.event}</p>
                                    <p><strong>來源:</strong> <a href={tag.src} target="_blank" rel="noopener noreferrer">{tag.src}</a></p>
                                    <p><strong>顯示位置:</strong> {tag.display_scope}</p>
                                    <p><strong>創建時間:</strong> {new Date(tag.created_at).toLocaleString()}</p>
                                    <p><strong>更新時間:</strong> {new Date(tag.updated_at).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <h2>所有 ScriptTag</h2>
                        <div style={{ maxHeight: "400px", overflow: "auto" }}>
                            <pre style={{
                                backgroundColor: "#f8f9fa",
                                padding: "10px",
                                borderRadius: "4px",
                                fontSize: "12px"
                            }}>
                                {JSON.stringify('allScriptTags' in data ? data.allScriptTags : [], null, 2)}
                            </pre>
                        </div>
                    </div>
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