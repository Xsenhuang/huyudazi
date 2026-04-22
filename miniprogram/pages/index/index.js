import { getCategoriesWithProgress, getScenesByCategory, getLastVisitedLevel, saveLastVisitedLevel, getSceneMastery, SCENE_MASTERY } from '../../utils/store';
import { IMAGES } from '../../constants/assets/index.js';

const app = getApp();

Page({
  data: {
    images: IMAGES,
    navHeight: 0,
    titleTop: 0,
    customNavStyle: '',
    customNavLogoStyle: '',
    tabs: [], // 顶部分类Tab
    currentTab: 0, // 当前选中的Tab索引
    sceneList: [], // 当前分类下的场景列表
    cardColors: [
      '#FF89BD', // 1 目标粉色 (主参考粉色)
      '#FFD140', // 2 原黄色
      '#D0FA29', // 3 原荧光绿
      '#6CE2FF', // 4 原天蓝色
      '#88EACF', // 5 原青绿色
      '#AEA4FF', // 6 原紫色
      '#FF9EC9', // 7 亮洋粉 (基于FF89BD提亮)
      '#FFE066', // 8 亮金黄
      '#B5FF33', // 9 亮柠绿
      '#5CE6E6', // 10 亮青蓝
      '#75D9FF', // 11 亮湖蓝
      '#C499FF', // 12 亮浅紫
      '#FF7BB4', // 13 亮玫瑰 (基于FF89BD加深一点点饱和度)
      '#FFC233', // 14 亮橘黄
      '#99FF33', // 15 亮草绿
      '#33D6FF', // 16 亮天蓝
      '#5CE6B8', // 17 亮薄荷绿
      '#D98CFF', // 18 亮紫罗兰
      '#FFA5CD', // 19 亮珊瑚粉 (基于FF89BD变浅偏暖)
      '#FFB84D', // 20 亮芒果黄
      '#E6FF4D', // 21 亮嫩绿
      '#4DEBFF', // 22 亮冰蓝
      '#4DFFC2', // 23 亮碧绿
      '#E699FF', // 24 亮丁香紫
      '#FF94C2', // 25 亮桃红 (基于FF89BD微调)
      '#FFD633', // 26 亮向日葵黄
      '#CCFF33', // 27 亮黄绿
      '#66CCFF', // 28 亮海蓝
      '#33FFCC', // 29 亮水绿
      '#B380FF'  // 30 亮薰衣草紫
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 计算自定义导航栏的高度和位置
    const systemInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

    const navHeight = menuButtonInfo.top + menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight);
    const titleTop = menuButtonInfo.top;

    // 计算导航栏样式（与 review 页面保持一致）
    const statusBarHeight = systemInfo.statusBarHeight || 20;
    const logoSize = 36; // px
    const logoTop = menuButtonInfo.bottom - logoSize;

    this.setData({
      navHeight,
      titleTop,
      customNavStyle: `height:${navHeight}px;padding-top:${statusBarHeight}px;`,
      customNavLogoStyle: `width:${logoSize}px;height:${logoSize}px;top:${logoTop}px;`
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    this.refreshPageData();
  },

  /**
   * 刷新页面核心数据
   * @private
   */
  refreshPageData() {
    // 获取所有的分类作为Tabs
    const tabs = getCategoriesWithProgress();
    
    this.setData({ tabs }, () => {
      if (tabs.length > 0) {
        this.loadScenesForTab(this.data.currentTab);
      }
    });
  },

  /**
   * 切换Tab
   */
  handleTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentTab: index
    });
    this.loadScenesForTab(index);
  },

  /**
   * 根据种子将30个颜色分组成“每组6种具有强烈差异色系”的组合，然后打乱组间顺序
   * @param {Array} array 30种颜色数组
   * @param {Number} seed 随机种子
   * @returns {Array} 分组打乱后的新数组
   */
  getShuffledArray(array, seed) {
    // 伪随机函数
    let random = function() {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // 把30个颜色按照色相大类分成5个不同的颜色桶（6个大色系，每个桶里放相似色相的不同明度饱和度变体）
    // 之前30个颜色大致分布是：粉/红，黄/橙，绿/黄绿，蓝/青，紫/丁香
    const buckets = [
      [], // 粉红系
      [], // 黄橙系
      [], // 绿系
      [], // 蓝系
      [], // 青/湖水蓝系
      []  // 紫系
    ];

    // 简单按照顺序每6个一组分桶（这依赖于我们配置的30种颜色的排列规律）
    // 我们原先30个颜色可以被当成5个循环，每个循环都包含了粉、黄、绿、蓝、青、紫
    for(let i=0; i<array.length; i++) {
      buckets[i % 6].push(array[i]);
    }

    // 在每个桶内部进行随机打乱（确保每次取出的色相变体不同）
    buckets.forEach(bucket => {
      for (let i = bucket.length - 1; i > 0; i--) {
        let j = Math.floor(random() * (i + 1));
        [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
      }
    });

    let result = [];
    // 组合：生成5组，每组包含 粉、黄、绿、蓝、青、紫
    // 并对每组内部进行固定的偏移打乱（保证相邻差异大的逻辑）
    for (let group = 0; group < 5; group++) {
      let currentGroup = [
        buckets[0][group], // 粉红系
        buckets[1][group], // 黄橙系
        buckets[2][group], // 绿系
        buckets[3][group], // 蓝系
        buckets[4][group], // 青/湖水蓝系
        buckets[5][group]  // 紫系
      ];
      
      // 对这6个颜色进行一次基于种子的固定洗牌
      for (let i = currentGroup.length - 1; i > 0; i--) {
        let j = Math.floor(random() * (i + 1));
        [currentGroup[i], currentGroup[j]] = [currentGroup[j], currentGroup[i]];
      }
      
      result = result.concat(currentGroup);
    }

    return result;
  },

  /**
   * 加载指定Tab的场景列表
   * @param {Number} tabIndex 
   */
  loadScenesForTab(tabIndex) {
    const currentCategory = this.data.tabs[tabIndex];
    if (!currentCategory) return;

    const rawScenes = getScenesByCategory(currentCategory.id);
    
    // 旋转角度池：每8个一组循环，对应4行
    // 第一行: 左 -3°, 右 -3°
    // 第二行: 左 -3°, 右 +3°
    // 第三行: 左 +3°, 右 +3°
    // 第四行: 左 +3°, 右 -3°
    // 第五行(同第一行): 左 -3°, 右 -3°
    // 第六行(同第二行): 左 -3°, 右 +3°
    // 第七行(同第三行): 左 +3°, 右 +3°
    // 第八行(同第四行): 左 +3°, 右 -3°
    const rotations = [-3, -3, -3, 3, 3, 3, 3, -3, -3, -3, -3, 3, 3, 3, 3, -3];

    // 根据分类ID生成该分类专属的颜色排序
    const categoryColors = this.getShuffledArray(this.data.cardColors, currentCategory.id);

    // 为每个卡片分配颜色和旋转角度
    const coloredScenes = rawScenes.map((item, index) => {
      return {
        ...item,
        bgColor: categoryColors[index % categoryColors.length],
        rotate: rotations[index % 6]
      };
    });

    this.setData({
      sceneList: coloredScenes
    });
  },

  /**
   * 处理场景卡片点击事件
   * 进入学习或关卡页面
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

    // 跳转到学习详情页
    wx.navigateTo({
      url: `/pages/learning/learning?id=${id}`
    });
  }
});
