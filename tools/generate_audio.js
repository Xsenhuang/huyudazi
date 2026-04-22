import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';

const MINIMAX_API_KEY = "REDACTED_API_KEY";
const VOICE_ID = "presenter_female"; 

const textsToGenerate = [
  "侬早",
  "长远勿见",
  "蛮好",
  "介",
  "老",
  "最近",
  "伊拉",
  "巧",
  "讲脱一歇",
  "乃",
  "蛮好，蛮好！搿抢里身体好哦？",
  "好，好个！侬哪能介忙啦？人影子也勿看见。我老想念依个！",
  "最近是忙着一眼，伊拉老是派我去出差。我也常庄想来望望侬。",
  "今朝介巧碰着侬，乃阿拉老朋友一道去讲脱一歇。",
  "哎，侬早，张先生！",
  "喔唷，是侬老兄啊！长远勿见，侬好呀！"
];

const OUTPUT_DIR = path.join(process.cwd(), 'output_audio');

function getMD5(text) {
  return crypto.createHash('md5').update(text.trim()).digest('hex');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateAndSaveAudio(text, hash) {
  const outputPath = path.join(OUTPUT_DIR, `${hash}.mp3`);
  if (fs.existsSync(outputPath)) {
    console.log(`⏩ 跳过 (已存在): [${hash}] "${text}"`);
    return;
  }
  console.log(`⏳ 正在合成: [${hash}] "${text}" ...`);
  try {
    const url = "https://api.minimaxi.com/v1/t2a_v2";
    const headers = {
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    };
    const body = {
      model: "speech-2.8-turbo",
      text: text,
      stream: false,
      voice_setting: { voice_id: VOICE_ID, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
      language_boost: "auto",
      output_format: "hex" 
    };
    const response = await axios.post(url, body, { headers });
    if (response.data && response.data.base_resp && response.data.base_resp.status_code === 0) {
      const hexAudio = response.data.data.audio;
      const audioBuffer = Buffer.from(hexAudio, 'hex');
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`✅ 成功保存: ${hash}.mp3`);
    } else {
      console.error(`❌ 合成失败 [${text}]:`, response.data.base_resp.status_msg || response.data);
    }
  } catch (error) {
    console.error(`❌ 请求出错 [${text}]:`, error.message);
  }
}

async function main() {
  if (MINIMAX_API_KEY === "请在这里填入你的_API_KEY") {
    console.error("⚠️ 运行失败：请先在 generate_audio.js 里填写你的 MINIMAX_API_KEY！");
    return;
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log(`\n🚀 开始执行上海话音频批量合成任务...\n共读取到 ${textsToGenerate.length} 句文案。\n`);
  let successCount = 0;
  let skipCount = 0;
  for (let i = 0; i < textsToGenerate.length; i++) {
    const text = textsToGenerate[i];
    const hash = getMD5(text);
    const outputPath = path.join(OUTPUT_DIR, `${hash}.mp3`);
    if (fs.existsSync(outputPath)) {
      skipCount++;
      console.log(`⏩ 跳过 (已存在): [${hash}] "${text}"`);
      continue;
    }
    await generateAndSaveAudio(text, hash);
    successCount++;
    await sleep(1000);
  }
  console.log(`\n🎉 任务执行完毕！\n📊 统计: 跳过已存在 ${skipCount} 个，新合成 ${successCount} 个。\n📁 音频存放目录: ${OUTPUT_DIR}\n`);
}
main();
