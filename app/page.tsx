"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  FileCheck, 
  Link as LinkIcon, 
  Bell, 
  Shield,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
  RefreshCw
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function LandingPage() {
  const { locale } = useI18n()

  const features = [
    {
      icon: LinkIcon,
      titleEn: "Magic Link Upload",
      titleZh: "Magic Link 上传",
      descEn: "Generate secure upload links with one click. Clients can upload files without registration.",
      descZh: "一键生成安全上传链接，客户无需注册即可上传文件"
    },
    {
      icon: Bell,
      titleEn: "Smart Reminders",
      titleZh: "智能提醒",
      descEn: "Automatically send deadline reminders to ensure clients submit files on time.",
      descZh: "自动发送截止日期提醒，确保客户按时提交文件"
    },
    {
      icon: RefreshCw,
      titleEn: "Xero Sync",
      titleZh: "Xero 同步",
      descEn: "Files automatically sync to Xero Files. No manual download or upload needed.",
      descZh: "文件自动同步到 Xero Files，无需手动下载上传"
    },
    {
      icon: Shield,
      titleEn: "Secure Encryption",
      titleZh: "安全加密",
      descEn: "256-bit encrypted transfer. Files are securely stored in the cloud.",
      descZh: "256位加密传输，文件安全存储在云端"
    },
    {
      icon: FileCheck,
      titleEn: "File Tracking",
      titleZh: "文件追踪",
      descEn: "View file upload status in real-time at a glance.",
      descZh: "实时查看文件上传状态，一目了然"
    },
    {
      icon: Users,
      titleEn: "Bulk Management",
      titleZh: "批量管理",
      descEn: "Easily manage multiple clients. Send reminders and links in bulk.",
      descZh: "轻松管理多个客户，批量发送提醒和链接"
    }
  ]

  const benefitsEn = [
    "Save 70% of file collection time",
    "Reduce 90% of email back-and-forth",
    "Zero-loss file tracking",
    "85% increase in client satisfaction"
  ]

  const benefitsZh = [
    "节省 70% 的文件收集时间",
    "减少 90% 的邮件往来",
    "零丢失的文件追踪",
    "客户满意度提升 85%"
  ]

  const benefits = locale === "en" ? benefitsEn : benefitsZh

  const pricingPlans = [
    {
      nameEn: "Free",
      nameZh: "免费版",
      priceEn: "$0",
      priceZh: "¥0",
      period: locale === "en" ? "/month" : "/月",
      descEn: "For individual accountants",
      descZh: "适合个人会计师",
      featuresEn: [
        "Up to 5 clients",
        "Unlimited Magic Links",
        "Basic email reminders",
        "5GB storage"
      ],
      featuresZh: [
        "最多 5 个客户",
        "无限 Magic Link",
        "基础邮件提醒",
        "5GB 存储空间"
      ],
      ctaEn: "Get Started Free",
      ctaZh: "免费开始",
      highlighted: false
    },
    {
      nameEn: "Pro",
      nameZh: "专业版",
      priceEn: "$19",
      priceZh: "¥99",
      period: locale === "en" ? "/month" : "/月",
      descEn: "For accounting firms",
      descZh: "适合会计师事务所",
      featuresEn: [
        "Unlimited clients",
        "Deep Xero integration",
        "Custom branding",
        "Advanced notifications",
        "50GB storage",
        "Priority support"
      ],
      featuresZh: [
        "无限客户数量",
        "Xero 深度集成",
        "自定义品牌",
        "高级通知设置",
        "50GB 存储空间",
        "优先技术支持"
      ],
      ctaEn: "Start Free Trial",
      ctaZh: "开始免费试用",
      highlighted: true
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Filio</div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {locale === "en" ? "Features" : "功能特点"}
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {locale === "en" ? "Pricing" : "价格方案"}
            </Link>
            <LanguageSwitcher />
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {locale === "en" ? "Login" : "登录"}
            </Link>
            <Button asChild size="sm">
              <Link href="/register">{locale === "en" ? "Sign Up Free" : "免费注册"}</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <Button asChild size="sm">
              <Link href="/register">{locale === "en" ? "Sign Up" : "注册"}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            {locale === "en" ? "Built for Accountants" : "专为会计师打造"}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance mb-6">
            {locale === "en" ? (
              <>
                Say Goodbye to Tedious File Collection
                <span className="text-primary block mt-2">Let Clients Upload with One Click</span>
              </>
            ) : (
              <>
                告别繁琐的文件收集
                <span className="text-primary block mt-2">让客户一键上传</span>
              </>
            )}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            {locale === "en" 
              ? "Filio helps accountants efficiently manage client documents. Let clients easily upload files through Magic Links, auto-sync to Xero, and get smart deadline reminders."
              : "Filio 帮助会计师高效管理客户文档。通过 Magic Link 让客户轻松上传文件，自动同步到 Xero，智能提醒截止日期。"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-base">
              <Link href="/register">
                {locale === "en" ? "Get Started Free" : "免费开始使用"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link href="/dashboard">
                {locale === "en" ? "View Demo" : "查看演示"}
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Screenshot */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border bg-background shadow-2xl overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/50" />
              <div className="w-3 h-3 rounded-full bg-amber-500/50" />
              <div className="w-3 h-3 rounded-full bg-primary/50" />
            </div>
            <div className="p-4 md:p-8 bg-muted/20">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">47</p>
                        <p className="text-sm text-muted-foreground">
                          {locale === "en" ? "Active Clients" : "活跃客户"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">12</p>
                        <p className="text-sm text-muted-foreground">
                          {locale === "en" ? "Pending" : "待处理"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <FileCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">156</p>
                        <p className="text-sm text-muted-foreground">
                          {locale === "en" ? "This Month" : "本月上传"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {locale === "en" ? "Features" : "功能特点"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {locale === "en" 
                ? "Filio provides a comprehensive document management solution so you can focus on accounting work."
                : "Filio 提供全方位的文档管理解决方案，让您专注于会计工作本身"}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {locale === "en" ? feature.titleEn : feature.titleZh}
                  </h3>
                  <p className="text-muted-foreground">
                    {locale === "en" ? feature.descEn : feature.descZh}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {locale === "en" ? "Simple 3 Steps to Collect Files" : "简单三步，轻松收集文件"}
            </h2>
            <p className="text-muted-foreground">
              {locale === "en" ? "No complex setup required. Get started instantly." : "无需复杂设置，即刻开始使用"}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">
                {locale === "en" ? "Add Client" : "添加客户"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {locale === "en" 
                  ? "Enter client info or import from Xero. Set deadlines and required files."
                  : "输入客户信息或从 Xero 导入，设置截止日期和所需文件"}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">
                {locale === "en" ? "Send Link" : "发送链接"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {locale === "en"
                  ? "Send Magic Link with one click. Clients can upload without registration."
                  : "一键发送 Magic Link，客户点击即可上传，无需注册"}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">
                {locale === "en" ? "Auto Sync" : "自动同步"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {locale === "en"
                  ? "Files auto-sync to Xero. Get notified in real-time when files arrive."
                  : "文件自动同步到 Xero，实时通知您文件已收到"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {locale === "en" ? "Simple, Transparent Pricing" : "简单透明的价格"}
            </h2>
            <p className="text-muted-foreground">
              {locale === "en" 
                ? "Choose the plan that fits you. Upgrade or downgrade anytime."
                : "选择适合您的方案，随时升级或降级"}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={plan.highlighted ? "border-2 border-primary relative" : ""}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">
                      {locale === "en" ? "Recommended" : "推荐"}
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-8 pb-8">
                  <h3 className="text-xl font-semibold mb-2">
                    {locale === "en" ? plan.nameEn : plan.nameZh}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {locale === "en" ? plan.descEn : plan.descZh}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {locale === "en" ? plan.priceEn : plan.priceZh}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {(locale === "en" ? plan.featuresEn : plan.featuresZh).map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/register">
                      {locale === "en" ? plan.ctaEn : plan.ctaZh}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {locale === "en" 
              ? "Ready to say goodbye to tedious file collection?"
              : "准备好告别繁琐的文件收集了吗？"}
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            {locale === "en"
              ? "Sign up now and start using Filio for free. No credit card required."
              : "立即注册，免费开始使用 Filio。无需信用卡，随时升级。"}
          </p>
          <Button asChild size="lg" variant="secondary" className="text-base">
            <Link href="/register">
              {locale === "en" ? "Get Started Free" : "免费开始使用"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-primary mb-4">Filio</div>
              <p className="text-sm text-muted-foreground">
                {locale === "en" 
                  ? "Document collection platform built for accountants"
                  : "专为会计师打造的文档收集平台"}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {locale === "en" ? "Product" : "产品"}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">{locale === "en" ? "Features" : "功能特点"}</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground">{locale === "en" ? "Pricing" : "价格方案"}</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground">{locale === "en" ? "Demo" : "演示"}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {locale === "en" ? "Support" : "支持"}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard/help" className="hover:text-foreground">{locale === "en" ? "Help Center" : "帮助中心"}</Link></li>
                <li><Link href="#" className="hover:text-foreground">{locale === "en" ? "Contact Us" : "联系我们"}</Link></li>
                <li><Link href="#" className="hover:text-foreground">{locale === "en" ? "API Docs" : "API 文档"}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {locale === "en" ? "Legal" : "法律"}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">{locale === "en" ? "Privacy Policy" : "隐私政策"}</Link></li>
                <li><Link href="#" className="hover:text-foreground">{locale === "en" ? "Terms of Service" : "服务条款"}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Filio. {locale === "en" ? "All rights reserved." : "保留所有权利。"}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
