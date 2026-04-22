import { getSceneById, updateSceneProgress, saveLastVisitedLevel, clearLastVisitedLevel, getNextPlayableScene } from '../../utils/store';
import { audioService } from '../../utils/audioService';
import { recordSceneCompletion } from '../../utils/learningStats';
import { ensureReviewDecksForScene } from '../../utils/reviewSrs';

function buildSceneStudySummary(scene) {
  const vocabCount = (scene && Array.isArray(scene.vocabularies)) ? scene.vocabularies.length : 0;
  const listeningCount = (scene && scene.level1_listening && Array.isArray(scene.level1_listening.questions))
    ? scene.level1_listening.questions.length
    : 0;
  const shadowingCount = (scene && scene.level2_shadowing && Array.isArray(scene.level2_shadowing.sentences))
    ? scene.level2_shadowing.sentences.length
    : 0;

  return { vocabCount, listeningCount, shadowingCount };
}

function buildFinishModalContent(scene, hasNextScene, extraLines) {
  const summary = buildSceneStudySummary(scene);
  const lines = [
    `已完成「${(scene && scene.title) || ''}」`,
    `词汇：${summary.vocabCount} 个`,
    `听力：${summary.listeningCount} 题`,
    `跟读：${summary.shadowingCount} 句`,
    ...(Array.isArray(extraLines) ? extraLines : []),
    ...(hasNextScene ? ['', '继续下一个场景学习吗？'] : [])
  ];

  return lines.join('\n');
}

