import { 
  MOOD_QUOTES, 
  CATEGORY_LIST, 
  CATEGORY_12_SCENES,
  CATEGORY_1_SCENES,
  CATEGORY_2_SCENES,
  CATEGORY_3_SCENES,
  CATEGORY_4_SCENES,
  CATEGORY_5_SCENES,
  CATEGORY_6_SCENES,
  CATEGORY_7_SCENES,
  CATEGORY_8_SCENES,
  CATEGORY_9_SCENES,
  CATEGORY_10_SCENES,
  CATEGORY_11_SCENES
} from '../constants/index';

const STORAGE_KEY_PROGRESS = 'shanghai_roam_progress';
const ALL_CATEGORY_IDS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const SCENES_BY_CATEGORY = {
  12: CATEGORY_12_SCENES,
  1: CATEGORY_1_SCENES,
  2: CATEGORY_2_SCENES,
  3: CATEGORY_3_SCENES,
  4: CATEGORY_4_SCENES,
  5: CATEGORY_5_SCENES,
  6: CATEGORY_6_SCENES,
  7: CATEGORY_7_SCENES,
  8: CATEGORY_8_SCENES,
  9: CATEGORY_9_SCENES,
  10: CATEGORY_10_SCENES,
  11: CATEGORY_11_SCENES
};

/**
 * 场景状态枚举常量 (兼容旧版和新版)
 */
export const SCENE_MASTERY = {
  L0: 'L0', // 未学
  L1: 'L1', // 听懂、跟得上
  L2: 'L2', // 说得出、用得上
  L3: 'L3'  // 能应变、能实战
};

/**
 * 获取当前用户的进度数据
 * @returns {Object} { mastery: Object, collectedCount: Number, lastVisitedLevel: Object }
 */
export function getProgress() {
  try {
    const progress = wx.getStorageSync(STORAGE_KEY_PROGRESS);
    if (progress && typeof progress === 'object') {
      return {
        mastery: progress.mastery || {},
        collectedCount: progress.collectedCount || 0,
        lastVisitedLevel: progress.lastVisitedLevel || {}
      };
    }
  } catch (e) {
    console.error('获取进度失败', e);
  }
  
  // 默认初始进度
  return {
    mastery: {}, // { sceneId: 'L1' | 'L2' | 'L3' }
    collectedCount: 0,  // 已收集数量
    lastVisitedLevel: {} // { sceneId: '/pages/.../...' }
  };
}

/**
 * 更新某个场景的掌握度
 * @param {Number} sceneId 场景 ID
 * @param {String} level 新的掌握度 ('L1', 'L2', 'L3')
 * @returns {Object} 更新后的进度
 */
export function updateSceneProgress(sceneId, level) {
  const currentProgress = getProgress();
  const currentLevel = currentProgress.mastery[sceneId] || SCENE_MASTERY.L0;
  
  // 简单的等级比较逻辑 L0 < L1 < L2 < L3
  const levelValue = { 'L0': 0, 'L1': 1, 'L2': 2, 'L3': 3 };
  
  if (levelValue[level] > levelValue[currentLevel]) {
    currentProgress.mastery[sceneId] = level;
    
    // 如果达到了L3，算作完成一个收集品
    if (level === 'L3' && currentLevel !== 'L3') {
      currentProgress.collectedCount += 1;
    }
    
    try {
      wx.setStorageSync(STORAGE_KEY_PROGRESS, currentProgress);
    } catch (e) {
      console.error('保存进度失败', e);
    }
  }
  
  return currentProgress;
}

/**
 * 获取指定场景的掌握度
 * @param {Number} sceneId 场景 ID
 * @returns {String} SCENE_MASTERY 枚举值
 */
export function getSceneMastery(sceneId) {
  const { mastery } = getProgress();
  return mastery[sceneId] || SCENE_MASTERY.L0;
}

/**
 * 获取经过状态加工的大类列表数据
 * @returns {Array} 包含状态的大类列表
 */
