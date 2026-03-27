'use client';

import { ReactNode, useRef, useState } from 'react';

interface EmbedCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EmbedCard({ title, subtitle, children, actions, className = '' }: EmbedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

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
