import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    console.log("=== ScriptTag 檢查路由被觸發 ===");

    try {
        const { admin } = await authenticate.admin(request);

        console.log("【ScriptTag】開始查詢所有 ScriptTag...");

        // 查詢所有 ScriptTag
        const { body } = await (admin as any).rest.get({ path: 'script_tags' });
        console.log("【ScriptTag】查詢結果:", JSON.stringify(body.script_tags, null, 2));

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

        return json({
            success: false,
            error: {
                message: error?.message,
                status: error?.status,
                statusText: error?.statusText
            }
        }, { status: 500 });
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