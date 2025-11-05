import React from 'react';
import {
  BeakerIcon,
  HeartIcon,
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  IdentificationIcon,
  UserGroupIcon,
} from '@heroicons/react/24/solid';
import { Role } from '../types';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: Role[];
}

export const navItems: NavItem[] = [
  {
    to: '/dashboard',
    labelKey: 'navigation.dashboard',
    icon: ChartPieIcon,
    roles: [Role.ADMIN, Role.EDITOR, Role.VIEWER],
  },
  {
    to: '/contacts',
    labelKey: 'navigation.contacts',
    icon: IdentificationIcon,
    roles: [Role.ADMIN, Role.EDITOR, Role.VIEWER],
  },
  {
    to: '/company',
    labelKey: 'navigation.company',
    icon: HeartIcon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/prompt',
    labelKey: 'navigation.prompt',
    icon: AdjustmentsHorizontalIcon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/test-assistant',
    labelKey: 'navigation.testAssistant',
    icon: BeakerIcon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/users',
    labelKey: 'navigation.users',
    icon: UserGroupIcon,
    roles: [Role.ADMIN],
  },
];
