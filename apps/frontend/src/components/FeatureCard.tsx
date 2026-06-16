"use client";

import { Icon } from '@iconify/react';

interface FeatureCardProps {
  icon?: string;
  title: string;
  description: string;
}

export default function FeatureCard({ icon = 'zap', title, description }: FeatureCardProps) {
  return (
    <div className="bg-sidebar border border-border rounded-xl p-6 flex flex-col gap-4 hover:border-accent/50 transition-all duration-300">
      <div className="size-11 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
        <Icon icon={`lucide:${icon}`} className="text-accent" width={20} height={20} />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-text-light">{title}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
