import React from 'react';
import {
  BuildingOffice2Icon,
  ChartPieIcon,
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

export const NeuralChipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 9.5h6M9 14.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M10.5 8v2.5M13.5 8v2.5M10.5 13.5V16M13.5 13.5V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="9" cy="11.5" r="1" fill="currentColor" />
    <circle cx="15" cy="11.5" r="1" fill="currentColor" />
    <circle cx="12" cy="13" r="1" fill="currentColor" />
    <path d="M12 4V2M16 4l.5-1.5M8 4 7.5 2.5M6 8H4M6 12H3.5M6 16H4M18 8h2M18 12h2.5M18 16h2M12 20v2M16 20l.5 1.5M8 20 7.5 21.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

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
    icon: PhoneIcon,
    roles: [Role.ADMIN, Role.EDITOR, Role.VIEWER],
  },
  {
    to: '/prompt',
    labelKey: 'navigation.prompt',
    icon: NeuralChipIcon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/company',
    labelKey: 'navigation.company',
    icon: BuildingOffice2Icon,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    to: '/users',
    labelKey: 'navigation.users',
    icon: UserGroupIcon,
    roles: [Role.ADMIN],
  },
];
