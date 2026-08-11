# BBOSS Xuebai Tracking

## 已配置
- Supabase URL: `https://hjuemoaxwotvgvppuits.supabase.co`
- Publishable key 已写入 `config.js`
- 数据表：`public.xuebai_weekly`

## 文件
- `index.html`：Dashboard
- `submit.html`：M2微信填报入口
- `config.js`：Supabase连接与M2/M3基线
- `styles.css`：样式

## GitHub Pages部署
1. 在 GitHub 新建 Repository，例如 `xuebai-tracking`
2. 上传本项目四个文件到仓库根目录
3. Repository → Settings → Pages
4. Source 选择 `Deploy from a branch`
5. Branch 选择 `main`，Folder 选择 `/ (root)`，Save
6. 等待GitHub生成网址，例如：
   `https://<username>.github.io/xuebai-tracking/`

Dashboard:
`https://<username>.github.io/xuebai-tracking/`

M2填报：
`https://<username>.github.io/xuebai-tracking/submit.html`

## 当前逻辑
- Dashboard读取Supabase所有历史填报，并自动取每个M2最新一条。
- 6–7月铺货基数与8月目标为固定基线。
- M2每周填报：
  - 6–7月累计复购
  - 8月累计铺货
  - 8月累计复购
- M3、苏东TTL、累计铺货和累计复购率自动计算。
- 未提交名单自动显示。

## 注意
Publishable key可用于浏览器前端；不要把Supabase secret/service_role key或数据库密码放进GitHub。
