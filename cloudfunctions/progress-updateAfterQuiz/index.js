/**
 * 云函数：progress-updateAfterQuiz
 * 用途：提交小测结果，更新用户进度（当前关卡 + 错题集 + 熟练度）
 */

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 合并去重数组。
 * @param {string[]} a 原数组
 * @param {string[]} b 新数组
 */
function union(a = [], b = []) {
  return Array.from(new Set([...(a || []), ...(b || [])]));
}

/**
 * 更新进度文档（不存在则创建）。
 * @param {string} openid 用户 openid
 * @param {string} sceneId 场景ID
 * @param {object} patch 要更新的数据
 */
async function upsertProgress(openid, sceneId, patch) {
  const id = `${openid}_${sceneId}`;
  try {
    await db.collection("user_progress").doc(id).update({ data: patch });
  } catch (e) {
    const initDoc = {
      _id: id,
      openid,
      sceneId,
      currentLevelId: null,
      wrongSentenceIds: [],
      mastery: {},
      updatedAt: Date.now(),
      createdAt: Date.now(),
      ...patch,
    };
    await db.collection("user_progress").doc(id).set({ data: initDoc });
  }
}

/**
 * 提交并更新进度。
 * @param {{sceneId: string, levelId: string, quizId: string, score: number, wrongSentenceIds: string[]}} event 入参
 */
exports.main = async (event) => {
  const { sceneId, levelId, wrongSentenceIds = [], score = 0 } = event || {};
  if (!sceneId || !levelId) throw new Error("sceneId/levelId 不能为空");

  const { openid } = cloud.getWXContext();
  const id = `${openid}_${sceneId}`;

  // 读取旧进度以合并错题
  let old = null;
  try {
    old = (await db.collection("user_progress").doc(id).get()).data;
  } catch (e) {
    old = null;
  }

  const nextWrong = union(old?.wrongSentenceIds || [], wrongSentenceIds);

  // 简易熟练度：做对一次 +1，做错不减（MVP 先这样，避免挫败）
  const mastery = { ...(old?.mastery || {}) };
  // 没有题目明细时，只能粗略：score>0 则对当前关卡救命句加分（后续可按题目粒度计算）
  if (score > 0) {
    // 仅示例，不做复杂映射
  }

  await upsertProgress(openid, sceneId, {
    currentLevelId: levelId,
    wrongSentenceIds: nextWrong,
    mastery,
    updatedAt: Date.now(),
  });

  return { ok: true };
};

