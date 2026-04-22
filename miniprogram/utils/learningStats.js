const STORAGE_KEY_LEARNING_STATS = 'shanghai_roam_learning_stats_v1';
const STORAGE_VERSION = 1;

/**
 * 获取本地 yyyy-mm-dd（按用户本地时区）
 * @param {number | Date} [input]
 * @returns {string}
 */
export function formatLocalDate(input) {
  const d = input instanceof Date ? input : new Date(typeof input === 'number' ? input : Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 获取本地 yyyy-mm（按用户本地时区）
 * @param {number | Date} [input]
 * @returns {string}
 */
export function formatLocalMonth(input) {
  const d = input instanceof Date ? input : new Date(typeof input === 'number' ? input : Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * 将 yyyy-mm-dd 转为 Date（本地 00:00:00）
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr || '').split('-').map(n => parseInt(n, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * 获取某天所在周的周一（yyyy-mm-dd，按本地时区）
 * @param {string} dateStr yyyy-mm-dd
 * @returns {string}
 */
export function getWeekStartMonday(dateStr) {
  const d = parseLocalDate(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDay(); // 0=周日
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return formatLocalDate(d);
}

/**
 * 获取学习统计原始数据
 * @returns {{version:number, daily: Record<string, any>, completedScenes: Record<string, any>, badges: Record<string, any>}}
 */
export function getLearningStats() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY_LEARNING_STATS);
    if (raw && typeof raw === 'object' && raw.version === STORAGE_VERSION) {
      return {
        version: STORAGE_VERSION,
        daily: raw.daily || {},
        completedScenes: raw.completedScenes || {},
        badges: raw.badges || {}
      };
    }
  } catch (e) {
    console.error('获取学习统计失败', e);
  }

  return {
    version: STORAGE_VERSION,
    daily: {},
    completedScenes: {},
    badges: {}
  };
}

/**
 * 保存学习统计数据
 * @param {ReturnType<typeof getLearningStats>} stats
 */
export function saveLearningStats(stats) {
  try {
    wx.setStorageSync(STORAGE_KEY_LEARNING_STATS, stats);
  } catch (e) {
    console.error('保存学习统计失败', e);
  }
}

function ensureDayCounter(stats, dateStr) {
  if (!stats.daily[dateStr]) {
    stats.daily[dateStr] = {
      scenes: 0,
      vocab: 0,
      listening: 0,
      shadowing: 0,
      practical: 0
    };
  }
  return stats.daily[dateStr];
}

/**
 * 记录“首次通关一个场景”的学习量，并自动点亮徽章
 * @param {{sceneId:number, vocabCount:number, listeningCount:number, shadowingCount:number, practicalCount:number, completedAt?:number}} payload
 * @returns {{stats: ReturnType<typeof getLearningStats>, isFirstCompletion: boolean, date: string, dayCounter: any}}
 */
export function recordSceneCompletion(payload) {
  const sceneId = Number(payload && payload.sceneId);
  const completedAt = Number((payload && payload.completedAt) || Date.now());
  const date = formatLocalDate(completedAt);

  const stats = getLearningStats();
  const completedKey = String(sceneId);

  if (stats.completedScenes && stats.completedScenes[completedKey]) {
    const dayCounter = (stats.daily && stats.daily[date]) || {
      scenes: 0,
      vocab: 0,
      listening: 0,
      shadowing: 0,
      practical: 0
    };
    return { stats, isFirstCompletion: false, date, dayCounter };
  }

  const dayCounter = ensureDayCounter(stats, date);
  dayCounter.scenes += 1;
  dayCounter.vocab += Math.max(0, Number(payload && payload.vocabCount) || 0);
  dayCounter.listening += Math.max(0, Number(payload && payload.listeningCount) || 0);
  dayCounter.shadowing += Math.max(0, Number(payload && payload.shadowingCount) || 0);
  dayCounter.practical += Math.max(0, Number(payload && payload.practicalCount) || 0);

  if (!stats.completedScenes) stats.completedScenes = {};
  stats.completedScenes[completedKey] = { completedAt, date };

  if (!stats.badges) stats.badges = {};
  stats.badges[completedKey] = { unlockedAt: completedAt, date };

  saveLearningStats(stats);
  return { stats, isFirstCompletion: true, date, dayCounter };
}

function sumCounters(items) {
  return items.reduce((acc, item) => {
    acc.scenes += item.scenes || 0;
    acc.vocab += item.vocab || 0;
    acc.listening += item.listening || 0;
    acc.shadowing += item.shadowing || 0;
    acc.practical += item.practical || 0;
    return acc;
  }, { scenes: 0, vocab: 0, listening: 0, shadowing: 0, practical: 0 });
}

/**
 * 获取按天汇总（降序）
 * @param {{limit?: number}} [options]
 * @returns {Array<{key:string, label:string, scenes:number, vocab:number, listening:number, shadowing:number, practical:number}>}
 */
export function getDailySummaries(options) {
  const limit = Number(options && options.limit) || 90;
  const stats = getLearningStats();
  const dates = Object.keys(stats.daily || {}).sort((a, b) => (a < b ? 1 : -1));
  return dates.slice(0, limit).map(date => ({
    key: date,
    label: date,
    ...ensureDayCounter(stats, date)
  }));
}

/**
 * 获取按周汇总（周一为周起始，降序）
 * @param {{limit?: number}} [options]
 * @returns {Array<{key:string, label:string, scenes:number, vocab:number, listening:number, shadowing:number, practical:number}>}
 */
export function getWeeklySummaries(options) {
  const limit = Number(options && options.limit) || 26;
  const stats = getLearningStats();
  const byWeek = {};

  Object.keys(stats.daily || {}).forEach(date => {
    const weekStart = getWeekStartMonday(date);
    if (!weekStart) return;
    if (!byWeek[weekStart]) byWeek[weekStart] = [];
    byWeek[weekStart].push(stats.daily[date]);
  });

  const weekStarts = Object.keys(byWeek).sort((a, b) => (a < b ? 1 : -1));
  return weekStarts.slice(0, limit).map(weekStart => {
    const startDate = parseLocalDate(weekStart);
    const endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 6);
    const label = `${weekStart}~${formatLocalDate(endDate)}`;
    return { key: weekStart, label, ...sumCounters(byWeek[weekStart]) };
  });
}

/**
 * 获取按月汇总（降序）
 * @param {{limit?: number}} [options]
 * @returns {Array<{key:string, label:string, scenes:number, vocab:number, listening:number, shadowing:number, practical:number}>}
 */
export function getMonthlySummaries(options) {
  const limit = Number(options && options.limit) || 12;
  const stats = getLearningStats();
  const byMonth = {};

  Object.keys(stats.daily || {}).forEach(date => {
    const month = date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(stats.daily[date]);
  });

  const months = Object.keys(byMonth).sort((a, b) => (a < b ? 1 : -1));
  return months.slice(0, limit).map(month => ({
    key: month,
    label: month,
    ...sumCounters(byMonth[month])
  }));
}

/**
 * 获取徽章列表（按解锁时间降序）
 * @param {{limit?: number}} [options]
 * @returns {Array<{sceneId:number, unlockedAt:number, date:string}>}
 */
export function getUnlockedBadges(options) {
  const limit = Number(options && options.limit) || 9999;
  const stats = getLearningStats();
  const badges = stats.badges || {};
  const list = Object.keys(badges).map(k => ({
    sceneId: Number(k),
    unlockedAt: Number(badges[k] && badges[k].unlockedAt) || 0,
    date: String(badges[k] && badges[k].date) || ''
  }));
  list.sort((a, b) => b.unlockedAt - a.unlockedAt);
  return list.slice(0, limit);
}
