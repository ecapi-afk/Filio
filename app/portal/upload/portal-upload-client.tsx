'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle2, FileText, Image, File as FileIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { sanitizeFilename } from '@/lib/utils'
import {
  getFileTypeLabel,
  getFileTypeBadgeColor,
  getCategoryBadgeColor,
  getFileIcon,
  getExt,
  getExtBadgeBg,
  formatFileSize,
  MAX_FILE_SIZE,
} from '@/lib/file-types';

type FileWithStatus = {
  file: File;
  id: string;
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;
  type: string;
};

interface PortalToken {
  id: string;
  client_id: string;
  token: string;
  expires_at: string;
  clients: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

interface PortalUploadClientProps {
  portalToken: PortalToken;
}

const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/bmp',
  'image/heic',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/rtf',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.oasis.opendocument.spreadsheet',
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  // Email
  'message/rfc822',
  'application/vnd.ms-outlook',
];

// Extension to MIME type mapping for validation
const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.bmp': 'image/bmp',
  '.heic': 'image/heic',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.rtf': 'text/rtf',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.msg': 'message/rfc822',
  '.eml': 'message/rfc822',
};

// use MAX_FILE_SIZE from @/lib/file-types
const FILE_TYPES = ['Receipt', 'Invoice', 'Bank Statement', 'Payslip', 'Contract', 'Other', 'Uncategorized'];

