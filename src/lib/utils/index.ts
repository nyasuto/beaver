/**
 * Utility Functions Index
 *
 * This module exports all utility functions for the Beaver Astro application.
 * These functions provide common functionality used throughout the application.
 *
 * @module Utilities
 */

// Utility modules exports
export {
  markdownToHtml,
  markdownToPlainText,
  truncateMarkdown,
  extractFirstParagraph,
} from './markdown';

// Common utility functions
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const noop = (): void => {
  // Intentionally empty
};

export const identity = <T>(value: T): T => value;

export const isNotNull = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const range = (start: number, end?: number, step = 1): number[] => {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
};
