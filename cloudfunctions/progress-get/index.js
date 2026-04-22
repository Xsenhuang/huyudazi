/**
 * 云函数：progress-get
 * 用途：获取用户在某场景下的学习进度（MVP：当前关卡 + 错题集）
 */

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 获取或初始化进度文档。
 * @param {string} openid 用户 openid
 * @param {string} sceneId 场景ID
 */
async function getOrInit(openid, sceneId) {
  const id = `${openid}_${sceneId}`;
  try {
    const res = await db.collection("user_progress").doc(id).get();
    return res.data;
  } catch (e) {
    // 不存在则创建
    const initDoc = {
      openid,
      sceneId,
      currentLevelId: null,
      wrongSentenceIds: [],
      mastery: {},
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };
    await db.collection("user_progress").doc(id).set({ data: initDoc });
    return { _id: id, ...initDoc };
  }
}

/**
 * 获取用户进度。
 * @param {{sceneId: string}} event 入参
 */
exports.main = async (event) => {
  const { sceneId } = event || {};
  if (!sceneId) throw new Error("sceneId 不能为空");

  const { OPENID } = cloud.getWXContext();
  const doc = await getOrInit(OPENID, sceneId);
  
  const { openid: _, ...rest } = doc;
  return rest;
};
