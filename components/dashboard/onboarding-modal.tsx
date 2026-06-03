"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Users, Link2 } from "lucide-react"

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  xeroConnected: boolean
}

export function OnboardingModal({ isOpen, onClose, xeroConnected }: OnboardingModalProps) {
  const handleConnectXero = () => {
    // Xero OAuth flow
    console.log("Connecting to Xero...")
  }

  const handleImportClients = () => {
    // Import clients from Xero
    console.log("Importing clients...")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {xeroConnected ? "导入您的客户" : "连接 Xero"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {xeroConnected
              ? "从 Xero 导入客户以开始使用 Filio"
              : "连接 Xero 账户以自动同步客户和文件"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          {!xeroConnected ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[#13B5EA]/10 flex items-center justify-center mb-6">
                <Link2 className="h-8 w-8 text-[#13B5EA]" />
              </div>
              <div className="space-y-3 text-center text-sm text-muted-foreground mb-6">
                <p>自动同步客户联系人</p>
                <p>文件直接上传到 Xero</p>
                <p>实时状态追踪</p>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  跳过
                </Button>
                <Button 
                  className="flex-1" 
                  style={{ backgroundColor: "#13B5EA" }}
                  onClick={handleConnectXero}
                >
                  连接 Xero
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground mb-6">
                从 Xero 导入您的客户以开始管理他们的文档上传
              </p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  跳过
                </Button>
                <Button className="flex-1" onClick={handleImportClients}>
                  导入客户
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
