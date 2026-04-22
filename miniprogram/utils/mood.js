import { MOOD_QUOTES, STORAGE_KEYS } from './constants';

/**
 * @description 获取当前日期的格式化字符串（用于校验是否跨天）
 * @returns {string} 格式为 "YYYY-MM-DD" 的日期字符串
 */
export function getCurrentDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * @description 从数组中随机取一项（均匀分布纯函数）
 * @param {string[]} list 文案数组
 * @returns {string} 随机文案；当数组为空时返回空字符串
 */
export function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

/**
 * @description 数据管理层抽象：获取今日心情签文案（处理缓存与数据一致性）
 * @returns {string} 今日专属文案
 */
export function getDailyMoodText() {
  const todayStr = getCurrentDateString();
  const cachedData = wx.getStorageSync(STORAGE_KEYS.DAILY_MOOD);

  // 状态管理：如果缓存存在，且缓存的日期就是今天，则直接返回缓存的文案，保持数据一致
  if (cachedData && cachedData.date === todayStr) {
    return cachedData.text;
  }

  // 如果跨天了或没有缓存，则重新随机抽取一条
  const newText = pickRandom(MOOD_QUOTES);

  // 更新本地缓存，记录当前日期和选中的文案
  wx.setStorageSync(STORAGE_KEYS.DAILY_MOOD, {
    date: todayStr,
    text: newText
  });

  return newText;
}

/**
 * @description 强制刷新心情签（突破今日限制并更新缓存）
 * @returns {string} 新的心情签文案
 */
export function forceRefreshMoodText() {
  const newText = pickRandom(MOOD_QUOTES);
  
  // 强制更新缓存，防止用户手动换了一条后，下次进页面又变回老的那条
  wx.setStorageSync(STORAGE_KEYS.DAILY_MOOD, {
    date: getCurrentDateString(),
    text: newText
  });

  return newText;
}
