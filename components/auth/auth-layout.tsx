import { CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ background: '#F3F4F6' }}>
      {/* Left: Brand Panel */}
      <div
        className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-10"
        style={{ background: '#064E3B' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: '#059669' }}
          >
            F
          </div>
          <span className="text-white font-bold text-xl">Filio</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            The smarter way to collect client documents
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Connect your Xero account, share secure upload links with clients,
            and keep every document organised — automatically.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Xero-native document management',
              'Magic Email for effortless uploads',
              'Automated deadline reminders',
              'UK data residency guaranteed',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 size={16} style={{ color: '#34D399' }} />
                <span
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p
          className="text-xs"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          © 2026 Filio · filio.uk · Data stored in UK
        </p>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: '#059669' }}
            >
              F
            </div>
            <span className="font-bold text-gray-900">Filio</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          <p className="text-sm text-gray-400 mb-7">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
