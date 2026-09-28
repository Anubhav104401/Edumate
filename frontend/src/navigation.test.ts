import { describe, expect, it } from 'vitest';
import type { Role } from './api/types';
import { findNavItem, MENU, ROLE_ICONS } from './navigation';

const ROLES = Object.keys(MENU) as Role[];

describe('MENU', () => {
  it('starts every role at the dashboard and gives every link an icon and a heading', () => {
    for (const role of ROLES) {
      expect(MENU[role][0].to).toBe('/');
      for (const item of MENU[role]) {
        expect(item.icon).toBeTruthy();
        expect(item.section.length).toBeGreaterThan(0);
      }
      expect(ROLE_ICONS[role]).toBeTruthy();
    }
  });

  it('keeps each heading in one block, so no heading appears twice in a menu', () => {
    for (const role of ROLES) {
      const headings = MENU[role].map((item) => item.section).filter((section, i, all) => i === 0 || all[i - 1] !== section);
      expect(new Set(headings).size).toBe(headings.length);
    }
  });

  it('never lists the same address twice for one role', () => {
    for (const role of ROLES) {
      const links = MENU[role].map((item) => item.to);
      expect(new Set(links).size).toBe(links.length);
    }
  });
});

describe('findNavItem', () => {
  it('matches the dashboard only on "/" exactly', () => {
    expect(findNavItem('STUDENT', '/')?.to).toBe('/');
    expect(findNavItem('STUDENT', '/pay/ORD-1')).toBeUndefined();
  });

  it('matches a detail page to its list page', () => {
    expect(findNavItem('ADMISSIONS_OFFICER', '/admissions/7')?.to).toBe('/admissions');
    expect(findNavItem('ADMISSIONS_OFFICER', '/admissions/merit')?.to).toBe('/admissions/merit');
  });

  it('does not treat /attendance-x as part of /attendance', () => {
    expect(findNavItem('STUDENT', '/attendance-x')).toBeUndefined();
  });
});
