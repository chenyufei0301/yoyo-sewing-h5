/**
 * Vercel Serverless Function — 排单表单提交 → 飞书多维表格
 *
 * 部署前需要在 Vercel 设置环境变量：
 *   FEISHU_APP_ID     = cli_a979c3d575b89cba
 *   FEISHU_APP_SECRET = <你的 app secret>
 */

// 款式 ID → 名称映射（与 index.html 中的 STYLES 保持一致）
const STYLE_MAP = {
  S01: '经典方领打揽衫',
  S02: '圆领泡泡袖打揽衫',
  S03: 'V领收腰打揽连衣裙',
  S04: '一字肩打揽上衣',
  S05: '荷叶边打揽半裙',
  S06: '娃娃领打揽衬衫',
  S07: '吊带打揽连衣裙',
  S08: '抽褶打揽阔腿裤',
  S09: '中式立领打揽上衣',
  S10: '蕾丝拼接打揽衫',
};

// 飞书多维表格
const BASE_TOKEN = 'FstabLXs4asqNvsQHdLcoFhNnBc';
const TABLE_ID = 'tblxKkcj5Xjak9QT';

// ========== Helpers ==========

async function getTenantToken() {
  const resp = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await resp.json();
  if (data.code !== 0) {
    throw new Error(`获取飞书Token失败: ${data.msg}`);
  }
  return data.tenant_access_token;
}

async function createRecord(token, fields) {
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    }
  );
  const data = await resp.json();
  if (data.code !== 0) {
    throw new Error(`写入记录失败: ${data.msg}`);
  }
  return data;
}

// ========== Handler ==========

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '仅支持 POST 请求' });
  }

  try {
    const { style, size, qty, name, contact, note, time } = req.body || {};

    // 验证必填字段
    if (!style) {
      return res.status(400).json({ ok: false, error: '请选择款式' });
    }
    if (!size) {
      return res.status(400).json({ ok: false, error: '请选择码数' });
    }
    if (!name || !contact) {
      return res.status(400).json({ ok: false, error: '请填写姓名和联系方式' });
    }

    // 获取 token
    const token = await getTenantToken();

    // 构造飞书记录
    const styleName = STYLE_MAP[style] || style;

    await createRecord(token, {
      款式: styleName,
      码数: size,
      数量: parseInt(qty) || 1,
      姓名: name,
      联系方式: contact,
      特殊要求: note || '',
      提交时间: time || new Date().toLocaleString('zh-CN', { hour12: false }),
      状态: '待处理',
    });

    return res.status(200).json({ ok: true, message: '排单成功！' });
  } catch (err) {
    console.error('提交排单失败:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
