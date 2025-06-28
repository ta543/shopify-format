import { useEffect } from "react";
import { formatNumber } from "../utils/formatNumber";
import { useLoaderData } from "@remix-run/react";
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
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    {
      orders(first: 100) {
        edges {
          node {
            totalPriceSet {
              shopMoney {
                amount
              }
            }
          }
        }
      }
    }
  `);

  const json = await response.json();
  const orders = json.data.orders.edges;

  const totalSales = orders.reduce((sum, edge) => {
    return sum + parseFloat(edge.node.totalPriceSet.shopMoney.amount);
  }, 0);

  return {
    totalSales
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
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
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
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
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  // const { totalSales } = useLoaderData();
  const totalSales = 153800; // 💰 Mocked value for testing "M" suffix
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  function Metric({ title, value }) {
    return (
      <BlockStack gap="100">
        <Text as="span" variant="bodyMd" tone="subdued">
          {title}
        </Text>
        <Text as="h3" variant="headingLg">
          {value}
        </Text>
      </BlockStack>
    );
  }

  function Breakdown({ label, value }) {
    return (
      <InlineStack align="space-between">
        <Text as="span" variant="bodyMd">
          {label}
        </Text>
        <Text as="span" variant="bodyMd">
          {value}
        </Text>
      </InlineStack>
    );
  }

  return (
    <Page>
      <TitleBar title="Analytics">
        <Button variant="primary" onClick={generateProduct}>
          Generate a product
        </Button>
      </TitleBar>

      <BlockStack gap="500">
        {/* TOP METRICS GRID */}
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack gap="600" wrap={true}>
                <Metric title="Gross sales" value={formatNumber(totalSales)} />
                <Metric title="Returning customer rate" value="0%" />
                <Metric title="Orders fulfilled" value="0" />
                <Metric title="Orders" value="0" />
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* SALES BREAKDOWN & GRAPH */}
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="h2" variant="headingMd">
                Total sales breakdown
              </Text>
              <BlockStack gap="300">
                <Breakdown label="Gross sales" value={formatNumber(totalSales)} />
                <Breakdown label="Discounts" value="$0.00" />
                <Breakdown label="Returns" value="$0.00" />
                <Breakdown label="Net sales" value="$0.00" />
                <Breakdown label="Shipping charges" value="$0.00" />
                <Breakdown label="Return fees" value="$0.00" />
                <Breakdown label="Taxes" value="$0.00" />
                <Breakdown label="Total sales" value={formatNumber(totalSales)} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
