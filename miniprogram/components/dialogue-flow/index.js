import { audioService } from '../../utils/audioService';
import { VoiceAPI } from '../../utils/voiceApi';
import { pickPinyinForToneDisplay, tokenizePinyinWithTone } from '../../utils/pinyinTone';
import { UI } from '../../constants/assets/index.js';

Component({
  properties: {
    dialogueHistory: {
      type: Array,
      value: [],
      observer(newVal) {
        this.buildRenderHistory(newVal);
      }
    },
    currentOptions: {
      type: Array,
      value: []
    },
    npcAvatar: {
      type: String,
      value: ''
    },
    scrollIntoId: {
      type: String,
      value: ''
    },
    sceneId: {
      type: Number,
      value: null
    },
    userVoiceId: {
      type: String,
      value: null
    }
  },

  data: {
    playingId: '',
    uiIcons: UI,
    renderHistory: []
  },

  methods: {
    buildRenderHistory(dialogueHistory) {
      const list = Array.isArray(dialogueHistory) ? dialogueHistory : [];
      const renderHistory = list.map((item) => {
        const pinyinForDisplay = pickPinyinForToneDisplay(item);
        return {
          ...item,
          pinyinTokens: tokenizePinyinWithTone(pinyinForDisplay)
        };
      });
      this.setData({ renderHistory });
    },

    /**
     * 处理用户选择选项
     */
    handleOptionSelect(e) {
      const { option } = e.currentTarget.dataset;
      this.triggerEvent('select', { option });
    },

    /**
     * 播放 NPC 语音
     */
    async playVoice(e) {
      const { id, text, audio, pinyin, speakertype } = e.currentTarget.dataset;
      return this.playVoiceCore({ id, text, audio, pinyin, speakerType: speakertype });
    },

    /**
     * 提供给页面侧调用：按对话气泡对象播放语音（用于自动播放/复用逻辑）
     * @param {{audioItemId?: string, id?: string, text: string, audio?: string, pinyin?: string, speakerType?: 'NPC' | 'USER'}} bubble
     */
    async playVoiceByBubble(bubble) {
      const safeBubble = bubble || {};
      const id = safeBubble.audioItemId || safeBubble.id;
      if (!id) return;
      return this.playVoiceCore({
        id,
        text: safeBubble.text,
        audio: safeBubble.audio,
        pinyin: safeBubble.pinyin,
        speakerType: safeBubble.speakerType
      });
    },

    /**
     * 语音播放核心逻辑（按钮点击/页面自动播放共用）
     * @param {{id: string, text: string, audio?: string, pinyin?: string, speakerType?: 'NPC' | 'USER'}} payload
     */
    async playVoiceCore(payload) {
      const { id, text, audio, pinyin, speakerType } = payload || {};
      if (!id || !text) return;

      if (this.data.playingId === id) {
        audioService.stop();
        this.setData({ playingId: '' });
        return;
      }

      audioService.stop();
      this.setData({ playingId: id });

      try {
        const voiceId = this.properties.userVoiceId;

        const audioUrl = await VoiceAPI.textToSpeech(text, voiceId, audio, pinyin, id, this.properties.sceneId);

        audioService.play(
          audioUrl,
          () => {},
          (err) => {
            this.setData({ playingId: '' });
            if (err) wx.showToast({ title: '播放失败', icon: 'none' });
          }
        );
      } catch (error) {
        this.setData({ playingId: '' });
        if (error.message === 'AUDIO_NOT_CONFIGURED') {
          wx.showToast({ title: '暂无发音', icon: 'none' });
        } else {
          wx.showToast({ title: '语音获取失败', icon: 'none' });
        }
      }
    }
  }
});
