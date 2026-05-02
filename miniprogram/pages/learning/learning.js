import { audioService } from '../../utils/audioService';
import { recordService } from '../../utils/recordService';
import { getSceneById, saveLastVisitedLevel } from '../../utils/store';
import { VoiceAPI } from '../../utils/voiceApi';
import { UI } from '../../constants/assets/index.js';

Page({
  data: {
    uiIcons: UI,
    scene: null,
    step: 'vocab',
    currentVocabIndex: 0,
    currentExamples: [],
    reviewQuestions: [],
    currentReviewIndex: 0,
    isPlaying: false,
    isRecording: false,
    hasRecorded: false,
    userRecordPath: '',
    vocabRecordMap: {},
    // 滑动相关
    cardOffsetX: 0,
    cardRotate: 0,
    touchStartX: 0,
    touchStartY: 0,
    isAnimating: false
  },

  onLoad(options) {
    const id = parseInt(options.id || 102, 10);
    const scene = getSceneById(id);
    
    if (scene) {
      saveLastVisitedLevel(id, `/pages/learning/learning?id=${id}`);
      this.setData({ scene }, () => {
        this.initScene();
      });
      
      wx.setNavigationBarTitle({
        title: scene.title
      });
    } else {
      wx.showToast({ title: '场景不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onUnload() {
    audioService.stop();
  },

  initScene() {
    const { scene } = this.data;
    const hasVocab = scene.vocabularies && scene.vocabularies.length > 0;
    
    if (hasVocab) {
      this.setData({ step: 'vocab' }, () => {
        this.setCurrentVocabIndex(0);
      });
    } else {
      this.startLearningLevels();
    }
  },

  /**
   * 根据词条对象提取例句列表（兼容 example 字符串 / examples 数组）
   * @param {Record<string, any>} vocab
   * @returns {string[]}
   */
  normalizeVocabExamples(vocab) {
    if (!vocab) return [];
    const list = Array.isArray(vocab.examples)
      ? vocab.examples
      : typeof vocab.example === 'string'
        ? [vocab.example]
        : [];
    return list.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
  },

  /**
   * 获取词条录音存储 key（同一场景内唯一）
   * @param {Record<string, any>} vocab
   * @param {number} index
   * @returns {string}
   */
  getVocabRecordKey(vocab, index) {
    const { scene } = this.data;
    const sceneId = scene && scene.id != null ? String(scene.id) : 'scene';
    const vocabId = vocab && vocab.id != null ? String(vocab.id) : '';
    const word = vocab && vocab.word ? String(vocab.word) : '';
    return `${sceneId}_${vocabId || word || String(index)}`;
  },

  /**
   * 获取指定词条的录音状态
   * @param {number} index
   * @returns {{hasRecorded: boolean, userRecordPath: string}}
   */
  getVocabRecordStateByIndex(index) {
    const { scene, vocabRecordMap } = this.data;
    const vocab = scene && scene.vocabularies ? scene.vocabularies[index] : null;
    const key = this.getVocabRecordKey(vocab, index);
    const record = (vocabRecordMap && vocabRecordMap[key]) || null;
    return {
      hasRecorded: Boolean(record && record.userRecordPath),
      userRecordPath: record && record.userRecordPath ? record.userRecordPath : ''
    };
  },

  /**
   * 切换当前词条，并同步派生 UI 状态
   * @param {number} nextIndex
   */
  setCurrentVocabIndex(nextIndex) {
    const { scene, isPlaying, isRecording } = this.data;
    const vocab = scene && scene.vocabularies ? scene.vocabularies[nextIndex] : null;
    const currentExamples = this.normalizeVocabExamples(vocab);
    const recordState = this.getVocabRecordStateByIndex(nextIndex);

    if (isPlaying) audioService.stop();
    if (isRecording) recordService.stopSilently();

    this.setData({
      currentVocabIndex: nextIndex,
      currentExamples,
      cardOffsetX: 0,
      cardRotate: 0,
      isPlaying: false,
      isRecording: false,
      hasRecorded: recordState.hasRecorded,
      userRecordPath: recordState.userRecordPath
    });
  },

  // --- 滑动相关方法 ---
  onTouchStart(e) {
    if (this.data.isAnimating) return;
    
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY
    });
  },

  onTouchMove(e) {
    if (this.data.isAnimating) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = touch.clientY - this.data.touchStartY;
    
    // 只有当水平滑动大于垂直滑动时才处理
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const rotate = deltaX * 0.05; // 旋转角度
      this.setData({
        cardOffsetX: deltaX,
        cardRotate: rotate
      });
    }
  },

  onTouchEnd(e) {
    if (this.data.isAnimating) return;
    
    const { cardOffsetX, currentVocabIndex, scene } = this.data;
    const threshold = 100; // 滑动阈值
    
    if (cardOffsetX > threshold && currentVocabIndex > 0) {
      // 向右滑动，回到上一个
      this.setData({ isAnimating: true });
      this.animateCard('right', () => {
        this.setCurrentVocabIndex(currentVocabIndex - 1);
        this.setData({ isAnimating: false });
      });
    } else if (cardOffsetX < -threshold && currentVocabIndex < scene.vocabularies.length - 1) {
      // 向左滑动，进入下一个
      this.setData({ isAnimating: true });
      this.animateCard('left', () => {
        this.setCurrentVocabIndex(currentVocabIndex + 1);
        this.setData({ isAnimating: false });
      });
    } else {
      // 回弹
      this.setData({
        cardOffsetX: 0,
        cardRotate: 0
      });
    }
  },

  animateCard(direction, callback) {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease'
    });
    
    if (direction === 'left') {
      animation.translateX(-500).rotate(-30).opacity(0).step();
    } else {
      animation.translateX(500).rotate(30).opacity(0).step();
    }
    
    this.setData({
      cardAnimation: animation.export()
    });
    
    setTimeout(callback, 300);
  },

  // --- 导航按钮 ---
  goPrev() {
    const { currentVocabIndex } = this.data;
    if (currentVocabIndex > 0) {
      this.setCurrentVocabIndex(currentVocabIndex - 1);
    }
  },

  goNext() {
    const { currentVocabIndex, scene } = this.data;

    if (currentVocabIndex < scene.vocabularies.length - 1) {
      // 不是最后一个，进入下一个
      this.setCurrentVocabIndex(currentVocabIndex + 1);
    } else {
      // 是最后一个，进入复习
      this.startReview();
    }
  },

  // --- 音频播放 ---
  async playCurrentAudio() {
    const { scene, currentVocabIndex, isPlaying } = this.data;
    const vocab = scene.vocabularies[currentVocabIndex];
    
    if (!vocab) return;
    
    if (isPlaying) {
      audioService.stop();
      this.setData({ isPlaying: false });
      return;
    }
    
    this.setData({ isPlaying: true });
    
    try {
      const audioUrl = await VoiceAPI.textToSpeech(
        vocab.word,
        null,
        vocab.audio,
        vocab.pinyin,
        null,
        scene.id
      );
      
      audioService.play(
        audioUrl,
        () => {},
        (err) => {
          this.setData({ isPlaying: false });
          if (err) wx.showToast({ title: '播放失败', icon: 'none' });
        }
      );
    } catch (error) {
      this.setData({ isPlaying: false });
      if (error.message === 'AUDIO_NOT_CONFIGURED') {
        wx.showToast({ title: '该词汇暂无发音', icon: 'none' });
      } else {
        wx.showToast({ title: '语音获取失败', icon: 'none' });
      }
    }
  },

  // --- 录音跟读 ---
  async startRecord() {
    const hasAuth = await recordService.checkAuth();
    if (!hasAuth) {
      wx.showToast({ title: '需要麦克风权限', icon: 'none' });
      return;
    }

    // 如果是重新录音，先清理之前的录音
    if (this.data.hasRecorded) {
      this.setData({ hasRecorded: false, userRecordPath: '' });
    }

    this.setData({ isRecording: true });
    recordService.start();
    wx.showToast({ title: '录音中...', icon: 'none', duration: 2000 });
  },

  stopRecord() {
    if (!this.data.isRecording) return;

    recordService.stop((res) => {
      if (res && res.tempFilePath) {
        const { scene, currentVocabIndex, vocabRecordMap } = this.data;
        const vocab = scene && scene.vocabularies ? scene.vocabularies[currentVocabIndex] : null;
        const key = this.getVocabRecordKey(vocab, currentVocabIndex);
        const nextMap = { ...(vocabRecordMap || {}) };
        nextMap[key] = { userRecordPath: res.tempFilePath };

        this.setData({
          isRecording: false,
          hasRecorded: true,
          userRecordPath: res.tempFilePath,
          vocabRecordMap: nextMap
        });
        wx.showToast({ title: '录音完成', icon: 'success' });
      } else {
        const recordState = this.getVocabRecordStateByIndex(this.data.currentVocabIndex);
        this.setData({
          isRecording: false,
          hasRecorded: recordState.hasRecorded,
          userRecordPath: recordState.userRecordPath
        });
        wx.showToast({ title: '录音失败', icon: 'none' });
      }
    });
  },

  // --- 播放用户录音 ---
  playUserRecord() {
    const { userRecordPath } = this.data;
    if (userRecordPath) {
      audioService.play(userRecordPath, () => {
        // 播放结束
      }, (err) => {
        if (err) wx.showToast({ title: '播放失败', icon: 'none' });
      });
    }
  },

  // --- 复习阶段 ---
  startReview() {
    const { scene } = this.data;
    const vocabs = scene.vocabularies;

    // 为每个词汇生成一道复习题
    const questions = vocabs.map((v, index) => {
      // 获取其他词汇作为干扰项
      let others = vocabs.filter((_, i) => i !== index);
      others = others.sort(() => Math.random() - 0.5);
      let distractors = others.slice(0, 3).map(o => o.mandarin);
      
      // 合并正确答案和干扰项并去重
      let options = [v.mandarin, ...distractors];
      options = [...new Set(options)];
      
      // 随机打乱选项
      options = options.sort(() => Math.random() - 0.5);
      
      return {
        word: v.word,
        pinyin: v.pinyin,
        audio: v.audio,
        correct: v.mandarin,
        options: options
      };
    });

    // 打乱题目顺序
    questions.sort(() => Math.random() - 0.5);

    this.setData({
      step: 'review',
      reviewQuestions: questions,
      currentReviewIndex: 0
    }, () => {
      wx.setNavigationBarTitle({
        title: '复习词汇'
      });
      this.playReviewAudio();
    });
  },

  async playReviewAudio() {
    const { reviewQuestions, currentReviewIndex } = this.data;
    const q = reviewQuestions[currentReviewIndex];
    if (!q) return;

    if (this.data.isPlaying) {
      audioService.stop();
    }

    this.setData({ isPlaying: true });

    try {
      const { scene } = this.data;
      const audioUrl = await VoiceAPI.textToSpeech(q.word, null, q.audio, q.pinyin, null, scene && scene.id);
      audioService.play(
        audioUrl,
        () => {},
        (err) => {
          this.setData({ isPlaying: false });
          if (err) wx.showToast({ title: '播放失败', icon: 'none' });
        }
      );
    } catch (error) {
      this.setData({ isPlaying: false });
      if (error.message === 'AUDIO_NOT_CONFIGURED') {
        wx.showToast({ title: '该词汇暂无发音', icon: 'none' });
      } else {
        wx.showToast({ title: '语音获取失败', icon: 'none' });
      }
    }
  },

  handleReviewSelect(e) {
    const { option } = e.currentTarget.dataset;
    const { reviewQuestions, currentReviewIndex } = this.data;
    const q = reviewQuestions[currentReviewIndex];

    if (option === q.correct) {
      wx.showToast({ title: '正确', icon: 'success', duration: 800 });
      setTimeout(() => {
        if (currentReviewIndex < reviewQuestions.length - 1) {
          this.setData({ currentReviewIndex: currentReviewIndex + 1 }, () => {
            this.playReviewAudio();
          });
        } else {
          // 复习完成，进入正式关卡
          this.startLearningLevels();
        }
      }, 800);
    } else {
      wx.showToast({ title: '再试一次', icon: 'error' });
    }
  },

  startLearningLevels() {
    const { scene } = this.data;
    // 进入真正的关卡流程，第一关：听力
    wx.redirectTo({
      url: `/pages/level-listening/level-listening?sceneId=${scene.id}`
    });
  }
});
