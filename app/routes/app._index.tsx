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
        console.log("【App】開始用 GraphQL 查詢 Web Pixel Extensions...");
        const query = `
          query {
            webPixels(first: 10) {
              edges {
                node {
                  id
                  title
                  status
                  settings
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `;
        const response = await admin.graphql(query);
        const data = await response.json();
        const webPixels = data.data.webPixels.edges.map((edge: any) => edge.node);
        const ourPixel = webPixels.find((pixel: any) =>
          pixel.title === 'DDKT Analysis Tracking' ||
          pixel.title === 'ddkt-tracking' ||
          pixel.title?.includes('ddkt')
        );
        console.log("【App】Web Pixels 查詢結果:", webPixels);
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
        return {
          type: "webPixels",
          success: false,
          error: {
            message: error?.message || "未知錯誤",
            status: error?.status || 500,
            statusText: error?.statusText || "Internal Server Error"
          }
        };
      }
    }

    if (action === "registerWebPixel") {
      try {
        console.log("【App】開始用 GraphQL 註冊 Web Pixel Extension...");
        // 先查詢是否已存在
        const query = `
          query {
            webPixels(first: 10) {
              edges {
                node {
                  id
                  title
                  status
                }
              }
            }
          }
        `;
        const response = await admin.graphql(query);
        const data = await response.json();
        const webPixels = data.data.webPixels.edges.map((edge: any) => edge.node);
        const ourPixel = webPixels.find((pixel: any) =>
          pixel.title === 'DDKT Analysis Tracking' ||
          pixel.title === 'ddkt-tracking' ||
          pixel.title?.includes('ddkt')
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
        // 註冊（建立）Web Pixel
        const mutation = `
          mutation webPixelCreate($input: WebPixelInput!) {
            webPixelCreate(webPixel: $input) {
              userErrors {
                field
                message
              }
              webPixel {
                id
                title
                status
              }
            }
          }
        `;
        const variables = {
          input: {
            title: "DDKT Analysis Tracking",
            settings: "{}"
          }
        };
        const createResponse = await admin.graphql(mutation, { variables });
        const createData = await createResponse.json();
        const userErrors = createData.data.webPixelCreate.userErrors;
        const createdPixel = createData.data.webPixelCreate.webPixel;
        if (userErrors && userErrors.length > 0) {
          return {
            type: "registerWebPixel",
            success: false,
            error: {
              message: userErrors.map((e: any) => e.message).join(", ") || "建立失敗",
              status: 400,
              statusText: "GraphQL User Error"
            }
          };
        }
        return {
          type: "registerWebPixel",
          success: true,
          message: "Web Pixel Extension 註冊成功",
          extensionId: createdPixel.id
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
                      <Text as="h4" variant="headingSm">3. 查詢 Web Pixel Extensions</Text>
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
  webPixels(first: 10) {
    edges {
      node {
        id
        title
        status
        settings
        createdAt
        updatedAt
      }
    }
  }
}`}</code>
                        </pre>
                      </Box>

                      <Text as="h5" variant="headingSm">進階查詢（可編輯參數）</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`query WebPixelsQuery($first: Int!, $after: String, $query: String) {
  webPixels(first: $first, after: $after, query: $query) {
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    edges {
      cursor
      node {
        id
        title
        status
        settings
        createdAt
        updatedAt
        # 可選欄位
        # displayName
        # resourceType
        # type
      }
    }
  }
}`}</code>
                        </pre>
                      </Box>

                      <Text as="h5" variant="headingSm">查詢變數範例</Text>
                      <Box
                        padding="300"
                        background="bg-surface"
                        borderWidth="025"
                        borderRadius="100"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0, fontSize: "12px" }}>
                          <code>{`{
  "first": 20,
  "after": null,
  "query": "ddkt"
}`}</code>
                        </pre>
                      </Box>

                      <Text as="h5" variant="headingSm">常用查詢範例</Text>
                      <BlockStack gap="200">
                        <Box
                          padding="200"
                          background="bg-surface-secondary"
                          borderWidth="025"
                          borderRadius="100"
                          borderColor="border"
                        >
                          <Text as="p" variant="bodySm">
                            <strong>查詢特定標題的 Web Pixel：</strong><br />
                            <code>{`{"query": "DDKT Analysis Tracking"}`}</code>
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
                            <strong>查詢活躍狀態的 Web Pixel：</strong><br />
                            在查詢中使用 <code>status: ACTIVE</code> 篩選
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
                            <strong>分頁查詢：</strong><br />
                            使用 <code>after</code> 參數和 <code>pageInfo</code> 進行分頁
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
    </Page>
  );
}
