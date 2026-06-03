# Filio E2E 测试文档

本目录包含 Filio 项目的端到端（E2E）测试文档。

## 📚 文档列表

### 1. [测试指南](./TESTING_GUIDE.md) 📖
**完整的测试指南和最佳实践**

包含内容：
- 快速开始指南
- 测试环境配置
- 测试用例分类（认证、Dashboard、客户管理、Portal、API）
- 运行测试命令
- 常见问题解答
- CI/CD 集成
- 测试最佳实践

适合：新手入门、全面了解测试体系

---

### 2. [测试用例清单](./TEST_CASES.md) 📋
**详细的测试用例列表和执行状态**

包含内容：
- 所有测试用例的详细列表（69 个测试用例）
- 每个测试的前置条件、步骤、预期结果
- 测试状态（✅ 通过 / ❌ 失败 / 🔧 需修复）
- 测试优先级（P0/P1/P2/P3）
- 测试数据配置
- 已修复和待修复问题汇总
- 测试覆盖率统计

适合：执行测试、跟踪进度、问题排查

---

### 3. [快速参考](./TESTING_QUICK_REFERENCE.md) ⚡
**一页纸快速参考指南**

包含内容：
- 快速开始命令
- 常用测试命令
- 测试数据（验证码 9527、测试用户）
- 测试状态概览
- 最近修复和待修复问题
- 故障排查技巧

适合：日常开发、快速查询

---

## 🚀 快速开始

```bash
# 1. 安装依赖
pnpm install
pnpm exec playwright install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，添加测试凭据

# 3. 启动开发服务器
pnpm dev

# 4. 运行测试
pnpm test:e2e
```

---

## 📊 测试状态

**总体通过率**: 90% (62/69 测试通过)

| 模块 | 通过率 | 状态 |
|------|--------|------|
| Dashboard | 100% (18/18) | ✅ 完美 |
| Portal | 100% (10/10) | ✅ 完美 |
| API | 81% (13/16) | ✅ 良好 |
| 认证 | 82% (9/11) | ⚠️ 需优化 |
| 客户管理 | 78% (7/9) | ⚠️ 需优化 |

---

## 🔑 重要测试数据

### Portal 验证码
```
固定验证码: 9527
```
在 Portal 入口页面测试中使用此验证码。

### 测试用户
```
邮箱: test@filio.example.com
密码: TestPassword123!
```

---

## 📝 最近更新

### 2026-04-21 优化

1. ✅ **修复 Portal 页面测试**
   - 更新 PortalPage POM 支持验证码流程
   - 添加验证码 9527 测试用例

2. ✅ **修复页面加载超时**
   - 将 `waitForLoadState('networkidle')` 改为 `domcontentloaded`
   - 减少超时时间：45s → 30s

3. ✅ **优化测试性能**
   - 增加并行度：1 worker → 2/4 workers
   - 预计测试时间减少 50%

---

## 🛠️ 常用命令

```bash
# 运行所有测试
pnpm test:e2e

# UI 模式（推荐用于调试）
pnpm test:e2e:ui

# 烟雾测试（快速验证）
pnpm test:e2e:smoke

# 查看测试报告
pnpm exec playwright show-report

# 调试特定测试
pnpm exec playwright test --debug tests/e2e/portal/portal.spec.ts
```

---

## 📖 相关文档

- [项目说明 (CLAUDE.md)](../CLAUDE.md)
- [测试计划 (旧版)](./TEST_CASES_OLD.md)
- [Playwright 官方文档](https://playwright.dev/)

---

## 🤝 贡献指南

### 添加新测试

1. 在 `tests/e2e/` 下创建测试文件
2. 如需要，在 `tests/pages/` 下创建 POM
3. 更新 `TEST_CASES.md` 文档
4. 运行测试验证

### 报告问题

如发现测试问题，请：
1. 查看 [常见问题](./TESTING_GUIDE.md#常见问题)
2. 检查 [测试用例清单](./TEST_CASES.md) 中的已知问题
3. 提交 GitHub Issue

---

## 📞 支持

- 📧 Email: dev@filio.uk
- 💬 GitHub Issues: [提交问题](https://github.com/your-repo/issues)
- 📚 文档: [完整测试指南](./TESTING_GUIDE.md)

---

**维护者**: Filio 开发团队  
**最后更新**: 2026-04-21  
**版本**: 3.0
