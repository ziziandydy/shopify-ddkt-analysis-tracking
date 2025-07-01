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
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "checkScriptTags") {
    try {
      console.log("【App】開始檢查 ScriptTag...");
      const { body } = await (admin as any).rest.get({ path: 'script_tags' });
      console.log("【App】ScriptTag 查詢結果:", JSON.stringify(body.script_tags, null, 2));

      const appUrl = process.env.SHOPIFY_APP_URL || 'https://shopify-ddkt-analysis-tracking.vercel.app';
      const ourScriptTags = body.script_tags.filter((tag: any) =>
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
      console.error("【App】ScriptTag 查詢失敗:", error);
      return {
        type: "scriptTags",
        success: false,
        error: {
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText
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
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.type === "product" ? fetcher.data.product?.id.replace(
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

  const scriptTagsData = fetcher.data?.type === "scriptTags" ? fetcher.data : null;
  const productData = fetcher.data?.type === "product" ? fetcher.data : null;

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
                    Congrats on creating a new Shopify app 🎉
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
                        <Banner status="success" title="ScriptTag 檢查完成">
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
                                  <Text variant="headingSm">ScriptTag #{index + 1}</Text>
                                  <Text variant="bodyMd"><strong>ID:</strong> {tag.id}</Text>
                                  <Text variant="bodyMd"><strong>事件:</strong> {tag.event}</Text>
                                  <Text variant="bodyMd"><strong>來源:</strong> {tag.src}</Text>
                                  <Text variant="bodyMd"><strong>創建時間:</strong> {new Date(tag.created_at).toLocaleString()}</Text>
                                </BlockStack>
                              </Box>
                            ))}
                          </BlockStack>
                        ) : (
                          <Banner status="warning" title="未找到我們的 ScriptTag">
                            <p>沒有找到包含 'pixel.js' 的 ScriptTag。這可能表示安裝過程中 ScriptTag 註冊失敗。</p>
                          </Banner>
                        )}
                      </>
                    ) : (
                      <Banner status="critical" title="ScriptTag 檢查失敗">
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
        </Layout>
      </BlockStack>
    </Page>
  );
}
