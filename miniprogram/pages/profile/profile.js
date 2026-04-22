import { getSceneById, getProgress } from '../../utils/store';
import { getDailySummaries, getWeeklySummaries, getMonthlySummaries, getUnlockedBadges, recordSceneCompletion } from '../../utils/learningStats';

Page({
  data: {
    mode: 'day',
    summaries: [],
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
    this.refresh();
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
    this.setData({ mode }, () => this.refreshSummaries());
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
    this.setData({ summaries });
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
