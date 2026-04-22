import { VOICE_STATUS } from '../constants/voice';

/**
 * 全局音频播放服务
 * @description 封装 wx.createInnerAudioContext，确保全局只有一个声音在播放（状态一致性）
 */
class AudioService {
  constructor() {
    this.audioCtx = wx.createInnerAudioContext();
    this.audioCtx.obeyMuteSwitch = false; // 即使在静音模式下也播放
    this.onPlayCb = null;
    this.onStopCb = null;
    
    this._initListeners();
  }

  _initListeners() {
    this.audioCtx.onEnded(() => {
      if (this.onStopCb) this.onStopCb();
      this.onStopCb = null;
    });
    this.audioCtx.onError((res) => {
      console.error('播放音频失败:', res.errMsg);
      if (this.onStopCb) this.onStopCb(res.errMsg);
      this.onStopCb = null;
    });
    this.audioCtx.onStop(() => {
        if (this.onStopCb) this.onStopCb();
        this.onStopCb = null;
    });
  }

  /**
   * 播放音频
   * @param {String} url - 音频网络地址或本地临时路径
   * @param {Function} onPlay - 开始播放回调
   * @param {Function} onStop - 停止/结束播放回调
   */
  play(url, onPlay, onStop) {
    this.stop(); // 播放新音频前，先停止旧的
    this.onPlayCb = onPlay;
    this.onStopCb = onStop;
    
    this.audioCtx.src = url;
    this.audioCtx.play();
    if (this.onPlayCb) this.onPlayCb();
  }

  stop() {
    this.audioCtx.stop();
  }
}

export const audioService = new AudioService();
