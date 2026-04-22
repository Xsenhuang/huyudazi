# PRD｜模块「场景闯关」

## 1. 背景与目标

### 1.1 背景
小程序当前以「大类（分类）→ 小场景（Scene）→ 学习/闯关」为主路径，用户通过逐个场景完成听力、跟读、实战等任务，最终获得场景掌握度与收集进度。

现有实现已具备主要页面与基础进度存储能力，但产品侧需要一份独立 PRD，用于对齐：
- 闯关模块的产品定义与边界
- 关卡结构与通关规则
- 进度系统与状态管理要求
- 异常与降级策略
- 验收口径与后续迭代方向

### 1.2 目标
- 让用户以「短周期、明确反馈」的方式学习与练习上海话，通过闯关提升场景掌握度。
- 以场景为单位沉淀进度数据，保证中断可恢复、数据一致性可控。
- 明确关卡数据结构、交互规则与验收标准，便于持续扩展更多场景与关卡类型。

### 1.3 非目标
- 不定义新的账号体系/多端同步能力（当前默认本地存储）。
- 不引入复杂的学习路径推荐算法（仅在数据层预留扩展位）。

## 2. 名词与范围

### 2.1 关键名词
- 大类/分类（Category）：场景集合入口（首页 Tab）。
- 小场景（Scene）：用户闯关的最小单元，例如「点咖啡」「问路」。
- 关卡（Level）：场景内的阶段任务，按顺序组成闯关流程。
- 掌握度（Mastery）：以 L0~L3 表示用户对该场景的掌握状态。
- 收集品（Collected）：达到指定掌握度后计入的完成数量（用于成长反馈/成就）。

### 2.2 掌握度定义（与实现对齐）
当前掌握度枚举（代码对齐）：[store.js:SCENE_MASTERY](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/utils/store.js#L23-L28)
- L0：未学
- L1：听懂、跟得上
- L2：说得出、用得上
- L3：能应变、能实战

说明：当前实现仅在「实战」完成时更新到 L3（见 6.3），L1/L2 的更新规则在本 PRD 中补齐为产品规则；是否落地到实现属于后续迭代任务。

## 3. 用户画像与核心诉求

### 3.1 用户画像
- 新手：对上海话熟悉度低，目标是“听懂常用表达”，需要强引导与低挫败反馈。
- 轻度使用者：能听懂部分表达，目标是“敢开口”，需要跟读、复述与可重复练习。
- 目的型用户：希望在特定生活场景中快速掌握对话套路，重视「实战对话」与结果反馈。

### 3.2 核心诉求
- 任务短、反馈快：每关结束有明确结果与下一步指引。
- 可中断可恢复：离开后能回到上一次关卡继续。
- 容错与降级：音频、语音合成失败时仍能学习（文本/pinyin 可继续）。

## 4. 信息架构与主流程

### 4.1 页面入口（现状）
- 首页（大类 Tab + 场景卡片）：[index.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/index/index.js)
- 分类下的小场景列表页（可选入口）：[scene-list.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/scene-list/scene-list.js)

### 4.2 场景闯关主流程（建议口径）
1) 选择场景（来自首页或场景列表）
2) 场景导入学习（词汇学习/复习）  
3) 关卡 1：听力（单选题）
4) 关卡 2：跟读（播放句子 + 录音）
5) 关卡 3：实战（对话树选择）
6) 通关结算：更新掌握度、回到列表并刷新状态

现状页面对应：
- 词汇学习/复习：[learning.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/learning/learning.js)
- 听力：[level-listening.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-listening/level-listening.js)
- 跟读：[level-shadowing.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-shadowing/level-shadowing.js)
- 实战：[level-practical.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-practical/level-practical.js)

## 5. 功能需求（FR）

### 5.1 场景选择与可用性判断
#### 5.1.1 场景入口
- 用户可在首页点击场景卡片进入闯关流程。
- 若有单独场景列表页，也可从分类页进入场景闯关。

