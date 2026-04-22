import { getSceneById, saveLastVisitedLevel } from '../../utils/store';
import { audioService } from '../../utils/audioService';
import { VoiceAPI } from '../../utils/voiceApi';
import { MINIMAX_VOICE_ID } from '../../constants/voice';
import { UI } from '../../constants/assets/index.js';

Page({
  data: {
    uiIcons: UI,
    sceneId: null,
    scene: null,
    currentQIndex: 0,
    questions: [],
    selectedOption: null,
    isCorrect: null
  },

  onLoad(options) {
    const sceneId = parseInt(options.sceneId || 102, 10);
    const scene = getSceneById(sceneId);
    
    if (scene && scene.level1_listening) {
      saveLastVisitedLevel(sceneId, `/pages/level-listening/level-listening?sceneId=${sceneId}`);
      this.setData({
        sceneId,
        scene,
        questions: scene.level1_listening.questions
      });
      this.playCurrentAudio();
    } else {
      wx.showToast({ title: '该场景暂无听力内容', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onUnload() {
    audioService.stop();
  },

  /**
   * 播放当前题目的语音
   */
  async playCurrentAudio() {
    const { questions, currentQIndex } = this.data;
    const q = questions[currentQIndex];
    if (q) {
      try {
        const { sceneId } = this.data;
        // 传递 q.id 以便能够按 ID 精准匹配听力长句子
        const audioUrl = await VoiceAPI.textToSpeech(
          q.audioText,
          MINIMAX_VOICE_ID.SHANGHAINESE_MALE,
          q.audio,
          q.pinyin,
          q.id,
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

  replayAudio() {
    this.playCurrentAudio();
  },

  handleSelect(e) {
    const { index } = e.currentTarget.dataset;
    const { questions, currentQIndex, selectedOption } = this.data;
    
    // 如果已经选择过了，不允许再次点击
    if (selectedOption !== null) return;
    
    const q = questions[currentQIndex];
    const isCorrect = (index === q.answerIndex);
    
    this.setData({
      selectedOption: index,
      isCorrect
    });
    
    if (isCorrect) {
      setTimeout(() => {
        this.nextQuestion();
      }, 1000);
    } else {
      wx.showToast({ title: '再试一次', icon: 'error' });
      setTimeout(() => {
        this.setData({
          selectedOption: null,
          isCorrect: null
        });
      }, 1000);
    }
  },

  nextQuestion() {
    const { questions, currentQIndex } = this.data;
    if (currentQIndex < questions.length - 1) {
      this.setData({
        currentQIndex: currentQIndex + 1,
        selectedOption: null,
        isCorrect: null
      }, () => {
        this.playCurrentAudio();
      });
    } else {
      this.finishListeningLevel();
    }
  },

  /**
   * 第一关（听懂）完成后，直接进入第二关（跟读），不展示完成页
   */
  finishListeningLevel() {
    const { sceneId } = this.data;
    audioService.stop();
    wx.showLoading({ title: '进入下一关...' });
    wx.redirectTo({
      url: `/pages/level-shadowing/level-shadowing?sceneId=${sceneId}`,
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  goNextLevel() {
    this.finishListeningLevel();
  }
});
