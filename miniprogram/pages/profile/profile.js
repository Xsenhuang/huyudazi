import { getSceneById, getProgress } from '../../utils/store';
import {
  getDailySummaries,
  getWeeklySummaries,
  getMonthlySummaries,
  getUnlockedBadges,
  recordSceneCompletion,
  getLearningStats,
  parseLocalDate,
  formatLocalDate,
  formatLocalMonth,
  getWeekStartMonday
} from '../../utils/learningStats';

Page({
  data: {
    mode: 'day',
    summaries: [],
    activeSummary: null,
    activeLabel: '',
    cursorDate: '',
    cursorMonth: '',
    isPrevDisabled: false,
    isNextDisabled: true,
    badgesTotal: 0,
    badgeList: [],
    customNavStyle: '',
    customNavLogoStyle: '',
    contentStyle: ''
  },

  /**
   * 生命周期函数--监听页面加载
   * 计算自定义导航栏尺寸，保证 Logo 与右上角胶囊垂直对齐
   */
  onLoad() {
    this.updateCustomNavLayout();
    this.initCursorToToday();
  },

  /**
   * 生命周期函数--监听页面显示
   * 用于更新自定义 TabBar 的选中状态，并刷新学习记录与徽章
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.syncCompletedScenesFromProgress();
    this.initCursorToToday();
    this.refresh();
  },

  /**
   * 初始化时间游标为“今天”
   * - 日/周：cursorDate = 今天
   * - 月：cursorMonth = 本月
   */
  initCursorToToday() {
    const todayDate = formatLocalDate(Date.now());
    const todayMonth = formatLocalMonth(Date.now());
    this.setData({
      cursorDate: todayDate,
      cursorMonth: todayMonth
    });
  },

  /**
   * 估算一个场景的实战对话句数（用于历史数据同步）
   * @param {any} scene
   * @returns {number}
   */
  estimatePracticalCount(scene) {
    const practical = scene && (scene.level3_practical || scene.level4_practical);
    const tree = practical && practical.dialogueTree;
    if (!Array.isArray(tree) || tree.length === 0) return 0;

    let npcCount = 0;
    let userCount = 0;
    tree.forEach(n => {
      if (!n) return;
      if (n.speakerType === 'NPC') npcCount += 1;
      if (n.speakerType === 'USER_OPTIONS') userCount += 1;
    });
    return npcCount + userCount;
  },

  /**
   * 将已通关（L3）的场景补写到学习记录与徽章中（幂等）
   */
  syncCompletedScenesFromProgress() {
    const progress = getProgress();
    const mastery = (progress && progress.mastery) || {};
    const completedSceneIds = Object.keys(mastery).filter(sceneId => mastery[sceneId] === 'L3');
    if (completedSceneIds.length === 0) return;

    let hasSynced = false;
    completedSceneIds.forEach(sceneIdStr => {
      const sceneId = Number(sceneIdStr);
      if (!sceneId) return;
      const scene = getSceneById(sceneId);
      const vocabCount = (scene && Array.isArray(scene.vocabularies)) ? scene.vocabularies.length : 0;
      const listeningCount = (scene && scene.level1_listening && Array.isArray(scene.level1_listening.questions))
        ? scene.level1_listening.questions.length
        : 0;
      const shadowingCount = (scene && scene.level2_shadowing && Array.isArray(scene.level2_shadowing.sentences))
        ? scene.level2_shadowing.sentences.length
        : 0;
      const practicalCount = this.estimatePracticalCount(scene);

      const res = recordSceneCompletion({
        sceneId,
        vocabCount,
        listeningCount,
        shadowingCount,
        practicalCount
      });
      if (res && res.isFirstCompletion) hasSynced = true;
    });

    if (hasSynced) {
      wx.showToast({ title: '已同步学习记录', icon: 'success' });
    }
  },

  /**
   * 切换统计维度（日/周/月）
   * @param {WechatMiniprogram.BaseEvent} e
   */
  handleModeChange(e) {
    const mode = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'day';
    if (mode === this.data.mode) return;
    this.setData({ mode }, () => {
      this.initCursorToToday();
      this.refreshSummaries();
    });
  },

  /**
   * 切换到更早的周期（左箭头）
   */
  handlePrevPeriod() {
    const { mode } = this.data;
    if (mode === 'month') {
      const base = parseLocalDate(`${this.data.cursorMonth}-01`);
      base.setMonth(base.getMonth() - 1, 1);
      const nextMonth = formatLocalMonth(base);
      this.setData({ cursorMonth: nextMonth }, () => this.syncActiveByCursor());
      return;
    }

    const base = parseLocalDate(this.data.cursorDate);
    if (Number.isNaN(base.getTime())) return;
    const step = mode === 'week' ? 7 : 1;
    base.setDate(base.getDate() - step);
    this.setData({ cursorDate: formatLocalDate(base) }, () => this.syncActiveByCursor());
  },

  /**
   * 切换到更新的周期（右箭头）
   */
  handleNextPeriod() {
    if (this.data.isNextDisabled) return;
    const { mode } = this.data;
    if (mode === 'month') {
      const base = parseLocalDate(`${this.data.cursorMonth}-01`);
      base.setMonth(base.getMonth() + 1, 1);
      const nextMonth = formatLocalMonth(base);
      this.setData({ cursorMonth: nextMonth }, () => this.syncActiveByCursor());
      return;
    }

    const base = parseLocalDate(this.data.cursorDate);
    if (Number.isNaN(base.getTime())) return;
    const step = mode === 'week' ? 7 : 1;
    base.setDate(base.getDate() + step);
    this.setData({ cursorDate: formatLocalDate(base) }, () => this.syncActiveByCursor());
  },

  /**
   * 刷新页面全部数据
   */
  refresh() {
    this.refreshSummaries();
    this.refreshBadges();
  },

  /**
   * 刷新学习记录列表
   */
  refreshSummaries() {
    const { mode } = this.data;
    const summaries = mode === 'week'
      ? getWeeklySummaries({ limit: 26 })
      : mode === 'month'
        ? getMonthlySummaries({ limit: 12 })
        : getDailySummaries({ limit: 90 });
    this.setData({ summaries }, () => this.syncActiveByCursor());
  },

  /**
   * 根据时间游标同步当前展示数据与箭头状态
   */
  syncActiveByCursor() {
    const { mode } = this.data;
    const today = parseLocalDate(formatLocalDate(Date.now()));
    const stats = getLearningStats();
    const zero = { scenes: 0, vocab: 0, listening: 0, shadowing: 0, practical: 0 };

    if (mode === 'month') {
      const cursorMonth = this.data.cursorMonth || formatLocalMonth(Date.now());
      const prefix = `${cursorMonth}-`;
      const days = (stats && stats.daily) || {};
      const sum = Object.keys(days).reduce((acc, key) => {
        if (!String(key).startsWith(prefix)) return acc;
        const c = days[key] || {};
        acc.scenes += c.scenes || 0;
        acc.vocab += c.vocab || 0;
        acc.listening += c.listening || 0;
        acc.shadowing += c.shadowing || 0;
        acc.practical += c.practical || 0;
        return acc;
      }, { ...zero });

      const isNextDisabled = cursorMonth === formatLocalMonth(Date.now());
      this.setData({
        activeSummary: sum,
        activeLabel: cursorMonth,
        isPrevDisabled: false,
        isNextDisabled
      });
      return;
    }

    const cursorDate = this.data.cursorDate || formatLocalDate(Date.now());
    const cursor = parseLocalDate(cursorDate);
    if (Number.isNaN(cursor.getTime())) return;

    if (mode === 'week') {
      const weekStart = getWeekStartMonday(cursorDate);
      const start = parseLocalDate(weekStart);
      const sum = { ...zero };
      const days = (stats && stats.daily) || {};
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(start.getTime());
        d.setDate(d.getDate() + i);
        const k = formatLocalDate(d);
        const c = days[k] || {};
        sum.scenes += c.scenes || 0;
        sum.vocab += c.vocab || 0;
        sum.listening += c.listening || 0;
        sum.shadowing += c.shadowing || 0;
        sum.practical += c.practical || 0;
      }

      const next = new Date(cursor.getTime());
      next.setDate(next.getDate() + 7);
      const isNextDisabled = next.getTime() > today.getTime();
      this.setData({
        activeSummary: sum,
        activeLabel: cursorDate,
        isPrevDisabled: false,
        isNextDisabled
      });
      return;
    }

    const days = (stats && stats.daily) || {};
    const c = days[cursorDate] || {};
    const sum = {
      scenes: c.scenes || 0,
      vocab: c.vocab || 0,
      listening: c.listening || 0,
      shadowing: c.shadowing || 0,
      practical: c.practical || 0
    };

    const next = new Date(cursor.getTime());
    next.setDate(next.getDate() + 1);
    const isNextDisabled = next.getTime() > today.getTime();
    this.setData({
      activeSummary: sum,
      activeLabel: cursorDate,
      isPrevDisabled: false,
      isNextDisabled
    });
  },

  /**
   * 刷新徽章列表
   */
  refreshBadges() {
    const badges = getUnlockedBadges({ limit: 50 });
    const badgeList = badges.map(b => {
      const scene = getSceneById(b.sceneId);
      return {
        sceneId: b.sceneId,
        title: (scene && scene.title) || `场景 ${b.sceneId}`,
        date: b.date
      };
    });
    this.setData({ badgesTotal: badges.length, badgeList });
  },

  /**
   * 处理添加到我的小程序
   */
  handleAddToMiniprogram() {
    wx.showModal({
      title: '添加到我的小程序',
      content: '点击右上角菜单，选择"添加到我的小程序"',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 处理添加到手机桌面
   */
  handleAddToDesktop() {
    wx.showModal({
      title: '添加到手机桌面',
      content: '请根据手机系统指引，将小程序添加到桌面',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 计算并更新自定义导航栏布局
   * 说明：优先基于胶囊信息计算，避免开发者工具与真机 safe-area 表现差异
   */
  updateCustomNavLayout() {
    const systemInfo = wx.getSystemInfoSync();
    const menuRect = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = menuRect.bottom + (menuRect.top - statusBarHeight);
    const logoSize = 36; // px
    const logoTop = menuRect.bottom - logoSize;
    const contentPaddingTop = navBarHeight + 18;

    this.setData({
      customNavStyle: `height:${navBarHeight}px;padding-top:${statusBarHeight}px;`,
      customNavLogoStyle: `width:${logoSize}px;height:${logoSize}px;top:${logoTop}px;`,
      contentStyle: `padding-top:${contentPaddingTop}px;`
    });
  }
});
