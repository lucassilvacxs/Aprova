import React from 'react';
import { EmptyState } from '@/components/ui';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title,
  description = 'Esta funcionalidade será implementada nas próximas fases do projeto.',
  icon,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
    <EmptyState
      icon={icon}
      title={title}
      description={description}
    />
    <div className="mt-3 px-3 py-1.5 bg-warning-light border border-warning/20 rounded-lg">
      <p className="text-xs text-warning-text font-medium text-center">🚧 Em desenvolvimento — próximas fases</p>
    </div>
  </div>
);
