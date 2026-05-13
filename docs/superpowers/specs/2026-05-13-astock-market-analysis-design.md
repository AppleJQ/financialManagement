# A股行情分析网站 - 设计文档

## 概述

个人A股行情分析网站，用于查看个股K线图（日线/周线/月线）和浏览热门板块、热门个股推荐。仅个人使用，无需登录注册。纯前端项目，部署到 Vercel（免费）。

## 技术栈

- **框架：** React + TypeScript + Vite
- **样式：** TailwindCSS
- **K线图：** klinecharts
- **数据源：** 东方财富公开接口（通过 JSONP 跨域调用，无需后端）
- **部署：** Vercel（免费）

## 架构

纯前端架构，无后端服务器：

```
浏览器(React) → JSONP → 东方财富公开API → A股数据
```

通过 JSONP 绕过 CORS 限制，所有数据在前端获取和处理。

## 项目结构

```
financialManagement/
├── src/
│   ├── components/
│   │   ├── StockSearch.tsx
│   │   └── KLineChart.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── StockDetail.tsx
│   ├── services/
│   │   ├── jsonp.ts              # JSONP 请求封装
│   │   └── eastmoney.ts          # 东方财富API封装
│   ├── utils/
│   │   └── stock.ts              # 股票代码工具函数
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## 东方财富 API 接口映射

### 通用约定

- 股票代码格式：6位数字字符串，如 `000001`（平安银行）、`600519`（贵州茅台）
- secid 编码规则：`1` = 沪市（6开头），`0` = 深市（0/3开头），前端自动转换
- 所有接口通过 JSONP 调用（添加 `cb` 参数）
- 日期格式：`YYYYMMDD`

### 1. K线数据

**接口地址：**
```
https://push2his.eastmoney.com/api/qt/stock/kline/get
```

**参数：**
| 参数 | 值 | 说明 |
|------|-----|------|
| secid | `{market}.{code}` | 市场+代码，如 `0.000001` |
| fields1 | `f1,f2,f3,f4,f5,f6` | 基础字段 |
| fields2 | `f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` | K线数据字段 |
| klt | `101`/`102`/`103` | 日K/周K/月K |
| fqt | `1` | 前复权 |
| beg | `YYYYMMDD` | 起始日期（可选，默认0表示不限） |
| end | `YYYYMMDD` | 结束日期（可选，默认20500101） |
| lmt | 数字 | 返回条数限制（可选，如120） |
| cb | 回调函数名 | JSONP回调 |

**返回数据格式（klines数组中每条）：**
```
日期,开盘价,收盘价,最高价,最低价,成交量,成交额,振幅,涨跌幅,涨跌额,换手率
```
示例：`"2025-01-02,12.10,12.35,12.50,12.05,1234567,1523456789.0,3.72,2.32,0.28,1.23"`

### 2. 股票搜索（实时行情全量数据）

**接口地址：**
```
https://push2.eastmoney.com/api/qt/clist/get
```

**参数：**
| 参数 | 值 | 说明 |
|------|-----|------|
| pn | `1` | 页码 |
| pz | `5000` | 每页条数 |
| po | `1` | 排序方式 |
| np | `1` | 不分页 |
| fltt | `2` | 精度 |
| invt | `2` | 不确定 |
| fid | `f3` | 排序字段 |
| fs | `m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23` | 沪深A股筛选 |
| fields | `f2,f3,f4,f5,f6,f7,f8,f12,f14,f15,f16,f17,f18` | 字段列表 |
| cb | 回调函数名 | JSONP回调 |

**关键字段映射：**
| 字段 | 说明 |
|------|------|
| f12 | 股票代码 |
| f14 | 股票名称 |
| f2 | 最新价 |
| f3 | 涨跌幅 |
| f4 | 涨跌额 |
| f5 | 换手率 |
| f6 | 成交额 |
| f7 | 振幅 |
| f15 | 最高价 |
| f16 | 最低价 |
| f17 | 开盘价 |
| f18 | 昨收价 |

前端加载全量数据后，在内存中按关键词过滤代码和名称实现搜索。

### 3. 板块资金流向（热门板块）

**接口地址：**
```
https://push2.eastmoney.com/api/qt/clist/get
```

**参数（行业板块）：**
| 参数 | 值 | 说明 |
|------|-----|------|
| fs | `m:90+t:2+f:!50` | 行业板块筛选 |
| fields | `f2,f3,f4,f8,f12,f14,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87` | 字段列表 |
| fid | `f62` | 按主力净流入排序 |
| po | `1` | 降序 |
| pz | `10` | 取前10 |
| cb | 回调函数名 | JSONP回调 |

**关键字段：**
| 字段 | 说明 |
|------|------|
| f14 | 板块名称 |
| f3 | 涨跌幅 |
| f62 | 主力净流入 |
| f84 | 领涨股代码 |
| f104 | 领涨股名称 |
| f105 | 领涨股涨跌幅 |

## 前端缓存策略

由于无后端，使用前端内存缓存：

- 股票列表（搜索用）：首次加载后缓存在全局状态，TTL 24小时
- K线数据：按 `{code}_{period}` 为key缓存在组件state中，切换周期时复用
- 热门板块/个股数据：TTL 5分钟，使用 `setTimeout` 定时清除
- 使用 React Context 或 zustand 管理全局缓存状态

## 输入验证

- 股票代码必须是6位数字字符串，否则提示错误
- period 只接受 daily/weekly/monthly
- 搜索关键词至少2个字符
- 无效股票代码：K线接口会返回空数据，前端显示"未找到该股票"

## 前端页面

### 首页 (Home)

- 顶部：标题 + 股票搜索框
- 热门板块区域：卡片式展示，显示板块名称、涨跌幅、资金净流入、领涨股
- 热门个股区域：表格展示，显示股票代码/名称、最新价、涨跌幅、成交额、换手率
- 点击个股跳转到个股详情页（/stock/:code）
- 点击板块：跳转到该板块领涨股的详情页（简化处理，不设板块详情页）
- 加载中：显示骨架屏/加载动画
- 空数据（周末/节假日）：显示提示"当前非交易时段，显示最近交易日数据"
- 搜索框输入防抖：300ms

### 个股详情页 (StockDetail)

- 顶部：返回按钮 + 股票名称代码 + 搜索框
- 实时行情栏：最新价、涨跌幅、开盘/最高/最低/成交量（从搜索接口缓存数据中获取）
- 周期切换标签：日线/周线/月线
- K线图区域：使用 klinecharts 渲染，支持缩放、十字光标
- 均线叠加：MA5/MA10/MA20/MA60（由 klinecharts 内置指标计算）
- 加载中：K线区域显示加载动画
- 已请求过的周期数据缓存在前端组件state中，切换周期无需重新请求

## 推荐逻辑

### 热门板块

从东方财富板块资金流向接口获取，按主力净流入量降序排列，取 Top 10。接口直接返回排序结果。

### 热门个股

从股票全量行情数据中计算，采用排名加权法：

```typescript
// 获取全量A股数据
const stocks = await fetchAllStocks()

