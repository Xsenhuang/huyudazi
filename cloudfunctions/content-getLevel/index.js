/**
 * 云函数：content-getLevel
 * 用途：获取关卡学习页所需数据（救命句 + 对话 + 小测概要 + 明日任务）
 */

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 批量获取句子。
 * @param {string[]} ids sentenceId 列表
 */
async function getSentences(ids) {
  if (!ids || ids.length === 0) return [];
  const res = await db
    .collection("sentences")
    .where({ _id: _.in(ids) })
    .get();
  const map = new Map(res.data.map((d) => [d._id, d]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

/**
 * 获取关卡内容。
 * @param {{levelId: string}} event 入参
 */
exports.main = async (event) => {
  const { levelId } = event || {};
  if (!levelId) throw new Error("levelId 不能为空");

  const levelDoc = await db.collection("levels").doc(levelId).get();
  const level = levelDoc.data;

  const lifesavers = await getSentences(level.lifesaverSentenceIds || []);

  // 对话：按 _id 批量获取
  const dialogueIds = level.dialogueIds || [];
  let dialogues = [];
  if (dialogueIds.length) {
    const dRes = await db.collection("dialogues").where({ _id: _.in(dialogueIds) }).get();
    const dMap = new Map(dRes.data.map((d) => [d._id, d]));
    dialogues = dialogueIds.map((id) => dMap.get(id)).filter(Boolean);
  }

  // 小测：只返回概要（标题+id）
  let quiz = null;
  if (level.quizId) {
    const qDoc = await db.collection("quizzes").doc(level.quizId).get();
    quiz = { _id: qDoc.data._id, title: qDoc.data.title };
  }

  return { level, lifesavers, dialogues, quiz };
};

