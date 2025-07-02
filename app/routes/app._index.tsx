import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    console.log("【App】Action 開始執行...");

    // 嘗試認證並獲取 admin 物件
    const authResult = await authenticate.admin(request);
    console.log("【App】認證結果:", {
      hasAdmin: !!authResult.admin,
      hasSession: !!authResult.session,
      shop: authResult.session?.shop || "未取得"
    });

    if (!authResult.admin) {
      console.error("【App】認證失敗：admin 物件為空");
      return {
        type: "scriptTags",
        success: false,
        error: {
          message: "認證失敗：無法獲取 admin 物件",
          status: 401,
          statusText: "Unauthorized"
        }
      };
    }

    const { admin } = authResult;
    const formData = await request.formData();
    const action = formData.get("action");

    if (action === "checkScriptTags") {
      try {
        console.log("【App】開始檢查 ScriptTag...");
        console.log("【App】Admin 物件類型:", typeof admin);
        console.log("【App】Admin 物件方法:", Object.keys(admin));

        // 使用類型斷言來處理 admin 物件
        const adminAny = admin as any;

        // 檢查 admin.rest 是否存在
        if (!adminAny.rest) {
          console.error("【App】Admin 物件缺少 rest 屬性");
          return {
            type: "scriptTags",
            success: false,
            error: {
              message: "Admin 物件結構不正確：缺少 rest 屬性",
              status: 500,
              statusText: "Internal Server Error"
            }
          };
        }

        // 檢查 admin.rest.get 是否存在
        if (typeof adminAny.rest.get !== 'function') {
          console.error("【App】Admin.rest.get 不是函數");
          return {
            type: "scriptTags",
            success: false,
            error: {
              message: "Admin API 方法不可用：rest.get 不是函數",
              status: 500,
              statusText: "Internal Server Error"
            }
          };
        }

        // 新增 debug log
        const accessToken = adminAny.session?.accessToken || adminAny.session?.access_token;
        const shopDomain = adminAny.session?.shop || adminAny.session?.shopDomain;
        console.log("[DEBUG] Access Token:", accessToken ? "存在" : "不存在");
        console.log("[DEBUG] Shop Domain:", shopDomain);
        console.log("[DEBUG] adminAny.rest.get:", typeof adminAny.rest.get);
        console.log("[DEBUG] SHOPIFY_API_KEY:", process.env.SHOPIFY_API_KEY ? "存在" : "不存在");
        console.log("[DEBUG] SHOPIFY_API_SECRET:", process.env.SHOPIFY_API_SECRET ? "存在" : "不存在");
        console.log("[DEBUG] SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL);
        console.log("[DEBUG] 準備查詢 ScriptTag，header:", {
          "X-Shopify-Access-Token": accessToken ? "存在" : "不存在"
        });

        // 查詢 ScriptTag
        const response = await adminAny.rest.get({ path: 'script_tags' });
        // 解析 response，支援 response.json() 或 response.body
        let body;
        if (typeof response.json === 'function') {
          body = await response.json();
        } else {
          body = response.body;
        }
        // 防呆：確保 script_tags 一定是陣列
        const scriptTags = Array.isArray(body?.script_tags) ? body.script_tags : [];
        if (!Array.isArray(body?.script_tags)) {
          console.error("[ScriptTag] Shopify API 回傳格式異常，無法取得 script_tags:", body);
        }
        const ourScriptTags = scriptTags.filter((tag: any) =>
          tag.src && tag.src.includes('pixel.js')
        );

        return {
          type: "scriptTags",
          success: true,
          allScriptTags: body.script_tags,
          ourScriptTags,
          totalCount: body.script_tags.length,
          ourCount: ourScriptTags.length
        };
      } catch (error: any) {
        console.error("【App】ScriptTag 查詢失敗:", error?.message, error?.stack);
        console.error("【App】錯誤詳情:", {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          status: error?.status,
          statusText: error?.statusText
        });

        return {
          type: "scriptTags",
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
        };
      }
    }

    if (action === "registerScriptTag") {
      try {
        console.log("【App】開始註冊 ScriptTag...");
        const base64 = Buffer.from(authResult.session?.shop || "").toString('base64').replace(/=+$/, '');
        const trackingId = `spfy-${base64}`;
        const appUrl = process.env.SHOPIFY_APP_URL || 'https://shopify-ddkt-analysis-tracking.vercel.app';
        const scriptUrl = `${appUrl}/pixel.js?tid=${trackingId}`;

        console.log("【App】ScriptTag 註冊參數:", {
          trackingId,
          appUrl,
          scriptUrl,
          shop: authResult.session?.shop
        });

        // 註冊 ScriptTag
        const result = await admin.rest.post({
          path: 'script_tags',
          data: {
            script_tag: {
              event: 'onload',
              src: scriptUrl,
            },
          },
        });

        console.log("【App】ScriptTag 註冊 API 回應類型:", typeof result.body);
        console.log("【App】ScriptTag 註冊 API 回應 keys:", Object.keys(result.body || {}));
        // 避免循環引用問題，只記錄基本資訊
        if (result.body && typeof result.body === 'object') {
          console.log("【App】ScriptTag 註冊 API 回應基本資訊:", {
            hasScriptTag: !!(result.body as any).script_tag,
            scriptTagId: (result.body as any).script_tag?.id,
            scriptTagSrc: (result.body as any).script_tag?.src
          });
        }

        let scriptTag = null;
        if (typeof result.body?.getReader === 'function') {
          // ReadableStream: 需解析為 JSON
          const reader = result.body.getReader();
          const chunks = [];
          let done, value;
          while (!(done = (await reader.read()).done)) {
            value = (await reader.read()).value;
            if (value) chunks.push(...value);
          }
          const jsonString = new TextDecoder().decode(new Uint8Array(chunks));
          try {
            scriptTag = JSON.parse(jsonString)?.script_tag || null;
          } catch { }
        } else if ((result.body as any)?.script_tag) {
          scriptTag = (result.body as any).script_tag;
        }

        console.log("【App】ScriptTag 註冊成功:", {
          id: scriptTag?.id,
          src: scriptTag?.src,
          event: scriptTag?.event,
          created_at: scriptTag?.created_at
        });

        return {
          type: "registerScriptTag",
          success: true,
          message: "ScriptTag 註冊成功",
          scriptTag,
        };
      } catch (error: any) {
        console.error("【App】ScriptTag 註冊失敗:", error?.message, error?.stack);
        return {
          type: "registerScriptTag",
          success: false,
          error: {
            message: error?.message || "ScriptTag 註冊失敗",
            status: error?.status || 500,
            statusText: error?.statusText || "Internal Server Error"
          }
        };
      }
    }

    if (action === "checkWebPixels") {
      try {
        console.log("【App】開始檢查 Web Pixel Extensions...");
        // 使用類型斷言來處理 admin 物件
        const adminAny = admin as any;

        // 檢查 admin.rest 是否存在
        if (!adminAny.rest) {
          console.error("【App】Admin 物件缺少 rest 屬性");
          return {
            type: "webPixels",
            success: false,
            error: {
              message: "Admin 物件結構不正確：缺少 rest 屬性",
              status: 500,
              statusText: "Internal Server Error"
            }
          };
        }

        // 新增 debug log
        const accessToken = adminAny.session?.accessToken || adminAny.session?.access_token;
        const shopDomain = adminAny.session?.shop || adminAny.session?.shopDomain;
        console.log("[DEBUG] Web Pixels 檢查 - Access Token:", accessToken ? "存在" : "不存在");
        console.log("[DEBUG] Web Pixels 檢查 - Shop Domain:", shopDomain);
        console.log("[DEBUG] Web Pixels 檢查 - adminAny.rest.get:", typeof adminAny.rest.get);
        console.log("[DEBUG] Web Pixels 檢查 - 準備查詢 web_pixels，header:", {
          "X-Shopify-Access-Token": accessToken ? "存在" : "不存在"
        });

        // 查詢 Web Pixels - 嘗試不同的 API 路徑
        let response;

        try {
          // 嘗試標準的 web_pixels 路徑
          response = await adminAny.rest.get({ path: 'web_pixels' });
          console.log("【App】使用 web_pixels 路徑成功");
        } catch (error: any) {
          console.log("【App】web_pixels 路徑失敗，嘗試其他路徑:", error?.status, error?.statusText);

          try {
            // 嘗試 web_pixel_extensions 路徑
            response = await adminAny.rest.get({ path: 'web_pixel_extensions' });
            console.log("【App】使用 web_pixel_extensions 路徑成功");
          } catch (error2: any) {
            console.log("【App】web_pixel_extensions 路徑也失敗:", error2?.status, error2?.statusText);

            try {
              // 嘗試 extensions 路徑
              response = await adminAny.rest.get({ path: 'extensions' });
              console.log("【App】使用 extensions 路徑成功");
            } catch (error3: any) {
              console.log("【App】所有路徑都失敗，拋出錯誤");
              throw error3;
            }
          }
        }

        let body;
        if (typeof response.json === 'function') {
          body = await response.json();
        } else {
          body = response.body;
        }

        console.log("【App】Web Pixels API 回應類型:", typeof body);
        console.log("【App】Web Pixels API 回應 keys:", Object.keys(body || {}));
        // 避免循環引用問題，只記錄基本資訊
        if (body && typeof body === 'object') {
          console.log("【App】Web Pixels API 回應基本資訊:", {
            hasWebPixels: !!(body as any).web_pixels,
            webPixelsCount: Array.isArray((body as any).web_pixels) ? (body as any).web_pixels.length : 0,
            webPixelsTitles: Array.isArray((body as any).web_pixels) ? (body as any).web_pixels.map((p: any) => p.title) : []
          });
        }

        // 防呆：確保 web_pixels 一定是陣列
        const webPixels = Array.isArray(body?.web_pixels) ? body.web_pixels : [];
        if (!Array.isArray(body?.web_pixels)) {
          console.error("[Web Pixels] Shopify API 回傳格式異常，無法取得 web_pixels:", body);
        }

        // 檢查是否有我們的 extension
        const ourPixel = webPixels.find((pixel: any) =>
          pixel.title === 'DDKT Analysis Tracking' ||
          pixel.title === 'ddkt-tracking' ||
          pixel.title?.includes('ddkt')
        );

        console.log("【App】Web Pixels 檢查結果:", {
          totalCount: webPixels.length,
          ourPixelFound: !!ourPixel,
          ourPixel: ourPixel ? {
            id: ourPixel.id,
            title: ourPixel.title,
            status: ourPixel.status
          } : null
        });

        return {
          type: "webPixels",
          success: true,
          allWebPixels: webPixels,
          ourPixel,
          totalCount: webPixels.length,
          ourCount: ourPixel ? 1 : 0
        };
      } catch (error: any) {
        console.error("【App】Web Pixels 查詢失敗:", error?.message, error?.stack);
        console.error("【App】Web Pixels 錯誤詳情:", {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          status: error?.status,
          statusText: error?.statusText
        });

        return {
          type: "webPixels",
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
        };
      }
    }

    if (action === "registerWebPixel") {
      try {
        console.log("【App】開始註冊 Web Pixel Extension...");

        // 檢查是否已經存在
        const { body: existingPixels } = await (admin as any).rest.get({ path: 'web_pixels' });
        const ourPixel = existingPixels.web_pixels?.find((pixel: any) =>
          pixel.title === 'DDKT Analysis Tracking' ||
          pixel.title === 'ddkt-tracking'
        );

        if (ourPixel) {
          console.log("【App】Web Pixel Extension 已存在，ID:", ourPixel.id);
          return {
            type: "registerWebPixel",
            success: true,
            message: "Web Pixel Extension 已經存在",
            extensionId: ourPixel.id
          };
        }

        console.log("【App】Web Pixel Extension 不存在，嘗試安裝...");

        // 注意：Web Pixel Extension 的安裝通常需要通過 Partner API
        // 這裡我們提供指導而不是直接安裝
        console.log("【App】無法通過此介面直接安裝 Extension，提供安裝指導");

        return {
          type: "registerWebPixel",
          success: false,
          message: "無法通過此介面直接安裝 Extension。請按照以下步驟操作：",
          instructions: [
            "1. 到 Shopify Partner 後台確認 extension 已部署",
            "2. 重新安裝 App 到商店",
            "3. 到商店後台「設定 > 顧客事件」新增像素",
            "4. 選擇「應用程式像素」並選擇我們的 App"
          ]
        };

      } catch (error: any) {
        console.error("【App】Web Pixel Extension 註冊失敗:", error?.message, error?.stack);
        return {
          type: "registerWebPixel",
          success: false,
          error: {
            message: error?.message || "Web Pixel Extension 註冊失敗",
            status: error?.status || 500,
            statusText: error?.statusText || "Internal Server Error"
          }
        };
      }
    }

    // 原有的產品生成邏輯
    const color = ["Red", "Orange", "Yellow", "Green"][
      Math.floor(Math.random() * 4)
    ];
    const response = await admin.graphql(
      `#graphql
        mutation populateProduct($product: ProductCreateInput!) {
          productCreate(product: $product) {
            product {
              id
              title
              handle
              status
              variants(first: 10) {
                edges {
                  node {
                    id
                    price
                    barcode
                    createdAt
                  }
                }
              }
            }
          }
        }`,
      {
        variables: {
          product: {
            title: `${color} Snowboard`,
          },
        },
      },
    );
    const responseJson = await response.json();

    const product = responseJson.data!.productCreate!.product!;
    const variantId = product.variants.edges[0]!.node!.id!;

    const variantResponse = await admin.graphql(
      `#graphql
      mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            price
            barcode
            createdAt
          }
        }
      }`,
      {
        variables: {
          productId: product.id,
          variants: [{ id: variantId, price: "100.00" }],
        },
      },
    );

    const variantResponseJson = await variantResponse.json();

    return {
      type: "product",
      product: responseJson!.data!.productCreate!.product,
      variant:
        variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
    };
  } catch (error: any) {
    console.error("【App】Action 執行失敗:", error);
    console.error("【App】Action 錯誤詳情:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      status: error?.status,
      statusText: error?.statusText
    });

    // 如果是認證錯誤，返回特定的錯誤訊息
    if (error?.status === 401 || error?.status === 403) {
      return {
        type: "scriptTags",
        success: false,
        error: {
          message: "認證失敗，請重新登入",
          status: error.status,
          statusText: error.statusText || "Unauthorized"
        }
      };
    }

    // 其他錯誤
    return {
      type: "scriptTags",
      success: false,
      error: {
        message: error?.message || "Action 執行失敗",
        status: error?.status || 500,
        statusText: error?.statusText || "Internal Server Error"
      }
    };
  }
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.type === "product" ? (fetcher.data as any).product?.id.replace(
    "gid://shopify/Product/",
    "",
  ) : null;

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);

  const generateProduct = () => fetcher.submit({ action: "generateProduct" }, { method: "POST" });
  const checkScriptTags = () => fetcher.submit({ action: "checkScriptTags" }, { method: "POST" });
  const registerScriptTag = () => fetcher.submit({ action: "registerScriptTag" }, { method: "POST" });
  const checkWebPixels = () => fetcher.submit({ action: "checkWebPixels" }, { method: "POST" });
  const registerWebPixel = () => fetcher.submit({ action: "registerWebPixel" }, { method: "POST" });

  const scriptTagsData = fetcher.data?.type === "scriptTags" ? fetcher.data as any : null;
  const productData = fetcher.data?.type === "product" ? fetcher.data as any : null;
  const webPixelsData = fetcher.data?.type === "webPixels" ? fetcher.data as any : null;
  const registerWebPixelData = fetcher.data?.type === "registerWebPixel" ? fetcher.data as any : null;

  return (
    <Page>
      <TitleBar title="Remix app template">
        <button variant="primary" onClick={generateProduct}>
          Generate a product
        </button>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    歡迎使用 DDKT 分析追蹤應用程式 🎉
                    歡迎到{" "}
                    <Link
                      url="https://insight.ghtinc.com"
                      target="_blank"
                      removeUnderline
                    >
                      DDKT Dashboard
                    </Link>{" "}
                    查看進站訪客的站外行為分析！
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This embedded app template uses{" "}
                    <Link
                      url="https://shopify.dev/docs/apps/tools/app-bridge"
                      target="_blank"
                      removeUnderline
                    >
                      App Bridge
                    </Link>{" "}
                    interface examples like an{" "}
                    <Link url="/app/additional" removeUnderline>
                      additional page in the app nav
                    </Link>
                    , as well as an{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql"
                      target="_blank"
                      removeUnderline
                    >
                      Admin GraphQL
                    </Link>{" "}
                    mutation demo, to provide a starting point for app
                    development.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Get started with products
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Generate a product with GraphQL and get the JSON output for
                    that product. Learn more about the{" "}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
                      target="_blank"
                      removeUnderline
                    >
                      productCreate
                    </Link>{" "}
                    mutation in our API references.
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <Button loading={isLoading} onClick={generateProduct}>
                    Generate a product
                  </Button>
                  {productData?.product && (
                    <Button
                      url={`shopify:admin/products/${productId}`}
                      target="_blank"
                      variant="plain"
                    >
                      View product
                    </Button>
                  )}
                </InlineStack>
                {productData?.product && (
                  <>
                    <Text as="h3" variant="headingMd">
                      {" "}
                      productCreate mutation
                    </Text>
                    <Box
                      padding="400"
                      background="bg-surface-active"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0 }}>
                        <code>
                          {JSON.stringify(productData.product, null, 2)}
                        </code>
                      </pre>
                    </Box>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    ScriptTag 檢查工具 🔍
                  </Text>
                  <Text variant="bodyMd" as="p">
                    檢查您的追蹤 ScriptTag 是否已成功註冊到商店中。
                  </Text>
                </BlockStack>

                <Button
                  loading={isLoading && fetcher.formData?.get("action") === "checkScriptTags"}
                  onClick={checkScriptTags}
                  variant="secondary"
                >
                  檢查 ScriptTag 狀態
                </Button>

                {scriptTagsData && (
                  <BlockStack gap="400">
                    {scriptTagsData.success ? (
                      <>
                        <Banner tone="success" title="ScriptTag 檢查完成">
                          <p>總共找到 {scriptTagsData.totalCount} 個 ScriptTag，其中 {scriptTagsData.ourCount} 個是我們的追蹤 ScriptTag。</p>
                        </Banner>

                        {scriptTagsData.ourScriptTags && scriptTagsData.ourScriptTags.length > 0 ? (
                          <BlockStack gap="300">
                            <Text as="h3" variant="headingMd">
                              我們的 ScriptTag
                            </Text>
                            {scriptTagsData.ourScriptTags.map((tag: any, index: number) => (
                              <Box
                                key={index}
                                padding="400"
                                background="bg-surface-active"
                                borderWidth="025"
                                borderRadius="200"
                                borderColor="border"
                              >
                                <BlockStack gap="200">
                                  <Text as="h4" variant="headingSm">ScriptTag #{index + 1}</Text>
                                  <Text as="p" variant="bodyMd"><strong>ID:</strong> {tag.id}</Text>
                                  <Text as="p" variant="bodyMd"><strong>事件:</strong> {tag.event}</Text>
                                  <Text as="p" variant="bodyMd"><strong>來源:</strong> {tag.src}</Text>
                                  <Text as="p" variant="bodyMd"><strong>創建時間:</strong> {new Date(tag.created_at).toLocaleString()}</Text>
                                </BlockStack>
                              </Box>
                            ))}
                          </BlockStack>
                        ) : (
                          <Banner tone="warning" title="未找到我們的 ScriptTag">
                            <p>沒有找到包含 'pixel.js' 的 ScriptTag。這可能表示安裝過程中 ScriptTag 註冊失敗。</p>
                          </Banner>
                        )}
                      </>
                    ) : (
                      <Banner tone="critical" title="ScriptTag 檢查失敗">
                        <p>錯誤: {scriptTagsData.error?.message || '未知錯誤'}</p>
                        {scriptTagsData.error?.status && (
                          <p>狀態碼: {scriptTagsData.error.status} {scriptTagsData.error.statusText}</p>
                        )}
                      </Banner>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    ScriptTag 註冊工具 📝
                  </Text>
                  <Text variant="bodyMd" as="p">
                    手動註冊 ScriptTag 到商店中。
                  </Text>
                </BlockStack>

                <Button
                  loading={isLoading && fetcher.formData?.get("action") === "registerScriptTag"}
                  onClick={registerScriptTag}
                  variant="secondary"
                >
                  手動註冊 ScriptTag
                </Button>

                {fetcher.data?.type === "registerScriptTag" && (
                  (fetcher.data as any).success ? (
                    <Banner tone="success" title="ScriptTag 註冊成功">
                      <p>ScriptTag 已成功註冊！</p>
                    </Banner>
                  ) : (
                    <Banner tone="critical" title="ScriptTag 註冊失敗">
                      <p>錯誤: {(fetcher.data as any).error?.message || '未知錯誤'}</p>
                    </Banner>
                  )
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Web Pixel Extension 檢查工具 🔍
                  </Text>
                  <Text variant="bodyMd" as="p">
                    檢查您的 Web Pixel Extension 是否已成功安裝到商店中。
                  </Text>
                </BlockStack>

                <Button
                  loading={isLoading && fetcher.formData?.get("action") === "checkWebPixels"}
                  onClick={checkWebPixels}
                  variant="secondary"
                >
                  檢查 Web Pixel Extension 狀態
                </Button>

                {webPixelsData && (
                  <BlockStack gap="400">
                    {webPixelsData.success ? (
                      <>
                        <Banner tone="success" title="Web Pixel Extension 檢查完成">
                          <p>總共找到 {webPixelsData.totalCount} 個 Web Pixel Extension，其中 {webPixelsData.ourCount} 個是我們的 Extension。</p>
                        </Banner>

                        {webPixelsData.ourPixel ? (
                          <BlockStack gap="300">
                            <Text as="h3" variant="headingMd">
                              我們的 Web Pixel Extension
                            </Text>
                            <Box
                              padding="400"
                              background="bg-surface-active"
                              borderWidth="025"
                              borderRadius="200"
                              borderColor="border"
                            >
                              <BlockStack gap="200">
                                <Text as="h4" variant="headingSm">Extension 詳細資訊</Text>
                                <Text as="p" variant="bodyMd"><strong>ID:</strong> {webPixelsData.ourPixel.id}</Text>
                                <Text as="p" variant="bodyMd"><strong>標題:</strong> {webPixelsData.ourPixel.title}</Text>
                                <Text as="p" variant="bodyMd"><strong>狀態:</strong> {webPixelsData.ourPixel.status}</Text>
                                <Text as="p" variant="bodyMd"><strong>創建時間:</strong> {new Date(webPixelsData.ourPixel.created_at).toLocaleString()}</Text>
                                <Text as="p" variant="bodyMd"><strong>更新時間:</strong> {new Date(webPixelsData.ourPixel.updated_at).toLocaleString()}</Text>
                              </BlockStack>
                            </Box>
                          </BlockStack>
                        ) : (
                          <Banner tone="warning" title="未找到我們的 Web Pixel Extension">
                            <p>沒有找到我們的 Web Pixel Extension。這可能表示 Extension 尚未安裝或 Partner 後台設定有問題。</p>
                            {webPixelsData.allWebPixels && webPixelsData.allWebPixels.length > 0 && (
                              <div style={{ marginTop: "10px" }}>
                                <p><strong>現有的 Web Pixel Extensions:</strong></p>
                                <ul>
                                  {webPixelsData.allWebPixels.map((pixel: any, index: number) => (
                                    <li key={index}>
                                      <strong>{pixel.title}</strong> (ID: {pixel.id}, 狀態: {pixel.status})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Banner>
                        )}
                      </>
                    ) : (
                      <Banner tone="critical" title="Web Pixel Extension 檢查失敗">
                        <p>錯誤: {webPixelsData.error?.message || '未知錯誤'}</p>
                        {webPixelsData.error?.status && (
                          <p>狀態碼: {webPixelsData.error.status} {webPixelsData.error.statusText}</p>
                        )}
                      </Banner>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Web Pixel Extension 安裝指導 📋
                  </Text>
                  <Text variant="bodyMd" as="p">
                    由於 Web Pixel Extension 需要通過 Partner API 安裝，請按照以下步驟手動安裝。
                  </Text>
                </BlockStack>

                <Button
                  loading={isLoading && fetcher.formData?.get("action") === "registerWebPixel"}
                  onClick={registerWebPixel}
                  variant="secondary"
                >
                  檢查安裝狀態
                </Button>

                {registerWebPixelData && (
                  <BlockStack gap="400">
                    {registerWebPixelData.success ? (
                      <Banner tone="success" title="Web Pixel Extension 已存在">
                        <p>Extension 已經存在，ID: {registerWebPixelData.extensionId}</p>
                      </Banner>
                    ) : (
                      <Banner tone="info" title="安裝指導">
                        <p>{registerWebPixelData.message}</p>
                        {registerWebPixelData.instructions && (
                          <div style={{ marginTop: "10px" }}>
                            <ol>
                              {registerWebPixelData.instructions.map((instruction: string, index: number) => (
                                <li key={index} style={{ marginBottom: "5px" }}>{instruction}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </Banner>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