export function PortalUploadClient({ portalToken }: PortalUploadClientProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reading real Xero connection status from the backend
  const firmData = (portalToken.clients as any)?.firms;
  const isXeroConnected = firmData ? firmData?.xero_connection_status === 'connected' : false;

  const client = portalToken.clients;

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    setFiles((prev) => {
      const valid: FileWithStatus[] = [];
      const nextFiles = [...prev];

      Array.from(newFiles).forEach((f) => {
        // Check if MIME type is allowed or if extension is in our supported list
        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        const isAllowed = ALLOWED_TYPES.includes(f.type) || Object.keys(EXT_TO_MIME).includes(ext)
        if (!isAllowed) {
          toast.error(`${f.name}: unsupported format`);
          return;
        }
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`${f.name}: exceeds 10MB limit`);
          return;
        }
        
        // Duplicate check
        const existingIdx = nextFiles.findIndex(
          (existing) => existing.file.name === f.name && existing.file.size === f.size
        );

        if (existingIdx !== -1) {
          if (nextFiles[existingIdx].status === 'error') {
            // File previously failed, reset it to idle so they can upload again
            nextFiles[existingIdx] = { ...nextFiles[existingIdx], status: 'idle', progress: 0 };
          } else {
            toast.warning(`${f.name} has already been added`);
          }
          return;
        }

        valid.push({
          file: f,
          id: Math.random().toString(36).slice(2),
          status: 'idle',
          progress: 0,
          type: 'UNCLASSED',
        });
      });

      return [...valid, ...nextFiles];
    });
  }, []);

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const setType = (id: string, type: string) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, type } : f)));

  const uploadItem = async (f: FileWithStatus) => {
    try {
      // Generate new filename: {clientName}_{type}_{YYYYMMDD}_{sanitizedOriginalName}.{ext}
      // Sanitize all parts to ensure Xero compatibility (no special chars, safe for cloud storage)
      const clientName = sanitizeFilename(client?.name?.replace(/\s+/g, '') || 'Unknown')
      const fileType = f.type === 'UNCLASSED' ? 'Uncategorized' : f.type
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      // Get original filename without extension and sanitize for Xero compatibility
      const originalNameWithoutExt = sanitizeFilename(f.file.name.substring(0, f.file.name.lastIndexOf('.')))
      const ext = f.file.name.split('.').pop() || 'pdf'
      const newFileName = `${clientName}_${fileType}_${dateStr}_${originalNameWithoutExt}.${ext}`

      // Read file content and create new File with formatted name
      const fileBuffer = await f.file.arrayBuffer()
      const renamedFile = new File([fileBuffer], newFileName, { type: f.file.type })

      // Also keep original filename for display
      const originalFileName = f.file.name

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload/xero-direct');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const p = Math.round((e.loaded / e.total) * 98);
            setFiles((prev) => prev.map((item) => (item.id === f.id ? { ...item, progress: p } : item)));
          }
        };

        xhr.onload = () => {
           if (xhr.status >= 200 && xhr.status < 300) {
             resolve(xhr.response);
           } else {
             // Try to parse error message from server
             let errorMsg = `Upload failed: ${xhr.statusText}`;
             try {
               const errorData = JSON.parse(xhr.responseText);
               if (errorData.error) {
                 errorMsg = errorData.details || errorData.error;
               }
             } catch {}
             reject(new Error(errorMsg));
           }
        };

        xhr.onerror = () => reject(new Error('Network error - please check your connection'));

        const formData = new FormData();
        formData.append('file', renamedFile);  // Upload with new filename
        formData.append('originalFilename', originalFileName);  // Keep original name
        formData.append('token', portalToken.token);
        formData.append('clientId', client?.id ?? portalToken.client_id);
        formData.append('fileType', fileType);

        xhr.send(formData);
      });

      setFiles((prev) =>
        prev.map((item) => (item.id === f.id ? { ...item, status: 'done', progress: 100 } : item))
      );
    } catch (err) {
      console.error('Upload error:', err);
      setFiles((prev) =>
        prev.map((item) => (item.id === f.id ? { ...item, status: 'error', progress: 0 } : item))
      );
      toast.error(`Failed to upload ${f.file.name}`);
    }
  };

  const uploadAll = async () => {
    const idleFiles = files.filter((f) => f.status === 'idle');
    if (idleFiles.length === 0) return;

    setFiles((prev) =>
      prev.map((f) => (f.status === 'idle' ? { ...f, status: 'uploading', progress: 0 } : f))
    );

    for (const f of idleFiles) {
      if (f.file) await uploadItem(f);
    }
  };

  const retryAndUpload = async (f: FileWithStatus) => {
    setFiles((prev) => prev.map((item) => (item.id === f.id ? { ...item, status: 'uploading', progress: 0 } : item)));
    await uploadItem(f);
  };

  const firmName = firmData?.name || 'Your Accountant';
  const initial = firmName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-emerald-600">
            {initial}
          </div>
          <div>
            <p className="text-sm font-bold">{firmName}</p>
            <p className="text-[10px] text-muted-foreground">Powered by Filio</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Upload Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Uploading for: <span className="font-semibold">{client?.name || 'Client'}</span>
          </p>
        </div>

        {!isXeroConnected && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">Uploads Paused</p>
              <p>Your accountant&apos;s Xero connection is currently unavailable. Please try again later.</p>
            </div>
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={`bg-background rounded-2xl border-2 border-dashed p-8 text-center mb-4 transition-all ${
            !isXeroConnected 
              ? 'opacity-50 cursor-not-allowed border-muted backdrop-grayscale' 
              : dragging 
                ? 'border-emerald-400 bg-emerald-50 cursor-pointer' 
                : 'border-muted-foreground/25 hover:border-emerald-300 cursor-pointer'
          }`}
          onDragOver={(e) => {
            if (!isXeroConnected) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            if (!isXeroConnected) return;
            setDragging(false);
          }}
          onDrop={(e) => {
            if (!isXeroConnected) return;
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => {
            if (!isXeroConnected) return;
            fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            disabled={!isXeroConnected}
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.tif,.tiff,.bmp,.heic,.webp,.pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.msg,.eml"
            onChange={(e) => addFiles(e.target.files)}
          />
          <Upload
            size={32}
            className={`mx-auto mb-3 ${!isXeroConnected ? 'text-muted' : dragging ? 'text-emerald-500' : 'text-muted-foreground'}`}
          />
          <p className="text-sm font-semibold">
            Drop files here or <span className="text-emerald-600">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG · PNG · GIF · TIFF · HEIC · PDF · DOC · DOCX · XLS · XLSX · PPT · PPTX · ZIP · Max 10MB
          </p>
        </div>


        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3 mb-5">
            {files.map((f) => (
              <div key={f.id} className={`bg-background rounded-xl border p-4 transition-colors ${f.status === 'error' ? 'border-red-200 bg-red-50/30' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${f.status === 'error' ? 'bg-red-900/50' : 'bg-emerald-900'}`}
                  >
                    {getExt(f.file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{f.file.name}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* File Type Badge - based on extension */}
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getFileTypeBadgeColor(f.file.name)}`}>
                        {getFileTypeLabel(f.file.name)}
                      </span>
                      {/* Category Badge - user selected */}
                      {f.type && f.type !== 'UNCLASSED' && (
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeColor(f.type)}`}>
                          {f.type}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Badges right aligned */}
                  <div className="shrink-0 flex items-center gap-2">
                    {f.status === 'idle' && (
                      <button
                        onClick={() => removeFile(f.id)}
                        className="text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 p-1.5 rounded-md transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {f.status === 'done' && (
                      <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-1.5 border border-emerald-100/50">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Synced
                      </span>
                    )}
                    {f.status === 'error' && (
                      <span className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 border border-red-100/50">
                        <AlertCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    )}
                    {f.status === 'uploading' && (
                      <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg flex items-center gap-1.5 border border-blue-100/50">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing
                      </span>
                    )}
                  </div>
                </div>

                {f.status === 'idle' && (
                  <select
                    value={f.type}
                    onChange={(e) => setType(f.id, e.target.value)}
                    className="w-full text-xs px-3 py-2 mt-1.5 rounded-lg border border-input bg-transparent focus:outline-none focus:border-emerald-400 transition-all"
                  >
                    <option value="UNCLASSED">Select document type...</option>
                    {FILE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}

                {f.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-medium">Sending to Xero...</span>
                      <span className="font-semibold tabular-nums text-blue-600">
                        {Math.round(f.progress)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-blue-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-blue-500 duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {f.status === 'error' && (
                  <div className="mt-3 text-xs font-medium text-red-600 flex items-center justify-between border-t border-red-100/50 pt-3">
                    <div className="flex items-center gap-1.5">
                       <AlertCircle className="h-4 w-4" /> 
                       <span>Upload failed or Xero rejected the file.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => removeFile(f.id)} 
                        className="text-red-700 hover:text-red-900 hover:underline transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                      <button 
                        onClick={() => retryAndUpload(f)} 
                        className="bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Button: Right below file list */}
        {files.length > 0 && files.some((f) => f.status === 'idle') && (
          <div className="mt-4 mb-6">
            <Button onClick={uploadAll} className="w-full h-12 text-base font-semibold" disabled={!isXeroConnected}>
              <Upload className="h-5 w-5 mr-2" />
              Upload {files.filter((f) => f.status === 'idle').length} file
              {files.filter((f) => f.status === 'idle').length !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Your files are encrypted and securely stored</p>
        </div>
      </footer>
    </div>
  );
}
