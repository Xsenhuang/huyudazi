/**
 * 云函数：import-content
 * 用途：读取同目录的 content_waimai_menjin_v1.jsonl，并按 collection + _id 批量 upsert 到云数据库。
 *
 * 使用方式：
 * 1) 将本目录放入你的云开发项目 cloudfunctions/import-content
 * 2) 部署云函数
 * 3) 调用云函数（无需参数）完成导入
 *
 * 说明：
 * - 该云函数默认使用“覆盖式 upsert”：同 _id 会被 set 覆盖（用于内容迭代）。
 * - 仅用于初始化/运维导入；不建议暴露给普通用户调用。
 */

const cloud = require("wx-server-sdk");
const fs = require("fs");
const path = require("path");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 读取 JSONL 文件为对象数组。
 * @param {string} filePath JSONL 文件路径
 * @returns {Array<{collection: string, doc: any}>} 记录数组
 */
function readJsonl(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

/**
 * 将 records 按 collection 分组。
 * @param {Array<{collection: string, doc: any}>} records 记录数组
 * @returns {Record<string, any[]>} { collectionName: docs[] }
 */
function groupByCollection(records) {
  return records.reduce((acc, r) => {
    if (!acc[r.collection]) acc[r.collection] = [];
    acc[r.collection].push(r.doc);
    return acc;
  }, {});
}

/**
 * 对某个 collection 执行 upsert（doc._id 必填）。
 * @param {import('wx-server-sdk').Database} db 数据库实例
 * @param {string} collectionName collection 名称
 * @param {any[]} docs 文档数组
 * @returns {Promise<{collection: string, success: number, failed: number, errors: any[]}>} 执行结果
 */
async function upsertCollection(db, collectionName, docs) {
  const errors = [];
  let success = 0;
  let failed = 0;

  // 云开发单次并发/批量有上限，这里简单串行（内容量不大，稳定优先）
  for (const doc of docs) {
    try {
      const { _id, ...data } = doc;
      if (!_id) throw new Error("缺少 _id");

      await db.collection(collectionName).doc(_id).set({ data });
      success += 1;
    } catch (e) {
      failed += 1;
      errors.push({ collection: collectionName, docId: doc && doc._id, error: String(e) });
    }
  }

  return { collection: collectionName, success, failed, errors };
}

exports.main = async () => {
  const db = cloud.database();

  const dataFile = path.join(__dirname, "content_waimai_menjin_v1.jsonl");
  const records = readJsonl(dataFile);
  const grouped = groupByCollection(records);

  const results = [];
  for (const collectionName of Object.keys(grouped)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await upsertCollection(db, collectionName, grouped[collectionName]);
    results.push(r);
  }

  const summary = results.reduce(
    (acc, r) => {
      acc.success += r.success;
      acc.failed += r.failed;
      return acc;
    },
    { success: 0, failed: 0 }
  );

  return {
    ok: summary.failed === 0,
    summary,
    results,
  };
};

