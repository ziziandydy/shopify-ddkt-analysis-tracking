import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>A short heading about [your app]</h1>
        <p className={styles.text}>
          A tagline about [your app] that describes your value proposition.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>資料庫連接測試</strong>. 快速診斷資料庫連接池問題。
            <a href="/db-test" style={{ color: "#007bff", textDecoration: "none", marginLeft: "10px" }}>
              → 連接測試
            </a>
          </li>
          <li>
            <strong>資料庫健康檢查</strong>. 詳細監控資料庫連接狀態和效能。
            <a href="/db-health" style={{ color: "#007bff", textDecoration: "none", marginLeft: "10px" }}>
              → 健康檢查
            </a>
          </li>
          <li>
            <strong>OAuth 調試</strong>. 查看 OAuth 認證流程和錯誤詳情。
            <a href="/debug-oauth" style={{ color: "#007bff", textDecoration: "none", marginLeft: "10px" }}>
              → 調試 OAuth
            </a>
          </li>
          <li>
            <strong>Web Pixels 測試</strong>. 測試 Shopify Web Pixels API 整合。
            <a href="/webpixels-test" style={{ color: "#007bff", textDecoration: "none", marginLeft: "10px" }}>
              → 測試 Web Pixels
            </a>
          </li>
          <li>
            <strong>Cookie 調試</strong>. 詳細分析和記錄 Cookie 資訊。
            <a href="/cookie-debug" style={{ color: "#007bff", textDecoration: "none", marginLeft: "10px" }}>
              → Cookie 調試
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
