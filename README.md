# 今日吃什么 (WhatToEat)

一款面向大学生的智能饮食规划 APP，根据预算和食堂菜单，使用 AI 为用户规划每天吃什么。

## 功能特性

- **智能推荐**：根据预算、偏好和历史记录，AI 自动生成每日三餐推荐
- **预算管理**：设置月度预算，自动计算每日可用金额，实时追踪消费
- **菜单管理**：支持多食堂、多窗口的菜品录入和管理
- **拍照导入**：拍摄菜单照片，AI 自动识别并导入菜品信息
- **个性化设置**：口味偏好、饮食目标、禁忌食物等个性化配置
- **避免重复**：自动记录历史，避免连续推荐相同菜品

## 技术栈

- **框架**：React Native + TypeScript
- **状态管理**：Zustand
- **本地存储**：SQLite + AsyncStorage
- **UI 组件**：React Native Paper
- **AI 服务**：通义千问 (Qwen) API

## 项目结构

```
src/
├── screens/           # 页面组件
│   ├── HomeScreen     # 首页 - 今日推荐
│   ├── MenuScreen     # 菜单管理
│   ├── BudgetScreen   # 预算统计
│   └── SettingsScreen # 设置
├── components/        # 通用组件
│   ├── MealCard       # 餐次卡片
│   ├── BudgetProgress # 预算进度
│   └── DishItem       # 菜品项
├── stores/            # Zustand 状态管理
│   ├── menuStore      # 菜单状态
│   ├── budgetStore    # 预算状态
│   ├── planStore      # 计划状态
│   ├── preferenceStore# 偏好状态
│   └── apiConfigStore # API 配置
├── services/          # 服务层
│   ├── dbService      # SQLite 数据库操作
│   └── aiService      # AI 推荐服务
├── utils/             # 工具函数
│   ├── budget         # 预算计算
│   └── nutrition      # 营养分析
└── types/             # TypeScript 类型定义
```

## 快速开始

### 环境要求

- Node.js >= 20
- React Native 开发环境 (Android Studio / Xcode)
- 通义千问 API Key

### 安装依赖

```bash
npm install
```

### 运行 Android

```bash
npm run android
```

### 运行 iOS

```bash
cd ios && pod install && cd ..
npm run ios
```

## 使用说明

1. **配置 API Key**
   - 打开 "设置" 页面
   - 选择 AI 服务商（通义千问）
   - 输入你的 API Key
   - 点击 "测试连接" 验证

2. **添加食堂菜单**
   - 打开 "菜单管理" 页面
   - 点击 "添加食堂" 创建食堂
   - 在食堂下添加菜品（名称、价格、分类、标签）

3. **设置预算**
   - 打开 "预算统计" 页面
   - 设置月度预算金额

4. **生成推荐**
   - 回到首页
   - 点击 "生成今日推荐" 按钮
   - AI 将根据你的预算和偏好生成三餐推荐

## 获取 API Key

### 通义千问

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 注册/登录账号
3. 创建 API Key
4. 在 APP 设置中配置

## 许可证

MIT License
