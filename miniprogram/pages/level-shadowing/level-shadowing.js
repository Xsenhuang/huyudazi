import { getSceneById, saveLastVisitedLevel } from '../../utils/store';
import { audioService } from '../../utils/audioService';
import { recordService } from '../../utils/recordService';
import { VoiceAPI } from '../../utils/voiceApi';
import { pickPinyinForToneDisplay, tokenizePinyinWithTone } from '../../utils/pinyinTone';
import { UI } from '../../constants/assets/index.js';

Page({
  data: {
    uiIcons: UI,
    sceneId: null,
    scene: null,
    currentSIndex: 0,
    sentences: [],
    currentPinyinTokens: [],
    isRecording: false,
    hasRecorded: false,
    userRecordPath: '',
    score: null,
    isFinished: false
  },

  onLoad(options) {
    const sceneId = parseInt(options.sceneId || 102, 10);
    const scene = getSceneById(sceneId);
    
    if (scene && scene.level2_shadowing) {
      saveLastVisitedLevel(sceneId, `/pages/level-shadowing/level-shadowing?sceneId=${sceneId}`);
      this.setData({
        sceneId,
        scene,
        sentences: scene.level2_shadowing.sentences
      }, () => {
        this.updateCurrentPinyinTokens();
      });
      // this.initRecordService(); // remove missing function
    } else {

      wx.showToast({ title: '该场景暂无跟读内容', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  updateCurrentPinyinTokens() {
    const { sentences, currentSIndex } = this.data;
    const s = sentences[currentSIndex];
    const pinyinForDisplay = pickPinyinForToneDisplay(s);
    this.setData({ currentPinyinTokens: tokenizePinyinWithTone(pinyinForDisplay) });
  },

  onHide() {
    this.cleanupMediaOnLeave();
  },

  onUnload() {
    this.cleanupMediaOnLeave();
  },

  /**
   * 页面离开时统一释放音频/录音资源，避免麦克风占用残留
   */
  cleanupMediaOnLeave() {
    audioService.stop();
    if (this.data.isRecording) {
      recordService.stopSilently();
      this.setData({ isRecording: false });
    }
  },

  /**
   * 播放当前跟读句子的语音
   */
  async playCurrentAudio() {
    const { sentences, currentSIndex } = this.data;
    const s = sentences[currentSIndex];
    if (s) {
      try {
        const { sceneId } = this.data;
        // 传递 s.id 以便能够按 ID 精准匹配跟读长句子
        const audioUrl = await VoiceAPI.textToSpeech(
          s.text,
          null,
          s.audio,
          s.pinyin,
          s.id,
          sceneId
        );
        audioService.play(
          audioUrl,
          () => {},
          (err) => {
            if (err) wx.showToast({ title: '播放失败', icon: 'none' });
          }
        );
      } catch (e) {
        if (e.message === 'AUDIO_NOT_CONFIGURED') {
          wx.showToast({ title: '暂无发音', icon: 'none' });
        } else {
          wx.showToast({ title: '语音获取失败', icon: 'none' });
        }
      }
    }
  },

  /**
   * 重播当前语音
   */
  replayAudio() {
    this.playCurrentAudio();
  },

  /**
   * 开始录音
   */
  async startRecord() {
    const hasAuth = await recordService.checkAuth();
    if (!hasAuth) {
      wx.showToast({ title: '需要麦克风权限', icon: 'none' });
      return;
    }

    this.setData({ isRecording: true, hasRecorded: false, userRecordPath: '' });
    recordService.start();
    wx.showToast({ title: '录音中...', icon: 'none', duration: 2000 });
  },

  /**
   * 停止录音并验证
   */
  stopRecord() {
    if (!this.data.isRecording) return;
    this.setData({ isRecording: false });

    recordService.stop((res) => {
      if (res && res.tempFilePath) {
        this.setData({ 
          hasRecorded: true, 
          userRecordPath: res.tempFilePath 
        });
        wx.showToast({ title: '录音完成', icon: 'success' });
      } else {
        wx.showToast({ title: '录音失败', icon: 'none' });
      }
    });
  },

  /**
   * 播放用户跟读的录音
   */
  playUserRecord() {
    const { userRecordPath } = this.data;
    if (userRecordPath) {
      audioService.play(userRecordPath, () => {
        // 播放结束的回调
      }, (err) => {
        if (err) wx.showToast({ title: '播放失败', icon: 'none' });
      });
    }
  },

  /**
   * 切换到下一句
   */
  nextSentence() {
    const { sentences, currentSIndex } = this.data;
    if (currentSIndex < sentences.length - 1) {
      this.setData({
        currentSIndex: currentSIndex + 1,
        hasRecorded: false,
        userRecordPath: ''
      }, () => {
        this.updateCurrentPinyinTokens();
        this.playCurrentAudio();
      });
    } else {
      this.setData({ isFinished: true });
    }
  },

  /**
   * 进入下一关
   */
  goNextLevel() {
    const { sceneId } = this.data;
    this.cleanupMediaOnLeave();
    wx.redirectTo({
      url: `/pages/level-practical/level-practical?sceneId=${sceneId}`
    });
  }
});
