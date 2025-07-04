import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { logCookieInfo, logCookieHeaders } from "../utils/cookie-logger";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("=== App 路由被觸發 ===");
  console.log("【App】請求 URL:", request.url);
  console.log("【App】請求方法:", request.method);
  console.log("【App】User-Agent:", request.headers.get("user-agent"));
  console.log("【App】Referer:", request.headers.get("referer"));
  console.log("【App】Host:", request.headers.get("host"));
  // 詳細記錄 Cookie 資訊
  logCookieHeaders("App", request);
  logCookieInfo("App", request);

  try {
    console.log("【App】開始執行 authenticate.admin...");
    const result = await authenticate.admin(request);
    console.log("【App】authenticate.admin 成功完成");
    console.log("【App】認證結果:", {
      session: result.session ? "已建立" : "未建立",
      admin: result.admin ? "已建立" : "未建立",
      shop: result.session?.shop || "未取得",
      accessToken: result.session?.accessToken ? "已取得" : "未取得"
    });

    const apiKey = process.env.SHOPIFY_API_KEY || "";
    console.log("【App】API Key:", apiKey ? "已設定" : "未設定");

    return { apiKey };
  } catch (error: any) {
    console.error("【App】認證過程發生錯誤:");
    console.error("【App】錯誤類型:", error?.constructor?.name);
    console.error("【App】錯誤訊息:", error?.message);
    console.error("【App】錯誤堆疊:", error?.stack);
    console.error("【App】錯誤狀態:", error?.status);
    console.error("【App】錯誤狀態文字:", error?.statusText);

    // 如果是重定向錯誤，記錄重定向資訊
    if (error?.status >= 300 && error?.status < 400) {
      console.log("【App】檢測到重定向:", {
        status: error.status,
        headers: Object.fromEntries(error.headers?.entries() || []),
        url: error.headers?.get("location")
      });
    }

    throw error;
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/additional">Additional page</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export const action = () => null;
