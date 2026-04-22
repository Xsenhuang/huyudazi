/**
 * 语音相关配置常量
 * @description 统一管理录音参数、状态枚举等，坚持常量化
 */

// 开发环境配置
export const ENV = {
  USE_MOCK_VOICE: false,
};

// 录音基础配置
export const RECORD_CONFIG = {
  duration: 10000, // 测试阶段限制最长录音10秒
  sampleRate: 16000, // 采样率（MiniMax 推荐 16000）
  numberOfChannels: 1, // 单声道
  encodeBitRate: 48000, // 编码码率
  format: 'mp3', // 音频格式
};

// 语音交互状态枚举
export const VOICE_STATUS = {
  IDLE: 'IDLE',           // 空闲
  RECORDING: 'RECORDING', // 录音中
  RECOGNIZING: 'RECOGNIZING', // 识别/请求中
  PLAYING: 'PLAYING',     // 播放中
  ERROR: 'ERROR'          // 错误
};

// MiniMax 音色常量
export const MINIMAX_VOICE_ID = {
  SHANGHAINESE_FEMALE: 'presenter_female', 
  SHANGHAINESE_MALE: 'presenter_male'
};
