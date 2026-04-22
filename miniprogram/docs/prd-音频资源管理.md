# PRD｜音频资源管理（按 sceneId + sentenceId）

## 1. 背景与目标

### 1.1 背景
小程序内的学习内容以「场景（Scene）」组织，场景以 `sceneId`（数字）为唯一标识，场景内容定义位于 `miniprogram/constants/scenes/*`，并通过数据层函数按 `sceneId` 查询（见 [getSceneById](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/utils/store.js#L137-L168)）。

当前音频资源已上云，并采用「按 `sceneId` 作为目录」的方式组织（用户确认：`audio/{sceneId}/{sentenceId}.mp3`），需要将这套约定固化为产品与工程共同遵循的规范，保证：
- 音频资产可按场景“像文件夹一样”管理与批量上传
- 小程序端能按「sceneId + sentenceId」稳定取到正确音频
- 后续替换/补齐/缺失检查不引入数据不一致

### 1.2 目标
- 固化云存储路径规范：音频可按 `sceneId` 分目录管理，按 `sentenceId` 精确定位到句子级音频。
- 提供统一的数据管理抽象：避免各页面/模块自行拼路径导致不一致。
- 支持“按场景批量上传/替换”的工作流：上传完成后业务侧可稳定引用。
- 提供缺失/异常的降级策略：音频缺失或拉取失败时不阻断学习流程。

### 1.3 非目标
- 不强制要求一次性迁移历史资源（本方案以“稳定可用 + 可渐进完善”为优先）。

## 2. 名词与范围

### 2.1 关键名词
- 场景（Scene）：学习/闯关的最小业务单元，用 `sceneId: number` 标识；例如 [category1.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/constants/scenes/category1.js#L4-L31) 中 `id: 102`。
- 句子（Sentence）：场景内的句子级内容；本 PRD 使用 `sentenceId` 表示句子唯一标识（可来自题目/跟读/对话树等）。
- 音频资源（Audio Asset）：句子对应的 mp3 文件 + 可用于小程序播放的引用信息（如 `cloudPath`、`fileID`）。

### 2.2 标识规范
- `sceneId`：数字，来自现有场景定义 `scene.id`（例如 101/102/201/401...）。
- `sentenceId`：字符串或数字均可，但需项目内统一一种格式；推荐“纯数字字符串”，必要时约定是否补零（例如 `100023` 或 `000123`，二选一全局统一）。

## 3. 云存储“文件夹”规范（路径前缀）

### 3.1 路径规范（必须遵循）
云存储的“文件夹”本质为路径前缀。所有句子级音频统一存放在：

`audio/{sceneId}/{sentenceId}.mp3`

示例：
- `audio/102/100023.mp3`
- `audio/201/000123.mp3`

约束：
- `audio/` 为固定根前缀，不得变更。
- 二级目录必须为 `sceneId`（数字字符串）。
- 文件名必须为 `sentenceId`，扩展名固定为 `.mp3`。

### 3.2 可选：环境隔离（推荐但不强制）
如需要区分 `dev/test/prod`，在 `audio/` 下新增环境层级：

`audio/{env}/{sceneId}/{sentenceId}.mp3`

其中 `env ∈ {dev, test, prod}`。若不启用环境隔离，则默认视为 `prod`。

## 4. 数据管理层抽象（资源索引）

### 4.1 为什么需要资源索引
仅靠路径拼接虽然可播放，但在以下场景会引入维护成本与一致性风险：
- 同一 `(sceneId, sentenceId)` 被重复上传、覆盖策略不清晰，导致取到“旧资源/新资源”不可控
- 需要检查某个场景缺哪些音频、统计覆盖率、批量回滚
- 未来引入版本/音色/语速等维度时，路径规则将扩展，缺少统一入口会导致全量改动

因此建议引入“音频资源索引表”，由数据层统一读写，业务层只关心 `sceneId + sentenceId`。

### 4.2 集合设计（建议）
集合名：`audio_assets`

字段（最小集合）：
- `sceneId: number`
- `sentenceId: string`
- `cloudPath: string`（如 `audio/102/100023.mp3`）
- `fileID: string`（上传返回的云文件标识，便于直接下载/播放）
- `updatedAt: number`（毫秒时间戳）

字段（可选扩展）：
- `durationMs: number`
- `md5: string`（用于防重复/一致性校验）
- `status: 'active' | 'deprecated'`

索引：
- 唯一索引：`(sceneId, sentenceId)`，确保同一句子只存在一条“生效记录”。

## 5. 小程序侧：按 sceneId + sentenceId 获取音频

### 5.1 推荐的获取策略
优先走资源索引（DB）获取 `fileID`，必要时降级到 `cloudPath`：
1) 通过 `(sceneId, sentenceId)` 查询 `audio_assets` 得到 `fileID`
2) 若查询无结果，则按规范拼接 `cloudPath` 尝试拉取（或提示缺失）
3) 将成功结果回写索引（可选，视是否允许端侧写 DB 决定）

