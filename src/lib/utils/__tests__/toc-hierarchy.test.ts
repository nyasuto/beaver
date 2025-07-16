/**
 * Tests for TOC hierarchy utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  buildTOCHierarchy,
  flattenTOCHierarchy,
  toggleSection,
  expandSectionAndParents,
  expandAll,
  collapseAll,
  containsSection,
  findSection,
} from '../toc-hierarchy.js';
import type { DocSection } from '../../types/docs.js';

describe('TOC Hierarchy Utils', () => {
  const mockSections: DocSection[] = [
    { id: 'section-0', title: 'Introduction', level: 1, anchor: 'introduction' },
    { id: 'section-1', title: 'Getting Started', level: 2, anchor: 'getting-started' },
    { id: 'section-2', title: 'Installation', level: 3, anchor: 'installation' },
    { id: 'section-3', title: 'Configuration', level: 3, anchor: 'configuration' },
    { id: 'section-4', title: 'Advanced Usage', level: 2, anchor: 'advanced-usage' },
    { id: 'section-5', title: 'API Reference', level: 1, anchor: 'api-reference' },
    { id: 'section-6', title: 'Methods', level: 2, anchor: 'methods' },
  ];

  describe('buildTOCHierarchy', () => {
    it('should build correct hierarchy from flat sections', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      expect(hierarchy).toHaveLength(2); // Two H1 sections
      expect(hierarchy[0]!.title).toBe('Introduction');
      expect(hierarchy[0]!.children).toHaveLength(2); // Two H2 children
      expect(hierarchy[0]!.children[0]!.title).toBe('Getting Started');
      expect(hierarchy[0]!.children[0]!.children).toHaveLength(2); // Two H3 children
      expect(hierarchy[1]!.title).toBe('API Reference');
      expect(hierarchy[1]!.children).toHaveLength(1); // One H2 child
    });

    it('should set default expansion state correctly', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      // H1 and H2 should be expanded by default
      expect(hierarchy[0]!.expanded).toBe(true);
      expect(hierarchy[0]!.children[0]!.expanded).toBe(true);
      expect(hierarchy[0]!.children[0]!.children[0]!.expanded).toBe(false); // H3 collapsed
    });

    it('should set parent references correctly', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      expect(hierarchy[0]!.parent).toBeUndefined();
      expect(hierarchy[0]!.children[0]!.parent).toBe(hierarchy[0]);
      expect(hierarchy[0]!.children[0]!.children[0]!.parent).toBe(hierarchy[0]!.children[0]);
    });
  });

  describe('flattenTOCHierarchy', () => {
    it('should flatten hierarchy to flat list', () => {
      const hierarchy = buildTOCHierarchy(mockSections);
      const flattened = flattenTOCHierarchy(hierarchy);

      expect(flattened).toHaveLength(mockSections.length);
      expect(flattened[0]!.title).toBe('Introduction');
      expect(flattened[1]!.title).toBe('Getting Started');
    });

    it('should respect visibility when visibleOnly is true', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      // Collapse Getting Started section
      hierarchy[0]!.children[0]!.expanded = false;

      const visibleOnly = flattenTOCHierarchy(hierarchy, true);
      const allSections = flattenTOCHierarchy(hierarchy, false);

      expect(visibleOnly.length).toBeLessThan(allSections.length);
      expect(visibleOnly.some(s => s.title === 'Installation')).toBe(false);
    });
  });

  describe('toggleSection', () => {
    it('should toggle section expansion state', () => {
      const hierarchy = buildTOCHierarchy(mockSections);
      const initialState = hierarchy[0]!.children[0]!.expanded;

      const toggled = toggleSection(hierarchy, 'section-1');

      expect(toggled[0]!.children[0]!.expanded).toBe(!initialState);
    });

    it('should not modify original hierarchy', () => {
      const hierarchy = buildTOCHierarchy(mockSections);
      const originalState = hierarchy[0]!.children[0]!.expanded;

      toggleSection(hierarchy, 'section-1');

      expect(hierarchy[0]!.children[0]!.expanded).toBe(originalState);
    });
  });

  describe('expandSectionAndParents', () => {
    it('should expand target section and all parents', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      // Collapse all first
      const collapsed = collapseAll(hierarchy);

      // Expand Installation section and parents
      const expanded = expandSectionAndParents(collapsed, 'section-2');

      expect(expanded[0]!.expanded).toBe(true); // Introduction (parent)
      expect(expanded[0]!.children[0]!.expanded).toBe(true); // Getting Started (parent)
      expect(expanded[0]!.children[0]!.children[0]!.expanded).toBe(true); // Installation (target)
    });
  });

  describe('expandAll and collapseAll', () => {
    it('should expand all sections', () => {
      const hierarchy = buildTOCHierarchy(mockSections);
      const expanded = expandAll(hierarchy);

      function checkAllExpanded(sections: typeof hierarchy): boolean {
        return sections.every(
          section =>
            section.expanded &&
            (section.children.length === 0 || checkAllExpanded(section.children))
        );
      }

      expect(checkAllExpanded(expanded)).toBe(true);
    });

    it('should collapse all sections', () => {
      const hierarchy = buildTOCHierarchy(mockSections);
      const collapsed = collapseAll(hierarchy);

      function checkAllCollapsed(sections: typeof hierarchy): boolean {
        return sections.every(
          section =>
            !section.expanded &&
            (section.children.length === 0 || checkAllCollapsed(section.children))
        );
      }

      expect(checkAllCollapsed(collapsed)).toBe(true);
    });
  });

  describe('containsSection', () => {
    it('should find existing sections', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      expect(containsSection(hierarchy, 'section-0')).toBe(true);
      expect(containsSection(hierarchy, 'section-2')).toBe(true);
      expect(containsSection(hierarchy, 'section-6')).toBe(true);
    });

    it('should return false for non-existing sections', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      expect(containsSection(hierarchy, 'non-existing')).toBe(false);
    });
  });

  describe('findSection', () => {
    it('should find and return existing sections', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      const found = findSection(hierarchy, 'section-2');
      expect(found?.title).toBe('Installation');
      expect(found?.level).toBe(3);
    });

    it('should return null for non-existing sections', () => {
      const hierarchy = buildTOCHierarchy(mockSections);

      const found = findSection(hierarchy, 'non-existing');
      expect(found).toBeNull();
    });
  });
});
