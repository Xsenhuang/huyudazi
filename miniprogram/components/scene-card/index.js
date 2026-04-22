Component({
  /**
   * 组件的属性列表
   */
  properties: {
    scene: {
      type: Object,
      value: {}
    },
    index: {
      type: Number,
      value: 0
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isLeft: true // 控制左右交替布局
  },

  /**
   * 数据监听器
   */
  observers: {
    'index': function(newVal) {
      this.setData({
        isLeft: newVal % 2 === 0
      });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 点击卡片事件
     * 若未解锁则提示，否则抛出事件让父页面弹窗
     */
    handleTapCard() {
      const { status } = this.properties.scene;
      
      if (status === 'LOCKED') {
        wx.showToast({
          title: '前面的路还没走完哦',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      this.triggerEvent('cardTap', { scene: this.properties.scene });
    }
  }
});