### 5.2 统一入口（示例代码约定）
为了避免页面内到处拼路径，建议在 `utils/` 或 `services/` 下提供统一函数。

```js
/**
 * @description 根据 sceneId + sentenceId 生成标准云存储路径（cloudPath）。
 * @param {number} sceneId 场景 ID（来自场景常量配置）。
 * @param {string|number} sentenceId 句子 ID（建议为纯数字字符串，项目内格式统一）。
 * @param {object} [options]
 * @param {'dev'|'test'|'prod'} [options.env] 环境名；不传表示不启用环境隔离。
 * @returns {string} 标准 cloudPath，例如 "audio/102/100023.mp3"。
 */
export function buildAudioCloudPath(sceneId, sentenceId, options = {}) {
  const safeSceneId = String(sceneId);
  const safeSentenceId = String(sentenceId);
  const env = options.env ? String(options.env) : '';
  const prefix = env ? `audio/${env}` : 'audio';
  return `${prefix}/${safeSceneId}/${safeSentenceId}.mp3`;
}
```

```js
/**
 * @description 获取音频资源引用信息；优先查资源索引，失败后按规范 cloudPath 降级。
 * @param {number} sceneId 场景 ID。
 * @param {string|number} sentenceId 句子 ID。
 * @returns {Promise<{fileID?: string, cloudPath: string}>} 播放所需的信息。
 */
export async function getAudioAsset(sceneId, sentenceId) {
  const cloudPath = buildAudioCloudPath(sceneId, sentenceId);
  return { cloudPath };
}
```

说明：
- 本 PRD 不限定 `audio_assets` 存在于云数据库或其它存储，但要求“统一入口 + 可替换实现”。
- 若当前版本暂未接入资源索引，可先只返回 `cloudPath`，后续不改业务调用方即可升级为 `fileID` 优先。

## 6. 运营/内容侧：按场景批量上传工作流

### 6.1 本地目录规范（与云端一致）
内容侧本地也建议按场景建目录：
- `102/100023.mp3`
- `201/000123.mp3`

批量上传时，目标云端路径：
- `audio/102/100023.mp3`
- `audio/201/000123.mp3`

### 6.2 覆盖策略（必须明确）
同一个 `(sceneId, sentenceId)` 上传新文件时的规则：
- 允许覆盖同名 `cloudPath`（视平台能力）
- 同时更新 `audio_assets` 中该键对应记录的 `fileID` 与 `updatedAt`

## 7. 异常与降级策略

### 7.1 音频缺失
触发：索引查不到且云端拉取失败 / 文件不存在。

处理：
- 展示“该句音频缺失/正在补齐”的轻提示
- 不阻断学习流程：仍展示文本、拼音、中文释义
- 允许用户重试拉取

### 7.2 网络/下载失败
处理：
- 自动重试（次数可配置）
- 失败后降级为“无音频模式”，保留可继续学习的文本内容

## 8. 验收标准
- 云端音频按 `audio/{sceneId}/{sentenceId}.mp3` 组织，可按 `sceneId` 作为目录进行批量管理。
- 任意业务模块只需提供 `sceneId + sentenceId` 即可获取音频引用信息，不出现多处拼接路径的分叉实现。
- 能检测并提示“缺失音频”，且不阻断核心学习链路。
- 替换某个句子音频后，小程序端能获取到最新资源（若启用索引则以 `fileID` 更新为准）。

## 9. 后续迭代方向（可选）
- 引入版本维度：`audio/{sceneId}/{sentenceId}/v{n}.mp3`，索引表新增 `version` 并设置 `(sceneId, sentenceId, version)` 唯一键。
- 引入音色/语速维度：扩展为 `audio/{sceneId}/{voice}/{sentenceId}.mp3`，由索引对齐“默认音色”。
- 增加“场景音频覆盖率”看板：按场景统计已上传/缺失数量，支持一键导出缺失清单。

