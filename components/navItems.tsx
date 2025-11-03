import React from 'react';
import {
  BeakerIcon,
  BuildingOffice2Icon,
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  PhoneIcon,
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
    to: '/company',
    labelKey: 'navigation.company',
    icon: BuildingOffice2Icon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/contacts',
    labelKey: 'navigation.contacts',
    icon: PhoneIcon,
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
    to: '/users',
    labelKey: 'navigation.users',
    icon: UserGroupIcon,
    roles: [Role.ADMIN],
  },
];