#### 5.1.2 关卡内容未配置提示
- 若场景未配置关卡内容（例如听力数据为空），需提示“该场景关卡正在开发中”，并阻止进入。
- 现状实现对齐：
  - 首页判断听力是否存在：[index.js:handleSceneTap](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/index/index.js#L202-L233)
  - 分类场景列表判断听力是否存在：[scene-list.js:handleSceneTap](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/scene-list/scene-list.js#L48-L82)

### 5.2 进度恢复（中断续玩）
#### 5.2.1 规则
- 若该场景未完成（掌握度 < L3），进入时默认恢复到该场景的「上一次停留关卡」。
- 若该场景已完成（掌握度 = L3），进入时从头开始（或进入复习模式，见 9.2）。

#### 5.2.2 存储与读取
- 存储键：`lastVisitedLevel[sceneId] = pagePath`
- 现状实现对齐：
  - 写入：各关卡 onLoad 写入 lastVisitedLevel（如 listening/shadowing/practical/learning）
  - 读取/跳转：入口页 handleSceneTap 尝试跳转 lastVisitedLevel
  - 数据层实现：[store.js:saveLastVisitedLevel/getLastVisitedLevel](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/utils/store.js#L181-L208)

#### 5.2.3 安全降级
- 若 lastVisitedLevel 指向已删除/下线页面，需要兜底到一个“安全页面”（建议：该场景的实战页或 learning 页）。
- 现状实现已有针对 `level-substitution` 的兼容兜底（入口页做 URL 修正）。

### 5.3 关卡 0：词汇学习与复习（Learning）
#### 5.3.1 目的
在正式闯关前，先完成本场景核心词汇的认知与快速复习，降低后续听力与实战挫败感。

#### 5.3.2 规则
- 若场景存在 `vocabularies`：
  - 先展示词汇列表与发音播放
  - 用户点击「开始复习」进入复习题（选择题）
  - 复习完成后进入关卡 1（听力）
- 若场景无词汇：跳过词汇/复习，直接进入关卡 1（听力）

#### 5.3.3 现状实现对齐
- 判断是否有词汇并决定跳转：[learning.js:initScene/startLearningLevels](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/learning/learning.js#L38-L158)

### 5.4 关卡 1：听力（Listening）
#### 5.4.1 玩法
- 每题播放一段语音（可重播）
- 用户从 2~4 个选项中选择正确含义（或正确回复）
- 选对自动进入下一题；选错提示“再试一次”并允许重选
- 全部题目完成后进入下一关（跟读）

#### 5.4.2 结算与掌握度
产品规则建议：
- 听力关完成后将掌握度更新到至少 L1（若当前为 L0/L1 则更新为 L1；若已为更高则不降级）

现状实现对齐：
- 下一关跳转：听力结束后 `goNextLevel` 跳到跟读页：[level-listening.js](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-listening/level-listening.js#L121-L126)

### 5.5 关卡 2：跟读（Shadowing）
#### 5.5.1 玩法
- 展示一句上海话原句 + 拼音（支持声调可视化）
- 用户可播放原音并录音跟读
- 完成当前句后进入下一句
- 全部句子完成后进入下一关（实战）

#### 5.5.2 权限与资源释放
- 进入录音前必须检查麦克风权限；无权限则提示并中断
- 页面离开/卸载时必须释放音频与录音占用，防止麦克风残留占用

现状实现对齐：
- 权限检查/录音流程：[level-shadowing.js:startRecord/stopRecord](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-shadowing/level-shadowing.js#L112-L145)
- 统一释放资源：[level-shadowing.js:cleanupMediaOnLeave](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-shadowing/level-shadowing.js#L61-L70)

#### 5.5.3 结算与掌握度
产品规则建议：
- 跟读关完成后将掌握度更新到至少 L2（同样遵循不降级原则）

### 5.6 关卡 3：实战对话（Practical）
#### 5.6.1 玩法
- 对话以“对话树”推进：
  - NPC 先说（自动展示）
  - 用户从选项中选择一句回复
  - 根据选项的 next 指向进入下一个节点
- 对话结束后提供“结算/通关”按钮

#### 5.6.2 通关结算
- 通关后更新掌握度为 L3
- 清除 lastVisitedLevel（完成后不需要恢复到中间页）
- 返回列表并刷新该场景状态

现状实现对齐：
- 结算逻辑：[level-practical.js:finishDialogue](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/pages/level-practical/level-practical.js#L151-L175)
- 进度更新方法：[store.js:updateSceneProgress](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/utils/store.js#L56-L85)

## 6. 数据与状态管理（重点）

### 6.1 数据分层原则
为了保证状态管理与数据一致性，闯关模块的数据建议分为三层：
- 常量数据层（只读）：场景内容、关卡题目、对话树等（建议全部常量化）
- 进度数据层（可写）：掌握度、收集数、上次停留页（建议统一由 store 管理）
- 页面临时状态（短生命周期）：当前题目索引、已选项、录音路径等

现状常量入口：`constants/` 与 `constants/scenes/`（场景数据按分类拆分）。

### 6.2 进度数据结构（现状）
本地存储键：`shanghai_roam_progress`  
数据结构（对齐 [store.js:getProgress](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/utils/store.js#L30-L54)）：
- mastery：`{ [sceneId: number]: 'L0' | 'L1' | 'L2' | 'L3' }`
- collectedCount：number（达到 L3 的场景数量累计）
- lastVisitedLevel：`{ [sceneId: number]: string }`

### 6.3 掌握度更新规则（产品口径）
统一原则：不降级（只允许从低到高），与现有 updateSceneProgress 一致。
- 完成听力关：更新到 L1
- 完成跟读关：更新到 L2
- 完成实战关：更新到 L3，并 collectedCount +1（若首次达到 L3）

注：当前实现仅在 L3 更新。若要补齐 L1/L2，需要在 listening/shadowing 结算点调用 `updateSceneProgress(sceneId, 'L1'/'L2')`。

### 6.4 数据一致性与边界
必须避免的风险：
- lastVisitedLevel 与 mastery 不一致导致“已完成仍恢复到中间页”
- 场景数据结构变更导致旧进度字段失效（例如页面路径变动）
- 并发写入覆盖（同一页面多次 setStorageSync 的时序问题）

建议策略：
- 入口恢复逻辑以 mastery 为第一优先级（L3 不恢复）
- lastVisitedLevel 写入只在 onLoad 时更新，避免频繁写入（现状符合）
- 对已下线页面路径做迁移映射（现状已有部分兜底）

## 7. 音频/语音能力与降级

### 7.1 语音播放
依赖：
- 文本转语音：`VoiceAPI.textToSpeech(...)`
- 播放器：`audioService.play(...)` / `audioService.stop()`

降级策略：
- TTS 失败：提示“语音获取失败”，但保留文本/拼音可继续答题/学习
- 音频未配置：提示“暂无发音”，允许继续下一步

### 7.2 录音
依赖：
- `recordService.checkAuth()` 检查权限
- `recordService.start()` / `recordService.stop(...)` 控制录音

降级策略：
- 无麦克风权限：提示并允许用户跳过录音（产品建议：可添加“跳过本句/跳过跟读关”开关，见 9.1）

## 8. 组件与复用建议

### 8.1 现有组件
- 场景卡片：[scene-card](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/components/scene-card/index.wxml)
- 词汇卡片：[vocab-card](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/components/vocab-card/index.wxml)
- 对话流：[dialogue-flow](file:///Users/kaijimima1234/Desktop/%E4%B8%8A%E6%B5%B7%E8%AF%9D%E6%90%AD%E5%AD%90/Shanghainese%20buddy/shanghainese-buddy-miniapp/miniprogram/components/dialogue-flow/index.wxml)

### 8.2 复用方向（产品对研发的约束）
- 音频播放/停止统一封装（已存在 audioService）
- 进度写入统一走 store（避免页面自行拼装 storage 结构）
- 各关卡的“结算与升级”逻辑建议抽成复用函数，避免每个页面重复实现

## 9. 迭代建议（可选项）

### 9.1 降低挫败选项
- 听力题可增加“查看提示/显示文本”开关（默认关闭）
- 跟读可增加“跳过本句/跳过跟读关”能力（不影响继续实战，但掌握度上限按规则限制）

### 9.2 已完成场景的再进入策略
二选一（需产品确认）：
- A. 直接进入“复习模式”（不计入进度，只做重复练习）
- B. 仍从词汇/听力开始，但不再计入 collectedCount 与升级

## 10. 埋点与指标（建议）
- 入口点击：分类 ID、场景 ID、掌握度
- 关卡完成率：每关开始/完成/退出
- 中断恢复成功率：使用 lastVisitedLevel 恢复的次数与成功跳转率
- 语音失败率：TTS 失败/无配置的占比
- 录音授权率：首次触发授权的通过率

## 11. 验收标准（AC）

### 11.1 主链路
- 从首页/场景列表进入任意已配置场景，能完整走通「词汇（如有）→ 听力 → 跟读 → 实战 → 结算返回」。
- 任意环节退出小程序或返回上级，再次进入同一场景时能恢复到上一次停留页（掌握度 < L3 时）。
- 完成实战结算后，该场景掌握度变为 L3，且该场景不再恢复到中间页。

### 11.2 异常链路
- 场景未配置听力时不可进入并提示“开发中”。
- TTS 失败时不崩溃，能继续完成题目/关卡。
- 无麦克风权限时提示明确，且不会导致页面卡死或麦克风占用残留。

## 12. 待确认问题（Open Questions）
- L1/L2 是否要在当前版本落地到实际进度更新？还是仅保留 PRD 口径？
- 已完成场景的再进入策略选 A 还是 B（见 9.2）？