Page({
  data: {
    sceneId: null,
    scene: null,
    dialogueTree: [],
    dialogueHistory: [],
    currentOptions: [],
    scrollIntoId: '',
    isDialogueFinished: false,
    currentNodeId: 'n1'
  },

  /**
   * 获取实战对话组件实例
   * @returns {WechatMiniprogram.Component.TrivialInstance | null}
   */
  getDialogueFlowComponent() {
    return this.selectComponent('#dialogueFlow');
  },

  /**
   * 清理自动播放相关的定时器，避免页面卸载/重开后重复触发
   */
  clearAutoPlayTimers() {
    if (this._enterAutoPlayTimer) clearTimeout(this._enterAutoPlayTimer);
    if (this._replyAutoPlayTimer) clearTimeout(this._replyAutoPlayTimer);
    this._enterAutoPlayTimer = null;
    this._replyAutoPlayTimer = null;
  },

  /**
   * 请求播放某条气泡的语音（可带延迟）
   * @param {any} bubble
   * @param {number} delayMs
   * @param {'enter' | 'reply'} type
   */
  scheduleAutoPlayBubble(bubble, delayMs, type) {
    const timerKey = type === 'reply' ? '_replyAutoPlayTimer' : '_enterAutoPlayTimer';
    if (this[timerKey]) clearTimeout(this[timerKey]);

    this[timerKey] = setTimeout(() => {
      const comp = this.getDialogueFlowComponent();
      if (comp && comp.playVoiceByBubble) comp.playVoiceByBubble(bubble);
      this[timerKey] = null;
    }, Math.max(0, Number(delayMs) || 0));
  },

  buildNpcBubbleId(nodeId) {
    return `npc_${nodeId}_${Date.now()}`;
  },

  onLoad(options) {
    const sceneId = parseInt(options.sceneId || 102, 10);
    const scene = getSceneById(sceneId);
    const practical = scene && (scene.level3_practical || scene.level4_practical);
    const hasPractical = practical && Array.isArray(practical.dialogueTree) && practical.dialogueTree.length > 0;
    
    if (scene && hasPractical) {
      saveLastVisitedLevel(sceneId, `/pages/level-practical/level-practical?sceneId=${sceneId}`);
      this.setData({
        sceneId,
        scene,
        dialogueTree: practical.dialogueTree
      }, () => {
        this.startDialogue();
      });
      
      wx.setNavigationBarTitle({
        title: '实战：' + scene.title
      });
    } else {
      wx.showToast({ title: '该场景暂无实战内容', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onUnload() {
    this.clearAutoPlayTimers();
    audioService.stop();
  },

  startDialogue() {
    this.clearAutoPlayTimers();
    this.setData({
      dialogueHistory: [],
      currentOptions: [],
      isDialogueFinished: false,
      currentNodeId: 'n1' // 默认起点
    });
    this.processNode('n1');
  },

  processNode(nodeId) {
    if (nodeId === 'end') {
      this.setData({ isDialogueFinished: true });
      this.scrollToBottom();
      return;
    }

    const { dialogueTree, dialogueHistory } = this.data;
    const node = dialogueTree.find(n => n.id === nodeId);
    
    if (!node) {
      this.setData({ isDialogueFinished: true });
      return;
    }

    if (node.speakerType === 'NPC') {
      const isFirstNpcBubble = dialogueHistory.length === 0;
      const bubble = {
        id: this.buildNpcBubbleId(node.id),
        speakerType: 'NPC',
        text: node.text,
        pinyin: node.pinyin,
        mandarin: node.mandarin,
        audioItemId: node.id,
        audio: node.audio
      };
      dialogueHistory.push(bubble);
      
      this.setData({
        dialogueHistory,
        currentOptions: []
      }, () => {
        this.scrollToBottom();
        if (isFirstNpcBubble) this.scheduleAutoPlayBubble(bubble, 1000, 'enter');
        // 延时找下一个节点
        // 默认情况下NPC没有next字段时顺序执行或者视为结束，这里为了简单约定NPC后一定接USER_OPTIONS或下一个NPC（ID加1等）
        // 但在我们的数据结构里，USER_OPTIONS才决定next
        const currentIndex = dialogueTree.findIndex(n => n.id === nodeId);
        const nextNode = dialogueTree[currentIndex + 1];
        
        setTimeout(() => {
          if (nextNode) {
            this.processNode(nextNode.id);
          } else {
            this.setData({ isDialogueFinished: true });
            this.scrollToBottom();
          }
        }, 1000);
      });
    } else if (node.speakerType === 'USER_OPTIONS') {
      const options = (node.options || []).map((opt, index) => ({
        ...opt,
        audioItemId: opt.audioItemId || `${node.id}_${index + 1}`
      }));
      this.setData({
        currentOptions: options
      }, () => {
        this.scrollToBottom();
      });
    }
  },

  handleDialogueSelect(e) {
    const { option } = e.detail;
    const { dialogueHistory } = this.data;
    const userBubbleId = `user_${Date.now()}`;
    const audioItemId = option.audioItemId || option.id || userBubbleId;
    
    const bubble = {
      id: userBubbleId,
      speakerType: 'USER',
      text: option.text,
      pinyin: option.pinyin,
      mandarin: option.mandarin,
      audioItemId,
      audio: option.audio
    };
    dialogueHistory.push(bubble);
    
    this.setData({
      dialogueHistory,
      currentOptions: []
    }, () => {
      this.scrollToBottom();
      this.scheduleAutoPlayBubble(bubble, 100, 'reply');
      setTimeout(() => {
        if (option.next) {
          this.processNode(option.next);
        } else {
          this.setData({ isDialogueFinished: true });
        }
      }, 600);
    });
  },

  scrollToBottom() {
    const { dialogueHistory, currentOptions, isDialogueFinished } = this.data;
    let targetId = '';
    
    if (isDialogueFinished) {
      targetId = 'bottom-padding';
    } else if (currentOptions && currentOptions.length > 0) {
      targetId = 'options-area';
    } else if (dialogueHistory.length > 0) {
      targetId = dialogueHistory[dialogueHistory.length - 1].id;
    }
    
    if (targetId) {
      this.setData({ scrollIntoId: targetId });
    }
  },

  finishDialogue() {
    const { sceneId, scene } = this.data;
    wx.showLoading({ title: '正在结算...' });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 更新状态为 L3
      updateSceneProgress(sceneId, 'L3');
      // 完成关卡，清除最后浏览页面记录
      clearLastVisitedLevel(sceneId);
      ensureReviewDecksForScene(sceneId);

      const summary = buildSceneStudySummary(scene);
      const practicalCount = (this.data.dialogueHistory && this.data.dialogueHistory.length) ? this.data.dialogueHistory.length : 0;
      const recordRes = recordSceneCompletion({
        sceneId,
        vocabCount: summary.vocabCount,
        listeningCount: summary.listeningCount,
        shadowingCount: summary.shadowingCount,
        practicalCount
      });

      const nextScene = getNextPlayableScene(sceneId);
      const showCancel = !!nextScene;
      const extraLines = [];
      extraLines.push(`实战对话：${practicalCount} 句`);
      if (recordRes && recordRes.isFirstCompletion) extraLines.push('徽章：已点亮');

      wx.showModal({
        title: '恭喜通关',
        content: buildFinishModalContent(scene, !!nextScene, extraLines),
        confirmText: nextScene ? '下一个场景' : '回首页',
        cancelText: '回首页',
        showCancel,
        success: (res) => {
          if (res.confirm) {
            if (nextScene) {
              wx.reLaunch({
                url: `/pages/learning/learning?id=${nextScene.id}`
              });
              return;
            }

            wx.switchTab({ url: '/pages/index/index' });
            return;
          }

          wx.switchTab({ url: '/pages/index/index' });
        }
      });
    }, 1200);
  }
});
