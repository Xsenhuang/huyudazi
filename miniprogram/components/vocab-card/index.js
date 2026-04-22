import { audioService } from '../../utils/audioService';
import { VoiceAPI } from '../../utils/voiceApi';
import { UI } from '../../constants/assets/index.js';

Component({
  properties: {
    vocab: {
      type: Object,
      value: {}
    },
    sceneId: {
      type: Number,
      value: null
    },
    voiceId: {
      type: String,
      value: null
    }
  },

  data: {
    isPlaying: false,
    uiIcons: UI
  },

  methods: {
    /**
     * 播放当前词汇的上海话发音
     */
    async handlePlayAudio() {
      // 如果正在播放则停止
      if (this.data.isPlaying) {
        audioService.stop();
        this.setData({ isPlaying: false });
        return;
      }
      
      this.setData({ isPlaying: true });
      
      try {
        const text = this.properties.vocab.word;
        const pinyin = this.properties.vocab.pinyin;
        const directAudio = this.properties.vocab.audio; // 优先读取直连音频
        const audioUrl = await VoiceAPI.textToSpeech(text, this.properties.voiceId, directAudio, pinyin, null, this.properties.sceneId);
        
        audioService.play(
          audioUrl,
          () => {
            // 开始播放回调
          },
          (err) => {
            // 播放结束或报错回调
            this.setData({ isPlaying: false });
            if (err) wx.showToast({ title: '播放失败', icon: 'none' });
          }
        );
      } catch (error) {
        this.setData({ isPlaying: false });
        if (error.message === 'AUDIO_NOT_CONFIGURED') {
          wx.showToast({ title: '该词汇暂无发音', icon: 'none' });
        } else {
          wx.showToast({ title: '语音获取失败', icon: 'none' });
        }
      }
    }
  }
});
