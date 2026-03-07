import type { ReactNode } from 'react';
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider';
import { TenantProvider } from '@/shared/tenant/TenantProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserSessionProvider } from '@/contexts/UserSessionContext';

export function ImpresionProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <FeedbackProvider>
        <TenantProvider>
          <UserSessionProvider>{children}</UserSessionProvider>
        </TenantProvider>
      </FeedbackProvider>
    </ThemeProvider>
  );
}
