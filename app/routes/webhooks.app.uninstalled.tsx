import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`【解除安裝 webhook】收到 ${topic} webhook for ${shop}`);
  if (session) {
    try {
      const result = await db.session.deleteMany({ where: { shop } });
      console.log(`【解除安裝 webhook】已刪除 session，刪除結果:`, result);
    } catch (e) {
      console.error(`【解除安裝 webhook】刪除 session 發生錯誤:`, e);
    }
  } else {
    console.log(`【解除安裝 webhook】找不到 session，可能已被刪除。`);
  }
  console.log(`【解除安裝 webhook】流程結束 for ${shop}`);
  return new Response();
};
