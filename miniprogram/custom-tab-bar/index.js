import { TABBAR } from '../constants/assets/index.js';

Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "探索",
        iconPath: TABBAR.EXPLORE.DEFAULT,
        selectedIconPath: TABBAR.EXPLORE.ACTIVE
      },
      {
        pagePath: "/pages/review/review",
        text: "复习",
        iconPath: TABBAR.REVIEW.DEFAULT,
        selectedIconPath: TABBAR.REVIEW.ACTIVE
      },
      {
        pagePath: "/pages/knowledge/knowledge",
        text: "知识点",
        iconPath: TABBAR.KNOWLEDGE.DEFAULT,
        selectedIconPath: TABBAR.KNOWLEDGE.ACTIVE
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        iconPath: TABBAR.PROFILE.DEFAULT,
        selectedIconPath: TABBAR.PROFILE.ACTIVE
      }
    ]
  },
  methods: {
    /**
     * @description 切换 Tab
     * @param {Object} e 事件对象
     */
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
