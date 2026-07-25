'use client';

import { ReactNode } from 'react';

interface EmbedCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EmbedCard({ title, subtitle, children, actions, className = '' }: EmbedCardProps) {
  return (
    <div 
      className={`embed-card ${className}`}
    >
      <div className="embed-card-header">
        <div>
          <h3 className="embed-card-title">{title}</h3>
          {subtitle && <p className="embed-card-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="embed-card-actions">{actions}</div>}
      </div>
      <div className="embed-card-content">
        {children}
      </div>
    </div>
  );
}
