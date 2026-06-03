"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"

type ClientStatus = "received" | "pending" | "overdue"

interface Client {
  id: string
  name: string
  company: string
  lastUpload: string
  status: ClientStatus
}

const mockClients: Client[] = [
  { id: "1", name: "Sarah Johnson", company: "ABC Solutions Ltd.", lastUpload: "Oct 25, 2023", status: "received" },
  { id: "2", name: "Mark Davis", company: "Davis Consulting", lastUpload: "Oct 22, 2023", status: "pending" },
  { id: "3", name: "Emily Chen", company: "Tech Innovations", lastUpload: "Oct 15, 2023", status: "overdue" },
  { id: "4", name: "David Miller", company: "Miller & Associates", lastUpload: "Oct 26, 2023", status: "received" },
  { id: "5", name: "Jessica Lee", company: "Global Enterprises", lastUpload: "Oct 21, 2023", status: "pending" },
  { id: "6", name: "Chris Wilson", company: "Wilson Financial", lastUpload: "Oct 10, 2023", status: "overdue" },
]

const statusConfig = {
  received: {
    label: "Documents Received",
    icon: CheckCircle2,
    className: "text-primary",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-amber-500",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    className: "text-red-500",
  },
}

export function ClientTable() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const totalClients = 47

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(totalClients / itemsPerPage)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">Client Overview</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-input bg-background pl-9 sm:w-44"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full border-input bg-background sm:w-36">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="default">
              <SelectTrigger className="w-full border-input bg-background sm:w-28">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Sort By</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-12 px-6 text-sm font-medium text-muted-foreground">Client Name</TableHead>
                <TableHead className="h-12 text-sm font-medium text-muted-foreground">Company</TableHead>
                <TableHead className="h-12 text-sm font-medium text-muted-foreground">Last Upload Date</TableHead>
                <TableHead className="h-12 text-sm font-medium text-muted-foreground">Magic Link Status</TableHead>
                <TableHead className="h-12 text-sm font-medium text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const status = statusConfig[client.status]
                const StatusIcon = status.icon
                return (
                  <TableRow key={client.id} className="border-border">
                    <TableCell className="px-6 py-4 font-medium text-foreground">{client.name}</TableCell>
                    <TableCell className="py-4 text-muted-foreground">{client.company}</TableCell>
                    <TableCell className="py-4 text-muted-foreground">{client.lastUpload}</TableCell>
                    <TableCell className="py-4">
                      <div className={`flex items-center gap-2 ${status.className}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Button 
                        size="sm" 
                        className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Send Reminder
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Showing 1-{Math.min(itemsPerPage, filteredClients.length)} of {totalClients} clients
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-primary/10 text-primary"
                    : "text-primary hover:bg-accent"
                }`}
              >
                {page}
              </button>
            ))}
            <span className="px-1 text-muted-foreground">...</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-accent disabled:opacity-50"
            >
              next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
