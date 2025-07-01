import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  createReadableStreamFromReadable,
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  console.log("=== 伺服器請求處理開始 ===");
  console.log("【Server】請求 URL:", request.url);
  console.log("【Server】請求方法:", request.method);
  console.log("【Server】User-Agent:", request.headers.get("user-agent"));
  console.log("【Server】Host:", request.headers.get("host"));
  console.log("【Server】Referer:", request.headers.get("referer"));
  console.log("【Server】Cookie:", request.headers.get("cookie") ? "已設定" : "未設定");
  console.log("【Server】初始狀態碼:", responseStatusCode);

  try {
    console.log("【Server】開始添加文件回應標頭...");
    addDocumentResponseHeaders(request, responseHeaders);
    console.log("【Server】文件回應標頭添加完成");

    const userAgent = request.headers.get("user-agent");
    const callbackName = isbot(userAgent ?? '')
      ? "onAllReady"
      : "onShellReady";

    console.log("【Server】User-Agent 類型:", isbot(userAgent ?? '') ? "Bot" : "Browser");
    console.log("【Server】使用回調:", callbackName);

    return new Promise((resolve, reject) => {
      const { pipe, abort } = renderToPipeableStream(
        <RemixServer
          context={remixContext}
          url={request.url}
        />,
        {
          [callbackName]: () => {
            console.log("【Server】React 渲染完成，準備回應");
            const body = new PassThrough();
            const stream = createReadableStreamFromReadable(body);

            responseHeaders.set("Content-Type", "text/html");
            console.log("【Server】最終狀態碼:", responseStatusCode);
            console.log("【Server】回應標頭:", Object.fromEntries(responseHeaders.entries()));

            resolve(
              new Response(stream, {
                headers: responseHeaders,
                status: responseStatusCode,
              })
            );
            pipe(body);
          },
          onShellError(error: any) {
            console.error("【Server】Shell 錯誤:", error);
            console.error("【Server】Shell 錯誤詳情:", {
              message: (error as any)?.message,
              stack: (error as any)?.stack,
              name: (error as any)?.name
            });
            reject(error);
          },
          onError(error: any) {
            console.error("【Server】渲染錯誤:", error);
            console.error("【Server】渲染錯誤詳情:", {
              message: (error as any)?.message,
              stack: (error as any)?.stack,
              name: (error as any)?.name
            });
            responseStatusCode = 500;
            console.error("【Server】狀態碼更新為 500");
          },
        }
      );

      // Automatically timeout the React renderer after 6 seconds, which ensures
      // React has enough time to flush down the rejected boundary contents
      setTimeout(() => {
        console.log("【Server】渲染超時，中止渲染");
        abort();
      }, streamTimeout + 1000);
    });
  } catch (error: any) {
    console.error("【Server】請求處理過程中發生錯誤:");
    console.error("【Server】錯誤類型:", error?.constructor?.name);
    console.error("【Server】錯誤訊息:", error?.message);
    console.error("【Server】錯誤堆疊:", error?.stack);

    // 重新拋出錯誤以確保錯誤被正確處理
    throw error;
  }
}
