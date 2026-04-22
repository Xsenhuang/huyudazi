# PRD｜音频资源管理（sceneId 维度升级版）

## 1. 背景

现有小程序音频播放能力已覆盖：
- 第 1 关听力（按题目 ID 播放）
- 第 2 关跟读（按句子 ID 播放）
- 第 3 关实战对话（NPC/用户回复均可点按播放）
- 词汇学习与复习（按拼音或直连音频播放）

但音频资源在云端存储如果采用“平铺文件名”（`audio/{sentenceId}.mp3`），会带来以下问题：
- 不同场景可能出现同名 `sentenceId`（例如不同场景都存在 `n1/u1_1`），导致冲突或覆盖
- 内容侧按场景批量管理/上传困难
- 缺失检查与补齐成本高

因此需要将音频资源管理升级为“按 sceneId 分目录”，并确保对旧资源路径兼容，避免一次性迁移带来的风险。

## 2. 目标

- 固化云存储音频组织规范：优先使用 `audio/{sceneId}/{sentenceId}.mp3`
- 小程序端实现统一匹配策略：先匹配新路径，失败后自动降级兼容旧路径
- 业务模块统一传入 `sceneId`，避免页面/组件各自拼路径造成不一致
- 不阻断学习流程：音频缺失时仍可继续学习（提示“暂无发音”）

## 3. 术语与约定

- `sceneId`：场景唯一标识（数字），来自场景常量配置，如 [category1.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/constants/scenes/category1.js)
- `sentenceId`：句子/条目唯一标识（字符串），可来自：
  - 听力题：`question.id`
  - 跟读句：`sentence.id`
  - 实战对话：NPC 节点 `node.id`；用户回复选项默认生成 `uX_Y`
  - 词汇：优先按拼音规范化后的 `safePinyin`（仅当未配置直连音频时）
- `directUrl`：配置的直连音频（HTTP URL 或 `cloud://` fileID），存在时优先使用

## 4. 云存储路径规范（必须遵循）

### 4.1 新规范（推荐）

所有句子级 mp3 放在：

`audio/{sceneId}/{sentenceId}.mp3`

示例：
- `audio/102/n1.mp3`
- `audio/102/u1_1.mp3`
- `audio/106/u3_1.mp3`
- `audio/102/l1_q1.mp3`（如果听力题以题目 ID 命名）

### 4.2 旧规范（兼容）

历史资源仍允许平铺：

`audio/{sentenceId}.mp3`

说明：小程序端仍会尝试该路径作为降级策略，但不再作为推荐上传方式。

## 5. 小程序侧匹配策略（统一逻辑）

### 5.1 匹配优先级

统一由数据管理层 `VoiceAPI.textToSpeech` 负责“取哪一个音频文件”，业务层不再拼路径：

1) `directUrl` 存在：直接使用（`cloud://` 会自动转临时 URL）
2) 传入 `sceneId + itemId` 时，按以下顺序尝试：
   - `audio/{sceneId}/{itemId}.mp3`
   - `audio/{itemId}.mp3`（旧路径兼容）
3) 若无 `itemId`，但存在 `pinyin` 时，按以下顺序尝试：
   - `audio/{sceneId}/{safePinyin}.mp3`
   - `audio/{safePinyin}.mp3`（旧路径兼容）
4) 均失败：抛出 `AUDIO_NOT_CONFIGURED`，上层提示“暂无发音”，不中断流程

### 5.2 pinyin 文件名规范化

`safePinyin = pinyin.toLowerCase().replace(/[^a-z0-9]/g, '')`

说明：用于词汇类的“拼音兜底匹配”，避免空格、标点导致的文件名不一致。

## 6. 接口与数据契约

### 6.1 VoiceAPI.textToSpeech（统一入口）

签名升级为：

`textToSpeech(text, voiceId, directUrl, pinyin, itemId, sceneId)`

其中：
- `itemId`：优先用于长句精准匹配（听力题/跟读句/实战对话节点 ID）
- `sceneId`：用于按场景目录进行匹配（本 PRD 核心升级点）

实现参考：
- [voiceApi.js](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/utils/voiceApi.js#L70-L156)

### 6.2 业务侧传参要求

为了确保按 `sceneId` 分目录生效，各模块需满足：
- 听力：播放时传入 `sceneId`
  - [level-listening.js](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-listening/level-listening.js#L38-L69)
- 跟读：播放时传入 `sceneId`
  - [level-shadowing.js](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-shadowing/level-shadowing.js#L69-L100)
- 实战对话：页面向对话组件传入 `sceneId`；组件播放时带入 `sceneId`
  - 页面：[level-practical.wxml](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-practical/level-practical.wxml#L1-L15)
  - 组件：[dialogue-flow/index.js](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/components/dialogue-flow/index.js#L6-L105)
- 词汇学习：`learning.wxml` 传入 `scene.id` 给 `vocab-card`；组件播放时带入 `sceneId`
  - 页面：[learning.wxml](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/learning/learning.wxml#L4-L15)
  - 组件：[vocab-card/index.js](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/components/vocab-card/index.js#L1-L68)
- 词汇复习：播放时传入 `scene.id`
  - [learning.js](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/learning/learning.js#L93-L125)

## 7. 实战对话 sentenceId 规则（推荐）

### 7.1 NPC 句子

`sentenceId = node.id`，例如：
- `n1`、`n2`、`n3`……

### 7.2 用户回复句子

为了稳定匹配并支持同一节点多选项，默认生成：

`sentenceId = {userOptionsNodeId}_{optionIndex}`

例如：
- 第一轮用户选项节点 `u1` 第 1 个选项 → `u1_1`
- `u1` 第 2 个选项 → `u1_2`

## 8. 迁移与运营工作流

### 8.1 增量迁移策略（推荐）

- 新补齐/新增场景：直接按新规范上传至 `audio/{sceneId}/...`
- 已上线平铺资源：可逐场景迁移，不强制一次性搬迁
- 小程序端由于已“新路径优先 + 旧路径兜底”，迁移可渐进进行

### 8.2 内容侧本地目录建议

为了方便批量上传与管理，内容侧本地目录也建议按场景分目录：

`{sceneId}/{sentenceId}.mp3`

上传到云端时保持同结构：

`audio/{sceneId}/{sentenceId}.mp3`

## 9. 异常与降级策略

- 音频缺失：提示“暂无发音”，不阻断学习流程
- 网络/获取临时链接失败：提示“语音获取失败”，允许重试
- 播放器状态一致性：全局单实例音频播放，播放新音频前先 stop，避免同时播放
  - [audioService.js](file:///Users/kaijimima1234/Desktop/上海话搭子/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/utils/audioService.js)

## 10. 验收标准

- 任意业务模块提供 `sceneId + sentenceId` 后，能优先播放 `audio/{sceneId}/{sentenceId}.mp3`
- 当新路径不存在时，仍可播放旧路径 `audio/{sentenceId}.mp3`（兼容成功）
- 词汇/复习/听力/跟读/实战对话的播放均走同一匹配策略，不出现“各页面各自拼路径”的分叉实现
- 音频缺失时不影响通关/学习流程（仅轻提示）

