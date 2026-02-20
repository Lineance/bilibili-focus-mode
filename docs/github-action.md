# 使用指南

## 1. 自动 CI 检查（每次 push）

每次推送到 main 或 master 分支，或创建 Pull Request 时，会自动：
- ✅ 运行代码检查（lint）
- ✅ 运行 TypeScript 类型检查
- ✅ 运行所有测试
- ✅ 构建扩展
- ✅ 上传构建产物

## 2. 自动发布（打标签时）

当你推送一个版本标签（如 v1.0.0）时，会自动：
- ✅ 运行所有测试
- ✅ 构建扩展
- ✅ 将 dist 文件夹打包成 zip
- ✅ 创建 GitHub Release
- ✅ 上传 zip 文件到 Release

## 3. 发布新版本

### 1. 确保所有更改已提交

```bash
git add -A
git commit -m "feat: add new feature"
```

### 2. 打版本标签（遵循语义化版本）

```bash
git tag v1.0.0
```

### 3. 推送标签到 GitHub

```bash
git push origin main
git push origin v1.0.0
```

推送标签后，GitHub Actions 会自动：
1. 运行测试
2. 构建项目
3. 创建 Release
4. 上传 bilibili-focus-mode-v1.0.0.zip

## 4. 手动触发构建：

进入 GitHub 仓库 → Actions → "Build and Release Extension" → Run workflow

## 5. 下载构建产物

发布后，用户可以在 GitHub Release 页面下载 bilibili-focus-mode-v1.0.0.zip，然后：
1. 解压 zip 文件
2. 打开 Chrome 扩展管理页面（chrome://extensions/）
3. 开启开发者模式
4. 点击"加载已解压的扩展程序"
5. 选择解压后的文件夹

## 6. 工作流文件说明
- .github/workflows/ci.yml - 持续集成，每次 push 时运行
- .github/workflows/build-and-release.yml - 构建和发布，打标签时触发