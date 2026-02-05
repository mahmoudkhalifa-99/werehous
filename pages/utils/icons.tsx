
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Role } from '../types';

export const IconMap: Record<string, React.ElementType> = {
  ...(LucideIcons as any)
};

export const getIcon = (name: string): React.ElementType => {
  return IconMap[name] || LucideIcons.Circle;
};

export const iconNames = Object.keys(IconMap);

export const getRoleLabel = (role: Role): string => {
  const rolesMap: Record<string, string> = {
    admin: 'مدير نظام',
    system_supervisor: 'مشرف نظام',
    planning_officer: 'مسؤول تخطيط',
    head_general: 'رئيس قسم المخازن العامه',
    head_raw: 'رئيس قسم الخامات',
    head_finished: 'رئيس قسم المنتج التام',
    supervisor_general: 'مشرف المخازن العامه',
    supervisor_raw: 'مشرف الخامات',
    supervisor_finished: 'مشرف المنتج التام',
    storekeeper_general: 'امين مخزن المخازن العامه',
    storekeeper_raw: 'امين مخزن الخامات',
    storekeeper_finished: 'امين مخزن المنتج التام',
    cashier: 'مسؤول مبيعات'
  };
  return rolesMap[role] || role;
};
