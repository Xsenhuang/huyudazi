import { ENV } from '../constants/voice';
import { ensureCloudInitialized } from './cloud';
import md5 from './md5'; // 我们需要引入一个 md5 库

// ⚠️ 请把你刚才复制的云存储 File ID 前缀填在这里：
// 例如 'cloud://cloud1-1g0mgsc34984e5a0.636c-cloud1-1g0mgsc34984e5a0-1250000000/audio/'
const CLOUD_AUDIO_BASE_URL = 'cloud://cloud1-1g0mgsc34984e5a0.636c-cloud1-1g0mgsc34984e5a0-1419502875/audio/';

const TTS_TIMEOUT_MS = 25000;
const TTS_MAX_RETRY = 0;

const ttsCache = new Map();
const ttsInFlight = new Map();

/**
 * 延时工具函数
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Promise 超时包装
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * 判断是否为超时类错误
 * @param {any} err
 * @returns {boolean}
 */
function isTimeoutError(err) {
  const msg = (err && (err.errMsg || err.message || err.toString())) || '';
  return /timeout/i.test(msg);
}

/**
 * 语音接口层 (Data Management Abstraction)
 * @description 封装与云端/后端的通信，隔离业务逻辑，支持 Mock 模式
 */
export const VoiceAPI = {
  /**
   * 极速播放：根据文本自动匹配云存储中的音频
   * （已弃用：不再自动拼出 MD5 静态链接，改为直连匹配）
   */
  async getStaticAudioUrl(text, voiceId) {
    console.warn('getStaticAudioUrl 已弃用，现采用 directUrl 直连匹配音频');
    return '';
  },

  /**
   * 文本转语音 (TTS)
   * 现在的逻辑：
   * 1. 优先使用配置中 directUrl 绑定的音频 URL
   * 2. 优先按 sceneId + itemId 精准匹配（audio/{sceneId}/{itemId}.mp3），失败后降级兼容旧路径（audio/{itemId}.mp3）
   * 3. 若无 itemId，则尝试按 sceneId + pinyin 匹配（audio/{sceneId}/{pinyin}.mp3），失败后降级兼容旧路径（audio/{pinyin}.mp3）
   */
  async textToSpeech(text, voiceId, directUrl, pinyin, itemId, sceneId) {
    // 1. 如果传入了直接绑定的音频 URL，直接使用
    if (directUrl) {
      console.log('【直连匹配】使用指定音频:', directUrl);
      if (directUrl.startsWith('cloud://')) {
        if (ttsCache.has(directUrl)) return ttsCache.get(directUrl);
        try {
          const res = await wx.cloud.getTempFileURL({ fileList: [directUrl] });
          if (res.fileList && res.fileList[0] && res.fileList[0].status === 0) {
            const tempUrl = res.fileList[0].tempFileURL;
            ttsCache.set(directUrl, tempUrl);
            return tempUrl;
          }
        } catch(e) {
          console.error('getTempFileURL error:', e);
        }
      }
      return directUrl;
    }

    /**
     * @description 构造并依次尝试候选 cloud fileID，支持 sceneId 分目录与旧路径兼容。
     * @param {string} candidate - 不含扩展名的文件名（sentenceId / safePinyin）。
     * @returns {Promise<string>} 临时可播放 URL
     */
    const tryCandidate = async (candidate) => {
      const safeCandidate = String(candidate || '').trim();
      if (!safeCandidate) return '';

      const safeSceneId = sceneId === undefined || sceneId === null ? '' : String(sceneId).trim();
      const urls = [];
      if (safeSceneId) urls.push(`${CLOUD_AUDIO_BASE_URL}${safeSceneId}/${safeCandidate}.mp3`);
      urls.push(`${CLOUD_AUDIO_BASE_URL}${safeCandidate}.mp3`);

      for (const url of urls) {
        console.log(`【音频匹配】尝试寻找音频文件: ${url}`);
        if (ttsCache.has(url)) return ttsCache.get(url);

        try {
          const res = await wx.cloud.getTempFileURL({ fileList: [url] });
          if (res.fileList && res.fileList[0] && res.fileList[0].status === 0) {
            const tempUrl = res.fileList[0].tempFileURL;
            ttsCache.set(url, tempUrl);
            return tempUrl;
          }
        } catch (e) {
          console.error('获取云链接失败:', e);
        }
      }

      return '';
    };

    // 2. 如果没有 directUrl，尝试根据 itemId 自动去云端匹配文件 (推荐用于长句子)
    if (itemId) {
      const safeItemId = String(itemId);
      const candidates = [safeItemId];
      if (safeItemId.includes('/')) {
        candidates.push(safeItemId.split('/').pop());
      }

      for (const candidate of candidates) {
        const matchedUrl = await tryCandidate(candidate);
        if (matchedUrl) return matchedUrl;
      }
    }

    // 3. 如果 itemId 也没找到，尝试根据 pinyin 自动去云端匹配文件 (推荐用于词汇)
    if (pinyin) {
      // 将拼音转换为合法的文件名：去除空格、标点，转换为小写
      const safePinyin = pinyin.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedUrl = await tryCandidate(safePinyin);
      if (matchedUrl) return matchedUrl;
    }

    console.warn(`【音频未匹配】文本 "${text}" 没有配置音频，且云端也没有找到对应的ID或拼音文件。`);
    
    // 如果没有配置音频，抛出一个特定的错误，让上层捕获，以便实现“没有匹配上就先不发出声音”的效果
    throw new Error('AUDIO_NOT_CONFIGURED');
  },

  /**
   * 语音转文本 (ASR)
   * @param {String} tempFilePath - 录音的临时文件路径
   * @returns {Promise<String>} 识别出的文本
   */
  async speechToText(tempFilePath) {
    if (ENV.USE_MOCK_VOICE) {
      console.log('【Mock】ASR 请求被拦截。音频路径:', tempFilePath);
      return new Promise((resolve) => {
        // 模拟网络请求耗时
        setTimeout(() => resolve('【模拟识别】侬好，我今朝勿出去勒。'), 1500);
      });
    }

    ensureCloudInitialized();

    // 真实环境：上传音频文件到云存储，然后调用云函数进行识别
    try {
      // 1. 上传到云存储
      // const uploadRes = await wx.cloud.uploadFile({ ... });
      // 2. 调用云函数
      // const { result } = await wx.cloud.callFunction({ ... });
      // return result.text;
      return "真实 ASR 暂未实现";
    } catch (error) {
      console.error('ASR 失败:', error);
      throw error;
    }
  }
};
