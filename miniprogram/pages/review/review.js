import { audioService } from '../../utils/audioService';
import { VoiceAPI } from '../../utils/voiceApi';
import { getProgress, SCENE_MASTERY } from '../../utils/store';
import { REVIEW_SESSION } from '../../constants/index';
import { buildReviewSession, forceTodayDecksDueNow, getReviewDashboard, ensureReviewDecksForScene, settleReviewSession } from '../../utils/reviewSrs';

function formatNextAtText(nextAt) {
  if (!nextAt) return '—';
  const d = new Date(nextAt);
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  return `${m}月${dd}日`;
}

function formatTimeLeft(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

Page({
  data: {
    view: 'dashboard',
    targetSeconds: REVIEW_SESSION.TARGET_SECONDS,
    dashboard: {
      dueCount: 0,
      dueDecks: [],
      nextAt: null,
      stats: { streak: 0, exp: 0, winCount: 0 },
      vocabCount: 0,
      listeningCount: 0,
      speakingCount: 0,
      dialogueCount: 0
    },
    nextAtText: '—',
    session: null,
    currentIndex: 0,
    timeLeft: 0,
    timeLeftText: '0:00',
    selectedOption: null,
    isCorrect: false,
    hasAnswered: false,
    isLastCard: false,
    results: [],
    settlement: null,
    correctRate: 0,
    isPlaying: false,
    customNavStyle: '',
    customNavLogoStyle: '',
    contentStyle: ''
  },

  timer: null,

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.syncCompletedScenesToDecks();
    forceTodayDecksDueNow();
    this.refreshDashboard();
    this.updateCustomNavLayout();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.clearSessionTimer();
    audioService.stop();
  },

  /**
   * 计算并更新自定义导航栏布局
   */
  updateCustomNavLayout() {
    const systemInfo = wx.getSystemInfoSync();
    const menuRect = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = menuRect.bottom + (menuRect.top - statusBarHeight);
    const logoSize = 36;
    const logoTop = menuRect.bottom - logoSize;

    this.setData({
      customNavStyle: `height:${navBarHeight}px;padding-top:${statusBarHeight}px;`,
      customNavLogoStyle: `width:${logoSize}px;height:${logoSize}px;top:${logoTop}px;`,
      contentStyle: `padding-top:${navBarHeight}px;`
    });
  },

  /**
   * 将已通关场景同步为复习卡组
   */
  syncCompletedScenesToDecks() {
    const progress = getProgress();
    const mastery = progress && progress.mastery ? progress.mastery : {};
    Object.keys(mastery).forEach(sceneIdStr => {
      const sceneId = parseInt(sceneIdStr, 10);
      if (!sceneId) return;
      if (mastery[sceneId] !== SCENE_MASTERY.L0) {
        ensureReviewDecksForScene(sceneId);
      }
    });
  },

  /**
   * 刷新仪表盘数据
   */
  refreshDashboard() {
    const dashboard = getReviewDashboard();
    this.setData({
      dashboard,
      nextAtText: formatNextAtText(dashboard.nextAt)
    });
  },

  /**
   * 开始复习会话
   */
  startReviewSession() {
    const session = buildReviewSession({
      targetSeconds: this.data.targetSeconds,
      maxCards: REVIEW_SESSION.MAX_CARDS
    });

    if (!session.cards || session.cards.length === 0) {
      wx.showToast({ title: '暂无待复习内容', icon: 'none' });
      return;
    }

    this.setData({
      view: 'session',
      session,
      currentIndex: 0,
      timeLeft: session.targetSeconds,
      timeLeftText: formatTimeLeft(session.targetSeconds),
      selectedOption: null,
      isCorrect: false,
      hasAnswered: false,
      isLastCard: session.cards.length === 1,
      results: []
    });

    this.startSessionTimer();
    this.playCurrentAudio();
  },

  /**
   * 启动会话计时器
   */
  startSessionTimer() {
    this.clearSessionTimer();
    this.timer = setInterval(() => {
      const newTimeLeft = this.data.timeLeft - 1;
      if (newTimeLeft <= 0) {
        this.clearSessionTimer();
        this.finishSession();
      } else {
        this.setData({
          timeLeft: newTimeLeft,
          timeLeftText: formatTimeLeft(newTimeLeft)
        });
      }
    }, 1000);
  },

  /**
   * 清除会话计时器
   */
  clearSessionTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  /**
   * 播放当前卡片音频
   */
  playCurrentAudio() {
    const { session, currentIndex } = this.data;
    if (!session || !session.cards[currentIndex]) return;

    const card = session.cards[currentIndex];
    let textToPlay = '';

    if (card.type === 'listening') {
      textToPlay = card.audioText;
    } else if (card.type === 'production' && card.correctText) {
      textToPlay = card.correctText;
    }

    if (!textToPlay) return;

    this.setData({ isPlaying: true });

    audioService.stop();
    VoiceAPI.textToSpeech({
      text: textToPlay,
      voiceId: null,
      onSuccess: (res) => {
        if (res && res.audioUrl) {
          audioService.play(res.audioUrl, () => {
            this.setData({ isPlaying: false });
          });
        } else {
          this.setData({ isPlaying: false });
        }
      },
      onError: () => {
        this.setData({ isPlaying: false });
        wx.showToast({ title: '音频播放失败', icon: 'none' });
      }
    });
  },

  /**
   * 重新播放音频
   */
  replayAudio() {
    this.playCurrentAudio();
  },

  /**
   * 处理选项选择
   */
  handleSelectOption(e) {
    if (this.data.hasAnswered) return;

    const index = e.currentTarget.dataset.index;
    const { session, currentIndex } = this.data;
    const card = session.cards[currentIndex];

    const isCorrect = index === card.answerIndex;
    const isLastCard = currentIndex === session.cards.length - 1;

    const result = {
      deckKey: card.deckKey,
      cardId: card.id,
      correct: isCorrect
    };

    this.setData({
      selectedOption: index,
      isCorrect,
      hasAnswered: true,
      isLastCard,
      results: [...this.data.results, result]
    });

    if (isCorrect) {
      audioService.playCorrectSound && audioService.playCorrectSound();
    } else {
      audioService.playWrongSound && audioService.playWrongSound();
    }
  },

  /**
   * 下一题
   */
  nextCard() {
    const { session, currentIndex } = this.data;

    if (currentIndex >= session.cards.length - 1) {
      this.finishSession();
    } else {
      const newIndex = currentIndex + 1;
      this.setData({
        currentIndex: newIndex,
        selectedOption: null,
        isCorrect: false,
        hasAnswered: false,
        isLastCard: newIndex === session.cards.length - 1
      });
      this.playCurrentAudio();
    }
  },

  /**
   * 完成会话
   */
  finishSession() {
    this.clearSessionTimer();
    audioService.stop();

    const settlement = settleReviewSession({
      sessionId: this.data.session.id,
      results: this.data.results
    });

    const correctRate = settlement.total > 0
      ? Math.round((settlement.totalCorrect / settlement.total) * 100)
      : 0;

    this.setData({
      view: 'result',
      settlement,
      correctRate
    });

    this.refreshDashboard();
  },

  /**
   * 退出会话
   */
  exitSession() {
    wx.showModal({
      title: '确认退出',
      content: '退出后当前进度将不会保存',
      success: (res) => {
        if (res.confirm) {
          this.clearSessionTimer();
          audioService.stop();
          this.setData({ view: 'dashboard' });
        }
      }
    });
  },

  /**
   * 返回仪表盘
   */
  backToDashboard() {
    this.setData({ view: 'dashboard' });
  }
});
