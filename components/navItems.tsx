import React from 'react';
import {
  BeakerIcon,
  CubeTransparentIcon,
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
    to: '/test-assistant',
    labelKey: 'navigation.testAssistant',
    icon: BeakerIcon,
    roles: [Role.ADMIN],
  },
  {
    to: '/prompt',
    labelKey: 'navigation.prompt',
    icon: AdjustmentsHorizontalIcon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/company',
    labelKey: 'navigation.company',
    icon: CubeTransparentIcon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/users',
    labelKey: 'navigation.users',
    icon: UserGroupIcon,
    roles: [Role.ADMIN],
  },
];
