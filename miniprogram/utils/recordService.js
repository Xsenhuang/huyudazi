import { RECORD_CONFIG } from '../constants/voice';

/**
 * 全局录音服务
 * @description 封装 wx.getRecorderManager，处理权限及录音生命周期
 */
class RecordService {
  constructor() {
    this.recorder = wx.getRecorderManager();
    this.onStopCb = null;
    this.isRecording = false;
    this.isStopping = false;

    this.recorder.onStop((res) => {
      // res.tempFilePath 为录音文件临时路径
      if (this.onStopCb) this.onStopCb(res);
      this.onStopCb = null;
      this.isRecording = false;
      this.isStopping = false;
    });
    
    this.recorder.onError((res) => {
        console.error('录音失败:', res.errMsg);
        if (this.onStopCb) this.onStopCb({ error: res.errMsg });
        this.onStopCb = null;
        this.isRecording = false;
        this.isStopping = false;
    });
  }

  /**
   * 检查并申请麦克风权限
   * @returns {Promise<Boolean>}
   */
  async checkAuth() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record']) {
            resolve(true);
          } else {
            wx.authorize({
              scope: 'scope.record',
              success: () => resolve(true),
              fail: () => resolve(false)
            });
          }
        },
        fail: () => resolve(false)
      });
    });
  }

  /**
   * 开始录音
   */
  start() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.isStopping = false;
    this.recorder.start(RECORD_CONFIG);
  }

  /**
   * 结束录音
   * @param {Function} callback - 录音完成后的回调，返回 tempFilePath 或 error
   */
  stop(callback) {
    if (!this.isRecording) {
      if (callback) callback({ error: 'NOT_RECORDING' });
      return;
    }
    if (this.isStopping) return;
    this.isStopping = true;
    this.onStopCb = callback || null;
    this.recorder.stop();
  }

  /**
   * 页面离开/切后台时兜底停止录音（不覆盖已有 stop 回调）
   */
  stopSilently() {
    if (!this.isRecording) return;
    if (this.isStopping) return;
    this.isStopping = true;
    this.recorder.stop();
  }
}

export const recordService = new RecordService();