// 按成交额排名（降序）
const sortedByAmount = [...stocks].sort((a, b) => b.amount - a.amount)
sortedByAmount.forEach((s, i) => s.amountRank = i + 1)

// 按换手率排名（降序）
const sortedByTurnover = [...stocks].sort((a, b) => b.turnoverRate - a.turnoverRate)
sortedByTurnover.forEach((s, i) => s.turnoverRank = i + 1)

// 综合评分（分数越低越热门）
stocks.forEach(s => {
  s.score = 0.6 * s.amountRank + 0.4 * s.turnoverRank
})

// 按综合评分升序排列，取 Top 20
const hotStocks = stocks.sort((a, b) => a.score - b.score).slice(0, 20)
```

## 部署

### 本地开发

```bash
npm install
npm run dev   # Vite dev server，直接访问东方财富API（JSONP无CORS问题）
```

无需后端服务器，无需代理配置。

### Vercel 部署

1. 初始化 Git 仓库并推送到 GitHub
2. Vercel 导入 GitHub 仓库
3. Framework Preset 选择 Vite
4. 自动构建部署，零配置

Vercel 免费额度：
- 带宽：100GB/月（足够个人使用）
- 构建时长：6000分钟/月
- 无需付费

## 核心依赖

### package.json

```
react
react-dom
react-router-dom
klinecharts
tailwindcss
```

## 风险和注意事项

1. **接口稳定性：** 东方财富公开接口非官方API，可能随时变动。建议封装统一的API调用层，接口变化时只需修改 `eastmoney.ts`
2. **频率限制：** 高频请求可能被封IP。JSONP请求加节流，搜索框300ms防抖，避免重复请求
3. **数据准确性：** 数据来自东方财富，仅供参考，不构成投资建议
4. **HTTPS：** 东方财富接口使用 HTTPS，不存在混合内容问题
