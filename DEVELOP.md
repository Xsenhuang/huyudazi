# 本地开发与初始化（微信开发者工具 + 云开发默认环境）

## 1. 打开项目

1) 微信开发者工具 → 导入项目  
2) 选择本目录 `shanghainese-buddy-miniapp`  
3) AppID 可先用测试号（或你自己的小程序 AppID）

## 2. 开通云开发（默认环境）

1) 工具栏 → 云开发  
2) 开通云开发并选择“默认环境”（开发者工具会自动记住当前环境）  
3) 确认 `project.config.json` 里 `cloudfunctionRoot=cloudfunctions/`、`miniprogramRoot=miniprogram/`

## 3. 创建云数据库 collections

请先创建以下集合（名称必须一致）：
- `scenes`
- `levels`
- `sentences`
- `dialogues`
- `quizzes`
- `user_progress`

字段结构建议见：`/reports/huyu_products/cloudbase_delivery_waimai_menjin/schema.md`（你也可以直接按需要逐步补齐字段）。

## 4. 部署云函数

在开发者工具左侧“云函数”面板中，依次上传并部署：
- `import-content`
- `content-getScene`
- `content-getLevel`
- `content-getQuiz`
- `progress-get`
- `progress-updateAfterQuiz`
- `review-getDaily`

## 5. 初始化导入内容（外卖门禁 5 关）

1) 确认 `cloudfunctions/content_waimai_menjin_v1.jsonl` 存在  
2) 在云函数面板选择 `import-content` → 右键 → 本地调试/云端调用  
3) 返回 `ok=true` 表示导入成功

## 6. 运行小程序

运行后首页点击“进入外卖门禁场景”即可开始体验。

