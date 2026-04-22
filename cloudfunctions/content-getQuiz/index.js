/**
 * 云函数：content-getQuiz
 * 用途：获取小测题目集合（直接返回 quizzes 文档）
 */

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 获取小测题目。
 * @param {{quizId: string}} event 入参
 */
exports.main = async (event) => {
  const { quizId } = event || {};
  if (!quizId) throw new Error("quizId 不能为空");

  const qDoc = await db.collection("quizzes").doc(quizId).get();
  return { quiz: qDoc.data };
};

