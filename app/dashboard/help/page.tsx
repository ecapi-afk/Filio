"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  BookOpen, 
  Video, 
  MessageCircle, 
  Mail,
  ExternalLink,
  FileText,
  Users,
  Upload,
  Link as LinkIcon,
  Settings,
  CreditCard
} from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export default function HelpCenterPage() {
  const { t, locale } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: ""
  })

  const faqCategories = [
    {
      title: t("help.gettingStarted"),
      icon: BookOpen,
      questions: locale === "zh" ? [
        {
          q: "如何开始使用 Filio？",
          a: "注册账户后，系统会引导您完成初始设置：连接 Xero 账户（可选）、设置品牌信息、添加第一个客户。完成这些步骤后，您就可以开始向客户发送文档上传链接了。"
        },
        {
          q: "如何添加新客户？",
          a: "在客户管理页面点击「添加客户」按钮，输入客户姓名、公司名称和邮箱地址。如果已连接 Xero，您也可以直接从 Xero 联系人中导入客户。"
        },
        {
          q: "如何向客户发送上传链接？",
          a: "在客户详情页面，点击「发送 Magic Link」按钮。系统会生成一个唯一的上传链接并发送到客户邮箱。客户点击链接后可以直接上传文件，无需注册账户。"
        }
      ] : [
        {
          q: "How do I get started with Filio?",
          a: "After registration, the system will guide you through initial setup: connect Xero account (optional), set up branding, and add your first client. Once completed, you can start sending document upload links to clients."
        },
        {
          q: "How do I add a new client?",
          a: "Go to the Clients page and click 'Add Client' button. Enter client name, company name, and email address. If connected to Xero, you can also import clients directly from Xero contacts."
        },
        {
          q: "How do I send upload links to clients?",
          a: "On the client detail page, click 'Send Magic Link' button. The system will generate a unique upload link and send it to the client's email. Clients can upload files directly without registration."
        }
      ]
    },
    {
      title: t("help.clientManagement"),
      icon: Users,
      questions: locale === "zh" ? [
        {
          q: "如何批量导入客户？",
          a: "您可以通过 CSV 文件批量导入客户。在客户管理页面点击「导入」按钮，下载模板文件，按格式填写客户信息后上传即可。"
        },
        {
          q: "如何设置客户的截止日期？",
          a: "在客户详情页面或设置页面，您可以为每个客户设置文档上传的截止日期。系统会根据您的通知设置自动发送提醒邮件。"
        },
        {
          q: "如何归档或删除客户？",
          a: "在客户详情页面点击设置图标，选择「归档客户」或「删除客户」。归档后的客户可以随时恢复，但删除是永久性的，请谨慎操作。"
        }
      ] : [
        {
          q: "How do I bulk import clients?",
          a: "You can bulk import clients via CSV file. On the Clients page, click 'Import' button, download the template file, fill in client information according to the format, and upload."
        },
        {
          q: "How do I set deadlines for clients?",
          a: "On the client detail page or settings page, you can set document upload deadlines for each client. The system will automatically send reminder emails based on your notification settings."
        },
        {
          q: "How do I archive or delete a client?",
          a: "On the client detail page, click the settings icon and select 'Archive Client' or 'Delete Client'. Archived clients can be restored anytime, but deletion is permanent."
        }
      ]
    },
    {
      title: t("help.documentUpload"),
      icon: Upload,
      questions: locale === "zh" ? [
        {
          q: "支持哪些文件格式？",
          a: "Filio 支持常见的文档格式，包括 PDF、Word (.doc, .docx)、Excel (.xls, .xlsx)、图片 (PNG, JPG, GIF) 和 CSV 文件。单个文件大小限制为 50MB。"
        },
        {
          q: "客户上传的文件保存在哪里？",
          a: "所有文件都安全存储在加密的云存储中。如果您连接了 Xero，文件也会自动同步到 Xero Files。您可以在上传记录页面查看和下载所有文件。"
        },
        {
          q: "如何下载客户上传的文件？",
          a: "在客户详情页面的「上传记录」部分，您可以查看所有上传的文件。点击文件名可以预览，点击下载图标可以下载单个文件，也可以选择多个文件批量下载。"
        }
      ] : [
        {
          q: "What file formats are supported?",
          a: "Filio supports common document formats including PDF, Word (.doc, .docx), Excel (.xls, .xlsx), images (PNG, JPG, GIF), and CSV files. Maximum file size is 50MB."
        },
        {
          q: "Where are client uploaded files stored?",
          a: "All files are securely stored in encrypted cloud storage. If connected to Xero, files are also automatically synced to Xero Files. You can view and download all files on the Upload History page."
        },
        {
          q: "How do I download client uploaded files?",
          a: "On the client detail page under 'Upload History', you can view all uploaded files. Click filename to preview, click download icon to download single file, or select multiple files for batch download."
        }
      ]
    },
    {
      title: "Magic Link",
      icon: LinkIcon,
      questions: locale === "zh" ? [
        {
          q: "Magic Link 的有效期是多久？",
          a: "默认情况下，Magic Link 永不过期。您可以在客户设置中为单个客户设置链接有效期，也可以在全局设置中设置默认有效期。"
        },
        {
          q: "如何重新发送 Magic Link？",
          a: "在客户详情页面点击「重新发送」按钮即可。系统会发送同一个链接到客户邮箱。如果需要生成新链接，请先禁用当前链接。"
        },
        {
          q: "如何禁用客户的 Magic Link？",
          a: "在客户详情页面点击设置图标，选择「禁用 Magic Link」。禁用后客户将无法通过该链接上传文件，您可以随时重新启用或生成新链接。"
        }
      ] : [
        {
          q: "How long is a Magic Link valid?",
          a: "By default, Magic Links never expire. You can set link expiry for individual clients in client settings, or set default expiry in global settings."
        },
        {
          q: "How do I resend a Magic Link?",
          a: "On the client detail page, click 'Resend' button. The system will send the same link to client email. If you need a new link, disable the current one first."
        },
        {
          q: "How do I disable a client's Magic Link?",
          a: "On the client detail page, click settings icon and select 'Disable Magic Link'. After disabling, clients cannot upload via that link. You can re-enable or generate a new link anytime."
        }
      ]
    },
    {
      title: t("help.xeroIntegration"),
      icon: Settings,
      questions: locale === "zh" ? [
        {
          q: "如何连接 Xero 账户？",
          a: "在设置页面的「Xero 集成」部分，点击「连接 Xero」按钮。系统会跳转到 Xero 授权页面，登录并授权后即可完成连接。"
        },
        {
          q: "文件如何同步到 Xero？",
          a: "连接 Xero 后，客户上传的文件会自动同步到对应联系人的 Xero Files 文件夹。您可以在设置中选择同步的目标文件夹。"
        },
        {
          q: "如何断开 Xero 连接？",
          a: "在设置页面的「Xero 集成」部分，点击「断开连接」按钮。断开后，文件将不再自动同步，但已同步的文件不会被删除。"
        },
        {
          q: "如何断开或移除 Xero 列表里“已连接”的多余公司？",
          a: "如果您在授权时看到某个公司显示为“已连接 (Already connected)”并希望移除它：1. 登录 xero.com。2. 切换到您想要断开的那家公司。3. 点击左上角/右上角公司名进入「设置 (Settings)」>「已连接的应用 (Connected apps)」。4. 找到 Filio 并点击「断开连接 (Disconnect)」。下次再从 Filio 点击连接时，该公司就会再次变成可授权状态。"
        }
      ] : [
        {
          q: "How do I connect my Xero account?",
          a: "In Settings under 'Xero Integration', click 'Connect Xero' button. You'll be redirected to Xero authorization page. Log in and authorize to complete the connection."
        },
        {
          q: "How are files synced to Xero?",
          a: "Once connected to Xero, client uploaded files are automatically synced to the corresponding contact's Xero Files folder. You can select target folder in settings."
        },
        {
          q: "How do I disconnect from Xero?",
          a: "In Settings under 'Xero Integration', click 'Disconnect' button. After disconnecting, files will no longer auto-sync, but already synced files won't be deleted."
        },
        {
          q: "How do I disconnect an 'Already connected' Xero organisation?",
          a: "If you want to remove an organisation from the 'Already connected' drop-down list: 1. Log into xero.com. 2. Switch to the specific organisation you want to disconnect. 3. Click the organisation name and go to 'Settings' > 'Connected apps'. 4. Find Filio and click 'Disconnect'. Next time you connect to Xero from Filio, this organisation will be available to authorize again."
        }
      ]
    },
    {
      title: t("help.billingPlans"),
      icon: CreditCard,
      questions: locale === "zh" ? [
        {
          q: "有哪些订阅计划？",
          a: "Filio 提供免费版和专业版两种计划。免费版支持最多 5 个客户，专业版无客户数量限制，还包含高级功能如自定义品牌、Xero 集成等。"
        },
        {
          q: "如何升级到专业版？",
          a: "在设置页面的「账单」部分，点击「升级到专业版」按钮，选择月付或年付方案，完成支付后即可享受所有专业版功能。"
        },
        {
          q: "如何取消订阅？",
          a: "在设置页面的「账单」部分，点击「管理订阅」，然后选择「取消订阅」。取消后，您的账户会在当前计费周期结束后降级为免费版。"
        }
      ] : [
        {
          q: "What subscription plans are available?",
          a: "Filio offers Free and Pro plans. Free plan supports up to 5 clients. Pro plan has unlimited clients and includes advanced features like custom branding and Xero integration."
        },
        {
          q: "How do I upgrade to Pro?",
          a: "In Settings under 'Billing', click 'Upgrade to Pro' button. Choose monthly or annual plan and complete payment to access all Pro features."
        },
        {
          q: "How do I cancel my subscription?",
          a: "In Settings under 'Billing', click 'Manage Subscription', then select 'Cancel Subscription'. After cancellation, your account will downgrade to Free at end of current billing cycle."
        }
      ]
    }
  ]

  const resources = [
    {
      title: t("help.quickGuide"),
      description: t("help.quickGuideDesc"),
      icon: BookOpen,
      link: "#"
    },
    {
      title: t("help.videoTutorials"),
      description: t("help.videoTutorialsDesc"),
      icon: Video,
      link: "#"
    },
    {
      title: t("help.apiDocs"),
      description: t("help.apiDocsDesc"),
      icon: FileText,
      link: "#"
    }
  ]

  const filteredFaq = searchQuery
    ? faqCategories.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.questions.length > 0)
    : faqCategories

  return (
    <div className="space-y-8">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("help.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Resources */}
      <div className="grid md:grid-cols-3 gap-4">
        {resources.map((resource, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <resource.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium flex items-center gap-2">
                    {resource.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {resource.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("help.faq")}</CardTitle>
          <CardDescription>
            {t("help.faqDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFaq.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("help.noResults")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("help.noResultsDesc")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredFaq.map((category, catIndex) => (
                <div key={catIndex}>
                  <div className="flex items-center gap-2 mb-3">
                    <category.icon className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">{category.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {category.questions.length}
                    </Badge>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, qIndex) => (
                      <AccordionItem key={qIndex} value={`${catIndex}-${qIndex}`}>
                        <AccordionTrigger className="text-left">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Us */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {t("help.sendMessage")}
            </CardTitle>
            <CardDescription>
              {t("help.sendMessageDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder={t("help.subject")}
                value={contactForm.subject}
                onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <Textarea
                placeholder={t("help.describeIssue")}
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
            <Button className="w-full">
              {t("help.send")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("help.otherContact")}
            </CardTitle>
            <CardDescription>
              {t("help.otherContactDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium">{t("help.emailSupport")}</p>
              <p className="text-sm text-muted-foreground mt-1">support@filio.app</p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("help.emailSupportResponse")}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium">{t("help.prioritySupport")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("help.prioritySupportDesc")}
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                {t("help.upgradeToPro")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
