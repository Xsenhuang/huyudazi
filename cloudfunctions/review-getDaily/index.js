/**
 * 云函数：review-getDaily
 * 用途：生成“今日复习包”（MVP：优先取错题句子）
 */

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 获取用户错题句子，并返回句子详情。
 * @param {{sceneId: string, limit?: number}} event 入参
 */
exports.main = async (event) => {
  const { sceneId, limit = 10 } = event || {};
  if (!sceneId) throw new Error("sceneId 不能为空");

  const { openid } = cloud.getWXContext();
  const id = `${openid}_${sceneId}`;

  let progress = null;
  try {
    progress = (await db.collection("user_progress").doc(id).get()).data;
  } catch (e) {
    progress = { wrongSentenceIds: [] };
  }

  const ids = (progress.wrongSentenceIds || []).slice(0, limit);
  if (!ids.length) return { sentences: [] };

  const res = await db.collection("sentences").where({ _id: _.in(ids) }).get();
  const map = new Map(res.data.map((d) => [d._id, d]));
  const sentences = ids.map((sid) => map.get(sid)).filter(Boolean);
  return { sentences };
};

