import { ensureCloudInitialized } from './utils/cloud';

/**
 * 小程序入口。
 */
App({
  /**
   * 小程序启动时初始化云开发。
   * @function onLaunch
   */
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持 wx.cloud，请升级微信基础库版本');
    } else {
      try {
        ensureCloudInitialized();
      } catch (e) {
        console.error('云开发初始化失败', e);
      }
    }
  },
});