export function getCategoriesWithProgress() {
  const { mastery } = getProgress();
  // 未来可以加入进度百分比计算，目前只返回列表
  return CATEGORY_LIST;
}

/**
 * 根据大类ID获取该类下的小场景列表，并包含掌握度状态
 * @param {Number} categoryId 
 * @returns {Array} 场景列表
 */
export function getScenesByCategory(categoryId) {
  const scenes = SCENES_BY_CATEGORY[categoryId] || [];
  
  const { mastery } = getProgress();
  return scenes.map(scene => ({
    ...scene,
    mastery: mastery[scene.id] || SCENE_MASTERY.L0
  }));
}

/**
 * 根据场景ID全局查找场景
 * @param {Number} sceneId 
 * @returns {Object|null} 场景对象
 */
export function getSceneById(sceneId) {
  for (let catId of ALL_CATEGORY_IDS) {
    const scenes = SCENES_BY_CATEGORY[catId] || [];
    const found = scenes.find(s => s.id === sceneId);
    if (found) {
      return found;
    }
  }
  
  // 如果没有找到场景，返回 null
  return null;
}

function getScenePosition(sceneId) {
  for (let catId of ALL_CATEGORY_IDS) {
    const scenes = SCENES_BY_CATEGORY[catId] || [];
    const index = scenes.findIndex(s => s.id === sceneId);
    if (index !== -1) {
      return { categoryId: catId, index, scenes, scene: scenes[index] };
    }
  }
  return null;
}

function isPlayableScene(scene) {
  return !!(
    scene &&
    scene.level1_listening &&
    Array.isArray(scene.level1_listening.questions) &&
    scene.level1_listening.questions.length > 0
  );
}

export function getNextPlayableScene(sceneId) {
  const pos = getScenePosition(sceneId);
  if (!pos) return null;

  for (let i = pos.index + 1; i < pos.scenes.length; i += 1) {
    const next = pos.scenes[i];
    if (isPlayableScene(next)) return next;
  }

  return null;
}

/**
 * 重置进度（用于测试或重新开始）
 */
export function resetProgress() {
  try {
    wx.removeStorageSync(STORAGE_KEY_PROGRESS);
  } catch (e) {
    console.error('重置进度失败', e);
  }
}

/**
 * 保存用户在某场景下的最后浏览页面（用于中途退出后恢复）
 * @param {Number} sceneId 
 * @param {String} pagePath 
 */
export function saveLastVisitedLevel(sceneId, pagePath) {
  const currentProgress = getProgress();
  if (!currentProgress.lastVisitedLevel) {
    currentProgress.lastVisitedLevel = {};
  }
  currentProgress.lastVisitedLevel[sceneId] = pagePath;
  
  try {
    wx.setStorageSync(STORAGE_KEY_PROGRESS, currentProgress);
  } catch (e) {
    console.error('保存最后浏览页面失败', e);
  }
}

/**
 * 获取用户在某场景下的最后浏览页面
 * @param {Number} sceneId 
 * @returns {String|null}
 */
export function getLastVisitedLevel(sceneId) {
  const currentProgress = getProgress();
  return (currentProgress.lastVisitedLevel && currentProgress.lastVisitedLevel[sceneId]) || null;
}

/**
 * 清除用户在某场景下的最后浏览页面（当场景完成时）
 * @param {Number} sceneId 
 */
export function clearLastVisitedLevel(sceneId) {
  const currentProgress = getProgress();
  if (currentProgress.lastVisitedLevel && currentProgress.lastVisitedLevel[sceneId]) {
    delete currentProgress.lastVisitedLevel[sceneId];
    try {
      wx.setStorageSync(STORAGE_KEY_PROGRESS, currentProgress);
    } catch (e) {
      console.error('清除最后浏览页面失败', e);
    }
  }
}

/**
 * 获取随机“今日心情签”
 * @returns {String} 心情签文案
 */
export function getRandomMoodQuote() {
  const randomIndex = Math.floor(Math.random() * MOOD_QUOTES.length);
  return MOOD_QUOTES[randomIndex];
}
