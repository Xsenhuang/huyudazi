let cloudInitialized = false;
let cloudInitError = null;

/**
 * 确保云开发已初始化（懒初始化，仅在需要调用云能力时执行）。
 * @returns {boolean}
 */
export function ensureCloudInitialized() {
  if (cloudInitialized) return true;
  if (cloudInitError) throw cloudInitError;

  if (!wx.cloud) {
    cloudInitError = new Error('当前基础库不支持 wx.cloud');
    throw cloudInitError;
  }

  try {
    wx.cloud.init({
      env: 'cloud1-1g0mgsc34984e5a0', // 强制指定你的环境ID
      traceUser: false,
    });
    cloudInitialized = true;
    return true;
  } catch (err) {
    cloudInitError = err;
    throw err;
  }
}

