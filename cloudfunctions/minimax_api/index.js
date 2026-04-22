const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: "POST", headers },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw || "{}");
            resolve({ statusCode: res.statusCode, json });
          } catch (e) {
            reject(new Error("响应不是合法 JSON"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(JSON.stringify(body || {}));
    req.end();
  });
}

async function tts({ text, voiceId }) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("缺少环境变量 MINIMAX_API_KEY");
  if (!text) throw new Error("text 不能为空");
  if (!voiceId) throw new Error("voiceId 不能为空");

  const url = "https://api.minimaxi.com/v1/t2a_v2";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const body = {
    model: "speech-2.8-turbo",
    text,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: 1,
      vol: 1,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
    language_boost: "auto",
    output_format: "url",
  };

  const { statusCode, json } = await postJson(url, headers, body);

  const ok = json && json.base_resp && json.base_resp.status_code === 0;
  if (!ok) {
    const msg =
      (json && json.base_resp && json.base_resp.status_msg) ||
      `HTTP ${statusCode}`;
    throw new Error(`MiniMax TTS 失败: ${msg}`);
  }

  const audioUrl = json && json.data && json.data.audio;
  if (!audioUrl) throw new Error("MiniMax 返回缺少音频地址");

  return { audioUrl };
}

exports.main = async (event) => {
  const { action } = event || {};
  if (action === "tts") {
    const { text, voiceId } = event || {};
    return await tts({ text, voiceId });
  }
  throw new Error("不支持的 action");
};
