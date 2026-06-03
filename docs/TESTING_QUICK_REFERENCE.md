# Filio E2E 测试快速参考

## 快速开始

```bash
# 1. 安装依赖
pnpm install
pnpm exec playwright install

# 2. 启动开发服务器
pnpm dev

# 3. 运行测试
pnpm test:e2e
```

---

## 常用命令

| 命令 | 说明 | 用途 |
|------|------|------|
| `pnpm test:e2e` | 运行所有测试 | 日常开发 |
| `pnpm test:e2e:ui` | UI 模式 | 调试测试 |
| `pnpm test:e2e:smoke` | 烟雾测试 | 快速验证 |
| `pnpm exec playwright test --debug` | 调试模式 | 单步调试 |
| `pnpm exec playwright show-report` | 查看报告 | 分析结果 |

---

## 测试数据

### Portal 验证码
```
固定验证码: 9527
```

### 测试用户
```
邮箱: test@filio.example.com
密码: TestPassword123!
```

### 环境变量 (.env.local)
```bash
E2E_TEST_EMAIL=test@filio.example.com
E2E_TEST_PASSWORD=TestPassword123!
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

---

## 测试状态概览

| 模块 | 通过率 | 状态 |
|------|--------|------|
| Dashboard | 100% | ✅ 完美 |
| Portal | 100% | ✅ 完美 |
| API | 81% | ✅ 良好 |
| 认证 | 82% | ⚠️ 需优化 |
| 客户管理 | 78% | ⚠️ 需优化 |
| **总体** | **90%** | **✅ 良好** |

---

## 最近修复 (2026-04-21)

✅ Portal 页面测试 - 支持验证码 9527 流程
✅ Login/Register 超时 - 改用 domcontentloaded
✅ 测试超时优化 - 45s → 30s
✅ 并行度优化 - 1 worker → 2/4 workers

---

## 待修复问题

1. **认证守卫测试** - 需要真实凭据
2. **客户管理测试** - 需要测试数据 fixture
3. **Xero 注册按钮** - UI 缺失或更新测试

---

## 文档链接

- 📖 [完整测试指南](./TESTING_GUIDE.md)
- 📋 [测试用例清单](./TEST_CASES.md)
- 🏗️ [项目说明](../CLAUDE.md)

---

## 故障排查

### 测试超时
```bash
# 增加超时时间
test.setTimeout(60000)
```

### 元素未找到
```typescript
// 等待元素可见
await page.locator('button').waitFor({ state: 'visible' })
```

### 认证失败
```bash
# 检查环境变量
echo $E2E_TEST_EMAIL
echo $E2E_TEST_PASSWORD
```

---

## 联系支持

- GitHub Issues: [提交问题](https://github.com/your-repo/issues)
- Playwright 文档: [playwright.dev](https://playwright.dev/)

---

**最后更新**: 2026-04-21
