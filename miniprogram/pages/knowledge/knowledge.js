import { IMAGES } from '../../constants/assets/index.js';

Page({
  data: {
    images: IMAGES,
    customNavStyle: '',
    customNavLogoStyle: '',
    levels: [
      { key: 'N5', level: 'N5', countText: '3条知识点' },
      { key: 'N4', level: 'N4', countText: '1条知识点' },
      { key: 'N3', level: 'N3', countText: '1条知识点' }
    ],
    currentLevel: 0,
    cards: [
      {
        id: 'vocabulary-blue',
        en: 'VOCABULARY',
        zh: '词汇',
        desc: '开关和出入词汇',
        bg: 'linear-gradient(180deg, #4FCBFF 0%, #CFEFFF 100%)'
      },
      {
        id: 'vocabulary-orange',
        en: 'VOCABULARY',
        zh: '词汇',
        desc: '开关和出入词汇',
        bg: 'linear-gradient(180deg, #FF7A2E 0%, #FFE0CF 100%)'
      },
      {
        id: 'vocabulary-yellow',
        en: 'VOCABULARY',
        zh: '词汇',
        desc: '开关和出入词汇',
        bg: 'linear-gradient(180deg, #FFD54A 0%, #FFF6CA 100%)'
      }
    ],
    currentCard: 1
  },

  onLoad() {
    this.updateCustomNavLayout();
  },

  /**
   * 计算并更新自定义导航栏布局
   * 与 profile 页面保持一致
   */
  updateCustomNavLayout() {
    const systemInfo = wx.getSystemInfoSync();
    const menuRect = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const navBarHeight = menuRect.bottom + (menuRect.top - statusBarHeight);
    const logoSize = 36; // px
    const logoTop = menuRect.bottom - logoSize;

    this.setData({
      customNavStyle: `height:${navBarHeight}px;padding-top:${statusBarHeight}px;`,
      customNavLogoStyle: `width:${logoSize}px;height:${logoSize}px;top:${logoTop}px;`
    });
  },

  /**
   * 生命周期函数--监听页面显示
   * 用于更新自定义 TabBar 的选中状态
   */
  onShow() {
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
  },

  handleLevelTabTap(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    this.setData({ currentLevel: index });
  },

  handleCardChange(e) {
    const current = Number(e.detail.current || 0);
    this.setData({ currentCard: current });
  }
})
