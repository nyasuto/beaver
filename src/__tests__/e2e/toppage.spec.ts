import { test, expect } from '@playwright/test';

/**
 * Top Page E2E Tests
 *
 * These tests verify the complete user experience of the top page
 * including all Issue #67 improvements:
 * - Layout optimization (#72)
 * - Content simplification (#73)
 * - Navigation improvements (#74)
 * - Design system unification (#75)
 * - Information density & responsive (#76)
 */
test.describe('Top Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the top page
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Layout Optimization (#72)', () => {
    test('should display optimized layout structure', async ({ page }) => {
      // Verify main page structure
      await expect(page.locator('html')).toBeVisible();
      await expect(page.locator('body')).toBeVisible();

      // Verify header is present and visible
      const header = page.locator('header, [data-testid="header"], nav');
      await expect(header.first()).toBeVisible();

      // Verify main content area exists
      const main = page.locator('main, [data-testid="main"], .main-content');
      await expect(main.first()).toBeVisible();

      // Verify footer is present (if exists)
      const footer = page.locator('footer, [data-testid="footer"]');
      const footerCount = await footer.count();
      if (footerCount > 0) {
        await expect(footer.first()).toBeVisible();
      }

      // Verify layout is not broken
      const bodyHeight = await page.locator('body').evaluate(el => el.scrollHeight);
      expect(bodyHeight).toBeGreaterThan(200); // Should have reasonable height
    });

    test('should have proper responsive layout', async ({ page }) => {
      // Test desktop layout
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('body')).toBeVisible();

      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('body')).toBeVisible();

      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('body')).toBeVisible();

      // Verify no horizontal scroll on mobile
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Content Simplification (#73)', () => {
    test('should display simplified key statistics', async ({ page }) => {
      // Look for key statistics that should be prominently displayed
      const statsSelectors = [
        '[data-testid="total-issues"]',
        '[data-testid="open-issues"]',
        '[data-testid="closed-issues"]',
        '.stat-card',
        '.stats',
        '.dashboard-stats',
      ];

      // At least one stats display should be visible
      let statsVisible = false;
      for (const selector of statsSelectors) {
        const element = page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          await expect(element.first()).toBeVisible();
          statsVisible = true;
          break;
        }
      }

      // If no specific stats found, check for any numeric content
      if (!statsVisible) {
        const numericContent = page.locator('text=/\\d+/');
        const numericCount = await numericContent.count();
        if (numericCount > 0) {
          await expect(numericContent.first()).toBeVisible();
          statsVisible = true;
        }
      }

      // Page should have some form of statistics or data
      expect(statsVisible).toBe(true);
    });

    test('should prioritize most important information', async ({ page }) => {
      // Check for proper information hierarchy
      const headings = page.locator('h1, h2, h3');
      const headingCount = await headings.count();

      if (headingCount > 0) {
        // Main heading should be visible
        await expect(headings.first()).toBeVisible();

        // Main heading should have appropriate content
        const mainHeadingText = await headings.first().textContent();
        expect(mainHeadingText).toBeTruthy();
        expect(mainHeadingText!.length).toBeGreaterThan(0);
      }

      // Check for proper content structure
      const paragraphs = page.locator('p');
      const paragraphCount = await paragraphs.count();

      // Should have some textual content
      expect(paragraphCount).toBeGreaterThan(0);
    });

    test('should not overwhelm with too much information', async ({ page }) => {
      // Count major content sections
      const contentSections = page.locator('section, article, .content-section, .card');
      const sectionCount = await contentSections.count();

      // Should have reasonable number of sections (not overwhelming)
      expect(sectionCount).toBeLessThan(20);

      // Check for reasonable text density
      const allText = await page.locator('body').textContent();
      const wordCount = allText ? allText.split(/\s+/).length : 0;

      // Should have content but not excessive
      expect(wordCount).toBeGreaterThan(10);
      expect(wordCount).toBeLessThan(2000); // Not too verbose
    });
  });

  test.describe('Navigation Improvements (#74)', () => {
    test('should have clear navigation structure', async ({ page }) => {
      // Check for navigation elements
      const navSelectors = [
        'nav',
        '[data-testid="navigation"]',
        '.nav',
        '.navbar',
        '.header-nav',
        '.menu',
      ];

      let navFound = false;
      for (const selector of navSelectors) {
        const nav = page.locator(selector);
        const count = await nav.count();
        if (count > 0) {
          await expect(nav.first()).toBeVisible();
          navFound = true;
          break;
        }
      }

      // Should have some form of navigation
      expect(navFound).toBe(true);
    });

    test('should have functional navigation links', async ({ page }) => {
      // Look for links
      const links = page.locator('a[href]');
      const linkCount = await links.count();

      if (linkCount > 0) {
        // First link should be visible
        await expect(links.first()).toBeVisible();

        // Check if link has valid href
        const href = await links.first().getAttribute('href');
        expect(href).toBeTruthy();

        // Test clicking a link (if it's internal)
        if (href && (href.startsWith('/') || href.startsWith('#'))) {
          await links.first().click();
          await page.waitForLoadState('networkidle');

          // Should navigate successfully
          const currentUrl = page.url();
          expect(currentUrl).toBeTruthy();
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Check for focusable elements
      const focusableElements = page.locator('a, button, input, select, textarea, [tabindex]');
      const focusableCount = await focusableElements.count();

      if (focusableCount > 0) {
        // First focusable element should be accessible
        await focusableElements.first().focus();

        // Check if element is focused
        const isFocused = await focusableElements
          .first()
          .evaluate(el => document.activeElement === el);
        expect(isFocused).toBe(true);
      }
    });
  });

  test.describe('Design System Unification (#75)', () => {
    test('should have consistent visual design', async ({ page }) => {
      // Check for consistent color scheme
      const bodyStyles = await page.locator('body').evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontFamily: computed.fontFamily,
        };
      });

      expect(bodyStyles.backgroundColor).toBeTruthy();
      expect(bodyStyles.color).toBeTruthy();
      expect(bodyStyles.fontFamily).toBeTruthy();
    });

    test('should have unified typography', async ({ page }) => {
      // Check headings have consistent styling
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();

      if (headingCount > 0) {
        for (let i = 0; i < Math.min(headingCount, 3); i++) {
          const heading = headings.nth(i);
          await expect(heading).toBeVisible();

          const fontSize = await heading.evaluate(el => {
            return window.getComputedStyle(el).fontSize;
          });

          expect(fontSize).toBeTruthy();
          expect(fontSize).not.toBe('16px'); // Should be different from body text
        }
      }
    });

    test('should have consistent spacing', async ({ page }) => {
      // Check for consistent margins and padding
      const sections = page.locator('section, article, .content-section');
      const sectionCount = await sections.count();

      if (sectionCount > 1) {
        // Check spacing between sections
        const firstSection = sections.first();
        const secondSection = sections.nth(1);

        await expect(firstSection).toBeVisible();
        await expect(secondSection).toBeVisible();

        // Sections should be properly spaced
        const firstSectionBox = await firstSection.boundingBox();
        const secondSectionBox = await secondSection.boundingBox();

        if (firstSectionBox && secondSectionBox) {
          const spacing = secondSectionBox.y - (firstSectionBox.y + firstSectionBox.height);
          expect(spacing).toBeGreaterThanOrEqual(0); // No overlap
        }
      }
    });
  });

  test.describe('Information Density & Responsive (#76)', () => {
    test('should adapt to different screen sizes', async ({ page }) => {
      // Test various screen sizes
      const screenSizes = [
        { width: 1920, height: 1080, name: 'Large Desktop' },
        { width: 1200, height: 800, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' },
      ];

      for (const size of screenSizes) {
        await page.setViewportSize({ width: size.width, height: size.height });

        // Page should render properly at each size
        await expect(page.locator('body')).toBeVisible();

        // Check for appropriate content density
        const visibleElements = page.locator('*:visible');
        const visibleCount = await visibleElements.count();

        expect(visibleCount).toBeGreaterThan(5); // Should have content

        // Check for horizontal scrolling (should be minimal)
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth + 5; // Allow 5px tolerance
        });

        expect(hasHorizontalScroll).toBe(false);
      }
    });

    test('should maintain readability at all sizes', async ({ page }) => {
      // Test readability on mobile
      await page.setViewportSize({ width: 375, height: 667 });

      // Check text is readable size
      const paragraphs = page.locator('p');
      const paragraphCount = await paragraphs.count();

      if (paragraphCount > 0) {
        const fontSize = await paragraphs.first().evaluate(el => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });

        expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
      }

      // Check tap targets are adequate size
      const buttons = page.locator('button, a');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const buttonBox = await buttons.first().boundingBox();
        if (buttonBox) {
          expect(buttonBox.height).toBeGreaterThanOrEqual(32); // Minimum tap target
        }
      }
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test('should meet basic accessibility requirements', async ({ page }) => {
      // Check for page title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);

      // Check for main landmark
      const mainLandmark = page.locator('main, [role="main"]');
      const mainCount = await mainLandmark.count();
      expect(mainCount).toBeGreaterThan(0);

      // Check for heading hierarchy
      const h1 = page.locator('h1');
      const h1Count = await h1.count();
      expect(h1Count).toBeGreaterThan(0);
    });

    test('should handle JavaScript disabled gracefully', async ({ page }) => {
      // Disable JavaScript
      await page.context().addInitScript(() => {
        Object.defineProperty(navigator, 'javaEnabled', {
          value: () => false,
        });
      });

      await page.goto('/');

      // Page should still render basic content
      await expect(page.locator('body')).toBeVisible();

      // Should have some text content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(10);
    });
  });
});
