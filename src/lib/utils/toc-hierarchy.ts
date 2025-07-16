/**
 * Table of Contents Hierarchy Builder
 *
 * Converts flat section list into hierarchical structure for collapsible TOC
 */

import type { DocSection } from '../types/docs.js';

export interface HierarchicalSection extends DocSection {
  children: HierarchicalSection[];
  expanded: boolean;
  parent?: HierarchicalSection;
}

/**
 * Build hierarchical structure from flat sections list
 */
export function buildTOCHierarchy(sections: DocSection[]): HierarchicalSection[] {
  const hierarchy: HierarchicalSection[] = [];
  const stack: HierarchicalSection[] = [];

  for (const section of sections) {
    const hierarchicalSection: HierarchicalSection = {
      ...section,
      children: [],
      expanded: section.level <= 2, // Default: expand H1 and H2
      parent: undefined,
    };

    // Find the appropriate parent in the stack
    while (stack.length > 0 && stack[stack.length - 1]!.level >= section.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level section
      hierarchy.push(hierarchicalSection);
    } else {
      // Child section
      const parent = stack[stack.length - 1]!;
      hierarchicalSection.parent = parent;
      parent.children.push(hierarchicalSection);
    }

    stack.push(hierarchicalSection);
  }

  return hierarchy;
}

/**
 * Flatten hierarchical structure back to flat list
 */
export function flattenTOCHierarchy(
  hierarchy: HierarchicalSection[],
  visibleOnly = false
): HierarchicalSection[] {
  const result: HierarchicalSection[] = [];

  function traverse(sections: HierarchicalSection[], parentExpanded = true) {
    for (const section of sections) {
      if (!visibleOnly || parentExpanded) {
        result.push(section);
      }

      if (section.children.length > 0 && (!visibleOnly || section.expanded)) {
        traverse(section.children, parentExpanded && section.expanded);
      }
    }
  }

  traverse(hierarchy);
  return result;
}

/**
 * Toggle section expansion state
 */
export function toggleSection(
  hierarchy: HierarchicalSection[],
  sectionId: string
): HierarchicalSection[] {
  function updateSection(sections: HierarchicalSection[]): HierarchicalSection[] {
    return sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          expanded: !section.expanded,
          children: updateSection(section.children),
        };
      }
      return {
        ...section,
        children: updateSection(section.children),
      };
    });
  }

  return updateSection(hierarchy);
}

/**
 * Expand section and all its parents (for smart expansion)
 */
export function expandSectionAndParents(
  hierarchy: HierarchicalSection[],
  sectionId: string
): HierarchicalSection[] {
  function updateSection(sections: HierarchicalSection[]): HierarchicalSection[] {
    return sections.map(section => {
      const hasTargetInChildren = containsSection(section.children, sectionId);

      if (section.id === sectionId || hasTargetInChildren) {
        return {
          ...section,
          expanded: true,
          children: updateSection(section.children),
        };
      }

      return {
        ...section,
        children: updateSection(section.children),
      };
    });
  }

  return updateSection(hierarchy);
}

/**
 * Check if section exists in hierarchy
 */
export function containsSection(sections: HierarchicalSection[], sectionId: string): boolean {
  for (const section of sections) {
    if (section.id === sectionId) {
      return true;
    }
    if (section.children.length > 0 && containsSection(section.children, sectionId)) {
      return true;
    }
  }
  return false;
}

/**
 * Get section by ID from hierarchy
 */
export function findSection(
  hierarchy: HierarchicalSection[],
  sectionId: string
): HierarchicalSection | null {
  for (const section of hierarchy) {
    if (section.id === sectionId) {
      return section;
    }
    if (section.children.length > 0) {
      const found = findSection(section.children, sectionId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Expand all sections
 */
export function expandAll(hierarchy: HierarchicalSection[]): HierarchicalSection[] {
  function updateSection(sections: HierarchicalSection[]): HierarchicalSection[] {
    return sections.map(section => ({
      ...section,
      expanded: true,
      children: updateSection(section.children),
    }));
  }

  return updateSection(hierarchy);
}

/**
 * Collapse all sections
 */
export function collapseAll(hierarchy: HierarchicalSection[]): HierarchicalSection[] {
  function updateSection(sections: HierarchicalSection[]): HierarchicalSection[] {
    return sections.map(section => ({
      ...section,
      expanded: false,
      children: updateSection(section.children),
    }));
  }

  return updateSection(hierarchy);
}

/**
 * Save TOC state to localStorage
 */
export function saveTOCState(hierarchy: HierarchicalSection[], docId: string): void {
  const state: Record<string, boolean> = {};

  function extractState(sections: HierarchicalSection[]) {
    for (const section of sections) {
      state[section.id] = section.expanded;
      if (section.children.length > 0) {
        extractState(section.children);
      }
    }
  }

  extractState(hierarchy);

  try {
    localStorage.setItem(`toc-state-${docId}`, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save TOC state to localStorage:', error);
  }
}

/**
 * Load TOC state from localStorage
 */
export function loadTOCState(
  hierarchy: HierarchicalSection[],
  docId: string
): HierarchicalSection[] {
  try {
    const savedState = localStorage.getItem(`toc-state-${docId}`);
    if (!savedState) return hierarchy;

    const state: Record<string, boolean> = JSON.parse(savedState);

    function applyState(sections: HierarchicalSection[]): HierarchicalSection[] {
      return sections.map(section => ({
        ...section,
        expanded: state[section.id] ?? section.expanded,
        children: applyState(section.children),
      }));
    }

    return applyState(hierarchy);
  } catch (error) {
    console.warn('Failed to load TOC state from localStorage:', error);
    return hierarchy;
  }
}
