import { audioService } from '../../utils/audioService';
import { getSceneById, saveLastVisitedLevel } from '../../utils/store';
import { VoiceAPI } from '../../utils/voiceApi';
import { MINIMAX_VOICE_ID } from '../../constants/voice';
import { UI } from '../../constants/assets/index.js';

Page({
  data: {
    uiIcons: UI,
    scene: null,
    step: 'vocab',
    reviewQuestions: [],
    currentReviewIndex: 0,
    isPlaying: false
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
      this.setData({
        step: 'vocab',
      });
    } else {
      this.startLearningLevels();
    }
  },

  /**
   * 开始复习阶段
   */
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
      this.playReviewAudio();
    });
  },

  /**
   * 播放复习题语音
   */
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
      const audioUrl = await VoiceAPI.textToSpeech(q.word, MINIMAX_VOICE_ID.SHANGHAINESE_FEMALE, q.audio, q.pinyin, null, scene && scene.id);
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

  /**
   * 处理用户选项选择
   */
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
