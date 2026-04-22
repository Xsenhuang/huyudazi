import { getScenesByCategory, getLastVisitedLevel, saveLastVisitedLevel, getSceneMastery, SCENE_MASTERY } from '../../utils/store';
import { CATEGORY_LIST } from '../../constants/index';
import { UI } from '../../constants/assets/index.js';

Page({
  data: {
    uiIcons: UI,
    categoryId: null,
    categoryInfo: null,
    sceneList: []
  },

  /**
   * 生命周期函数--监听页面加载
   * @param {Object} options 页面参数
   */
  onLoad(options) {
    const categoryId = parseInt(options.categoryId || 1, 10);
    const categoryInfo = CATEGORY_LIST.find(c => c.id === categoryId);
    
    this.setData({
      categoryId,
      categoryInfo
    });
    
    if (categoryInfo) {
      wx.setNavigationBarTitle({
        title: categoryInfo.title
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.refreshList();
  },

  /**
   * 刷新小场景列表
   */
  refreshList() {
    if (this.data.categoryId) {
      const scenes = getScenesByCategory(this.data.categoryId);
      this.setData({ sceneList: scenes });
    }
  },

  /**
   * 点击小场景卡片，进入第1关
   * @param {Object} e 事件对象
   */
  handleSceneTap(e) {
    const { id } = e.currentTarget.dataset;
    const scene = this.data.sceneList.find(s => s.id === id);
    
    if (scene && (!scene.level1_listening || Object.keys(scene.level1_listening).length === 0)) {
      wx.showToast({
        title: '该场景关卡正在开发中',
        icon: 'none'
      });
      return;
    }

    if (getSceneMastery(id) !== SCENE_MASTERY.L3) {
      const lastVisitedUrl = getLastVisitedLevel(id);
      if (lastVisitedUrl) {
        if (lastVisitedUrl.includes('/pages/level-substitution/level-substitution')) {
          const safeUrl = `/pages/level-practical/level-practical?sceneId=${id}`;
          saveLastVisitedLevel(id, safeUrl);
          wx.navigateTo({ url: safeUrl });
          return;
        }
        wx.navigateTo({ url: lastVisitedUrl });
        return;
      }
    }

    // 默认先进入词汇学习页面，如果没词汇内部会自动跳转到 listening
    wx.navigateTo({
      url: `/pages/learning/learning?id=${id}`
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
});
