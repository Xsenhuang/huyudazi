/**
 * 云函数：content-getScene
 * 用途：获取场景 + 关卡列表（按 order 排序）
 */

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 获取场景与关卡列表。
 * @param {{sceneId: string}} event 入参
 */
exports.main = async (event) => {
  const { sceneId } = event || {};
  if (!sceneId) throw new Error("sceneId 不能为空");

  const sceneDoc = await db.collection("scenes").doc(sceneId).get();
  const levelsRes = await db
    .collection("levels")
    .where({ sceneId })
    .orderBy("order", "asc")
    .get();

  return {
    scene: sceneDoc.data,
    levels: levelsRes.data.map((l) => ({ _id: l._id, order: l.order, title: l.title })),
  };
};

