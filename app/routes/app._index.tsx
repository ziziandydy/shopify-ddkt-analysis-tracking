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

        // 修正 accessToken 與 shopDomain 的取得方式（只取正確型別）
        const accessToken = authResult.session?.accessToken;
        const shopDomain = authResult.session?.shop;
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
        console.log("【App】開始用 REST API 查詢 Web Pixel Extensions...");

        // 嘗試不同的 API 端點來查詢 Web Pixels
        let webPixelsData;
        let apiPath = '';

        try {
          // 嘗試標準的 web_pixels 路徑
          apiPath = 'web_pixels';
          const response = await admin.rest.get({ path: apiPath });

          // 解析回應，支援 response.json() 或 response.body
          if (typeof response.json === 'function') {
            webPixelsData = await response.json();
          } else {
            webPixelsData = response.body;
          }

          console.log("【App】使用 web_pixels 路徑成功");
        } catch (error: any) {
          console.log("【App】web_pixels 路徑失敗，嘗試其他路徑:", error?.status, error?.statusText);

          try {
            // 嘗試 web_pixel_extensions 路徑
            apiPath = 'web_pixel_extensions';
            const response = await admin.rest.get({ path: apiPath });

            if (typeof response.json === 'function') {
              webPixelsData = await response.json();
            } else {
              webPixelsData = response.body;
            }

            console.log("【App】使用 web_pixel_extensions 路徑成功");
          } catch (error2: any) {
            console.log("【App】web_pixel_extensions 路徑也失敗:", error2?.status, error2?.statusText);

            try {
              // 嘗試 extensions 路徑
              apiPath = 'extensions';
              const response = await admin.rest.get({ path: apiPath });

              if (typeof response.json === 'function') {
                webPixelsData = await response.json();
              } else {
                webPixelsData = response.body;
              }

              console.log("【App】使用 extensions 路徑成功");
            } catch (error3: any) {
              console.log("【App】所有路徑都失敗，拋出錯誤");
              throw error3;
            }
          }
        }

        // 確保 web_pixels 是陣列
        const webPixels = Array.isArray(webPixelsData?.web_pixels) ? webPixelsData.web_pixels : [];

        const ourPixel = webPixels.find((pixel: any) =>
          pixel.title === 'DDKT Analysis Tracking' ||
          pixel.title === 'ddkt-tracking' ||
          pixel.title?.includes('ddkt')
        );

        console.log("【App】Web Pixels 查詢結果:", webPixels);
        console.log("【App】使用的 API 路徑:", apiPath);
        console.log("【App】回應數據:", webPixelsData);

        return {
          type: "webPixels",
          success: true,
          allWebPixels: webPixels,
          ourPixel,
          totalCount: webPixels.length,
          ourCount: ourPixel ? 1 : 0,
          apiPath: apiPath
        };
      } catch (error: any) {
        console.error("【App】Web Pixels 查詢失敗:", error?.message, error?.stack);
        console.error("【App】錯誤詳情:", {
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
        console.log("【App】開始用 REST API 註冊 Web Pixel Extension...");

        // 取得 shop domain
        const shopDomain = authResult.session?.shop || "test-shop";
        // 使用 public 目錄下的靜態檔案，確保 extension 能正常載入
        const scriptUrl = `https://shopify-ddkt-analysis-tracking.vercel.app/pixel-andism.js`;
        // 使用 GraphQL Admin API 註冊 Web Pixel Extension
        console.log("【App】使用 GraphQL Admin API 註冊 Web Pixel Extension...");

        const mutation = `
          mutation webPixelCreate($webPixel: WebPixelInput!) {
            webPixelCreate(webPixel: $webPixel) {
              userErrors {
                code
                field
                message
              }
              webPixel {
                id
                settings
              }
            }
          }
        `;

        const variables = {
          webPixel: {
            settings: "{\"accountID\":\"ddkt-tracking\"}"
          }
        };

        console.log("【App】GraphQL 變數:", variables);

        try {
          const response = await admin.graphql(mutation, { variables });
          const responseData = await response.json();

          console.log("【App】GraphQL 回應:", JSON.stringify(responseData, null, 2));

          const userErrors = responseData.data?.webPixelCreate?.userErrors;
          if (userErrors && userErrors.length > 0) {
            console.error("【App】GraphQL 用戶錯誤:", userErrors);
            return {
              type: "registerWebPixel",
              success: false,
              error: {
                message: `GraphQL 錯誤: ${userErrors.map((e: any) => e.message).join(", ")}`,
                status: 400,
                statusText: "GraphQL User Error",
                details: {
                  userErrors: userErrors,
                  suggestion: "請檢查輸入參數和 Extension 設定"
                }
              }
            };
          }

          const createdPixel = responseData.data?.webPixelCreate?.webPixel;
          if (createdPixel) {
            console.log("【App】Web Pixel Extension 註冊成功:", createdPixel);
            return {
              type: "registerWebPixel",
              success: true,
              message: "Web Pixel Extension 註冊成功",
              extensionId: createdPixel.id,
              apiPath: "GraphQL Admin API"
            };
          } else {
            console.error("【App】無法從 GraphQL 回應中獲取 Web Pixel 數據");
            return {
              type: "registerWebPixel",
              success: false,
              error: {
                message: "GraphQL 回應中沒有 Web Pixel 數據",
                status: 500,
                statusText: "GraphQL Response Error",
                details: {
                  responseData: responseData,
                  suggestion: "請檢查 GraphQL 回應格式"
                }
              }
            };
          }
        } catch (graphqlError: any) {
          console.error("【App】GraphQL 請求失敗:", graphqlError.message);
          console.error("【App】GraphQL 錯誤詳情:", graphqlError);

          return {
            type: "registerWebPixel",
            success: false,
            error: {
              message: `GraphQL 請求失敗: ${graphqlError.message}`,
              status: 500,
              statusText: "GraphQL Error",
              details: {
                error: graphqlError.message,
                suggestion: "請檢查 GraphQL 語法和 Extension 部署狀態"
              }
            }
          };
        }
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

    if (action === "deleteWebPixel") {
      try {
        const formPixelId = formData.get("pixelId");
        if (!formPixelId) {
          return {
            type: "deleteWebPixel",
            success: false,
            error: {
              message: "請提供要刪除的 Web Pixel ID",
              status: 400,
              statusText: "Bad Request"
            }
          };
        }
        const mutation = `
          mutation webPixelDelete($id: ID!) {
            webPixelDelete(id: $id) {
              deletedWebPixelId
              userErrors {
                field
                message
              }
            }
          }
        `;
        const variables = { id: formPixelId };
        const deleteResponse = await admin.graphql(mutation, { variables });
        const deleteData = await deleteResponse.json();
        const userErrors = deleteData.data.webPixelDelete.userErrors;
        if (userErrors && userErrors.length > 0) {
          return {
            type: "deleteWebPixel",
            success: false,
            error: {
              message: userErrors.map((e: any) => e.message).join(", ") || "刪除失敗",
              status: 400,
              statusText: "GraphQL User Error"
            }
          };
        }
        return {
          type: "deleteWebPixel",
          success: true,
          message: "Web Pixel Extension 刪除成功",
          deletedId: deleteData.data.webPixelDelete.deletedWebPixelId
        };
      } catch (error: any) {
        console.error("【App】Web Pixel Extension 刪除失敗:", error?.message, error?.stack);
        return {
          type: "deleteWebPixel",
          success: false,
          error: {
            message: error?.message || "Web Pixel Extension 刪除失敗",
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
                  variant="primary"
                >
                  註冊 Web Pixel Extension
                </Button>

                {fetcher.data && fetcher.data.type === "registerWebPixel" && (
                  <BlockStack gap="400">
                    {(() => {
                      const data = fetcher.data as any;
                      if (typeof data.success === 'boolean' && data.success) {
                        return (
                          <Banner tone="success" title="Web Pixel Extension 註冊成功">
                            <p>{data.message || ''}</p>
                            {data.extensionId && <p>ID: {data.extensionId}</p>}
                          </Banner>
                        );
                      } else {
                        return (
                          <Banner tone="critical" title="Web Pixel Extension 註冊失敗">
                            <p>{data.error?.message || data.message || '未知錯誤'}</p>
                            {data.error?.status && (
                              <p>狀態碼: {data.error.status} {data.error.statusText}</p>
                            )}
                          </Banner>
                        );
                      }
                    })()}
                  </BlockStack>
                )}

                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    為什麼會出現 "No extension found" 錯誤？
                  </Text>
                  <Banner tone="warning" title="重要說明">
                    <p>
                      Web Pixel Extensions 需要兩個步驟才能完全安裝：
                    </p>
                    <ol style={{ marginTop: "10px", marginLeft: "20px" }}>
                      <li><strong>Extension 定義</strong> - 在 Shopify Partners 後台建立</li>
                      <li><strong>Web Pixel 實例</strong> - 在商店中建立具體的追蹤實例</li>
                    </ol>
                  </Banner>

                  <Text as="h3" variant="headingMd">
                    解決方案
                  </Text>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">步驟 1: 確認 Extension 已部署</Text>
                      <Text as="p" variant="bodyMd">
                        1. 前往 <Link url="https://partners.shopify.com" target="_blank" removeUnderline>Shopify Partners</Link>
                        2. 進入您的應用程式
                        3. 檢查 Extensions 標籤頁
                        4. 確認 "ddkt-tracking" Web Pixel Extension 已部署
                      </Text>
                    </BlockStack>
                  </Box>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">步驟 2: 重新部署應用程式</Text>
                      <Text as="p" variant="bodyMd">
                        在終端機中執行：
                      </Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>npx shopify app deploy</code>
                        </pre>
                      </Box>
                    </BlockStack>
                  </Box>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">步驟 3: 重新安裝應用程式</Text>
                      <Text as="p" variant="bodyMd">
                        1. 從商店中移除應用程式
                        2. 重新安裝應用程式
                        3. 授權新的權限範圍
                      </Text>
                    </BlockStack>
                  </Box>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">步驟 4: 手動建立 Web Pixel</Text>
                      <Text as="p" variant="bodyMd">
                        如果自動安裝失敗，可以在商店後台手動建立：
                      </Text>
                      <Text as="p" variant="bodyMd">
                        1. 前往商店後台 → 設定 → 應用程式和銷售管道
                        2. 點擊 "管理應用程式"
                        3. 找到您的應用程式
                        4. 點擊 "新增像素"
                        5. 選擇 "DDKT Analysis Tracking"
                      </Text>
                    </BlockStack>
                  </Box>

                  <Banner tone="info" title="技術說明">
                    <p>
                      <strong>GraphQL 錯誤原因：</strong><br />
                      • "No extension found" 表示系統找不到對應的 Extension 定義<br />
                      • 這通常發生在 Extension 尚未部署或權限不足時<br />
                      • 我們已改用 REST API 來避免這個問題
                    </p>
                  </Banner>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Shopify GraphiQL 開發工具 🔧
                  </Text>
                  <Text variant="bodyMd" as="p">
                    快速前往 Shopify GraphiQL 介面進行 API 查詢和測試。這裡提供常用的查詢範例和操作指南。
                  </Text>
                </BlockStack>

                <InlineStack gap="300">
                  <Button
                    url="https://shopify.dev/graphiql/admin"
                    target="_blank"
                    variant="primary"
                  >
                    開啟 Shopify GraphiQL
                  </Button>
                  <Button
                    url="https://shopify.dev/docs/api/admin-graphql"
                    target="_blank"
                    variant="secondary"
                  >
                    GraphQL API 文檔
                  </Button>
                </InlineStack>

                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    常用查詢範例
                  </Text>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">1. 查詢商店資訊</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`query {
  shop {
    id
    name
    email
    myshopifyDomain
    plan {
      displayName
    }
  }
}`}</code>
                        </pre>
                      </Box>
                    </BlockStack>
                  </Box>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">2. 查詢 ScriptTag</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`query {
  scriptTags(first: 10) {
    edges {
      node {
        id
        src
        event
        createdAt
        updatedAt
      }
    }
  }
}`}</code>
                        </pre>
                      </Box>
                    </BlockStack>
                  </Box>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">3. 查詢 Web Pixel Extensions (REST API)</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`GET /admin/api/2024-01/web_pixels.json

Response:
{
  "web_pixels": [
    {
      "id": 123456789,
      "title": "DDKT Analysis Tracking",
      "status": "active",
      "settings": "{}",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}</code>
                        </pre>
                      </Box>

                      <Text as="h5" variant="headingSm">建立 Web Pixel Extension (REST API)</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`POST /admin/api/2024-01/web_pixels.json

Request Body:
{
  "web_pixel": {
    "title": "DDKT Analysis Tracking",
    "settings": "{}"
  }
}

Response:
{
  "web_pixel": {
    "id": 123456789,
    "title": "DDKT Analysis Tracking",
    "status": "active",
    "settings": "{}",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}`}</code>
                        </pre>
                      </Box>

                      <Text as="h5" variant="headingSm">刪除 Web Pixel Extension (REST API)</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`DELETE /admin/api/2024-01/web_pixels/{id}.json

Response:
{
  "web_pixel": {
    "id": 123456789,
    "title": "DDKT Analysis Tracking",
    "status": "deleted"
  }
}`}</code>
                        </pre>
                      </Box>

                      <Text as="h5" variant="headingSm">常用操作範例</Text>
                      <BlockStack gap="200">
                        <Box
                          padding="200"
                          background="bg-surface-secondary"
                          borderWidth="025"
                          borderRadius="100"
                          borderColor="border"
                        >
                          <Text as="p" variant="bodySm">
                            <strong>查詢所有 Web Pixels：</strong><br />
                            <code>GET /admin/api/2024-01/web_pixels.json</code>
                          </Text>
                        </Box>
                        <Box
                          padding="200"
                          background="bg-surface-secondary"
                          borderWidth="025"
                          borderRadius="100"
                          borderColor="border"
                        >
                          <Text as="p" variant="bodySm">
                            <strong>查詢特定 Web Pixel：</strong><br />
                            <code>GET /admin/api/2024-01/web_pixels/{"{id}"}.json</code>
                          </Text>
                        </Box>
                        <Box
                          padding="200"
                          background="bg-surface-secondary"
                          borderWidth="025"
                          borderRadius="100"
                          borderColor="border"
                        >
                          <Text as="p" variant="bodySm">
                            <strong>更新 Web Pixel：</strong><br />
                            <code>PUT /admin/api/2024-01/web_pixels/{"{id}"}.json</code>
                          </Text>
                        </Box>
                      </BlockStack>
                    </BlockStack>
                  </Box>

                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">4. 查詢產品資訊</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`query {
  products(first: 5) {
    edges {
      node {
        id
        title
        handle
        status
        createdAt
        variants(first: 3) {
          edges {
            node {
              id
              title
              price
              sku
            }
          }
        }
      }
    }
  }
}`}</code>
                        </pre>
                      </Box>
                    </BlockStack>
                  </Box>

                  <Banner tone="info" title="使用提示">
                    <p>
                      • 在 GraphiQL 中，您可以直接執行這些查詢來測試 API<br />
                      • 使用左側的 Schema 瀏覽器來探索可用的欄位和類型<br />
                      • 右側的 Variables 面板可以用來設定查詢變數<br />
                      • 點擊 "Docs" 按鈕查看完整的 API 文檔
                    </p>
                  </Banner>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Debug: 顯示 fetcher.data 內容 */}
      {fetcher.data && (
        <pre style={{ background: '#eee', color: '#333', fontSize: 12 }}>
          {JSON.stringify(fetcher.data, null, 2)}
        </pre>
      )}
    </Page>
  );
}
