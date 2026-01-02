import React from 'react';
import * as LucideIcons from 'lucide-react';

export const IconMap: Record<string, React.ElementType> = {
  ...(LucideIcons as any)
};

export const getIcon = (name: string): React.ElementType => {
  return IconMap[name] || LucideIcons.Circle;
};

export const iconNames = Object.keys(IconMap);