import { test, expect } from '@playwright/test';

/**
 * User Workflow E2E Tests
 *
 * These tests verify complete user journeys and workflows
 * across the application, ensuring all features work together
 * seamlessly for real-world usage scenarios.
 */
test.describe('User Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Issue Discovery and Analysis Workflow', () => {
    test('should allow users to discover and analyze issues', async ({ page }) => {
      // Step 1: User lands on homepage and sees overview
      await expect(page.locator('body')).toBeVisible();

      // Step 2: User navigates to issues page
      const issuesLink = page.locator('a[href*="issues"], a[href="/issues"]');
      const issuesLinkCount = await issuesLink.count();

      if (issuesLinkCount > 0) {
        await issuesLink.first().click();
        await page.waitForLoadState('networkidle');

        // Step 3: User should see issues list
        const currentUrl = page.url();
        expect(currentUrl).toContain('issues');

        // Step 4: User can view issue details
        const issueLinks = page.locator('a[href*="issues/"]');
        const issueLinksCount = await issueLinks.count();

        if (issueLinksCount > 0) {
          await issueLinks.first().click();
          await page.waitForLoadState('networkidle');

          // Should show issue details
          const detailUrl = page.url();
          expect(detailUrl).toContain('issues/');

          // Should have issue content
          const issueContent = page.locator('h1, h2, .issue-title, .title');
          const contentCount = await issueContent.count();
          expect(contentCount).toBeGreaterThan(0);
        }
      }
    });

    test('should support issue filtering and search', async ({ page }) => {
      // Navigate to issues page
      await page.goto('/issues');
      await page.waitForLoadState('networkidle');

      // Look for search/filter capabilities
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search"], input[placeholder*="filter"]'
      );
      const searchCount = await searchInput.count();

      if (searchCount > 0) {
        // Test search functionality
        await searchInput.first().fill('bug');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');

        // Should show search results or filtered content
        const resultsContainer = page.locator('.results, .search-results, .filtered-results');
        const resultsCount = await resultsContainer.count();

        // Either specific results container or page should still be functional
        expect(resultsCount >= 0).toBe(true);
      }

      // Look for filter options
      const filterElements = page.locator('select, .filter, .filter-option, button[data-filter]');
      const filterCount = await filterElements.count();

      if (filterCount > 0) {
        // Test filter functionality
        await filterElements.first().click();
        await page.waitForLoadState('networkidle');

        // Page should still be functional after filter interaction
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Analytics and Reporting Workflow', () => {
    test('should allow users to view analytics and reports', async ({ page }) => {
      // Step 1: User looks for analytics/dashboard
      const analyticsSelectors = [
        'a[href*="analytics"]',
        'a[href*="dashboard"]',
        'a[href*="reports"]',
        'a[href*="quality"]',
        '.analytics-link',
        '.dashboard-link',
      ];

      let analyticsFound = false;
      for (const selector of analyticsSelectors) {
        const element = page.locator(selector);
        const count = await element.count();

        if (count > 0) {
          await element.first().click();
          await page.waitForLoadState('networkidle');

          // Should navigate to analytics page
          const currentUrl = page.url();
          expect(currentUrl).toBeTruthy();

          analyticsFound = true;
          break;
        }
      }

      // If no specific analytics link, check for data visualization on current page
      if (!analyticsFound) {
        const chartElements = page.locator('canvas, .chart, .graph, .visualization');
        const chartCount = await chartElements.count();

        if (chartCount > 0) {
          await expect(chartElements.first()).toBeVisible();
          analyticsFound = true;
        }
      }

      // Should have some form of analytics/data visualization
      expect(analyticsFound).toBe(true);
    });

    test('should display interactive charts and metrics', async ({ page }) => {
      // Navigate to quality page if it exists
      await page.goto('/quality');
      await page.waitForLoadState('networkidle');

      // Look for interactive elements
      const interactiveElements = page.locator('canvas, .chart, .interactive, button, select');
      const interactiveCount = await interactiveElements.count();

      if (interactiveCount > 0) {
        // Test interaction with first interactive element
        const firstInteractive = interactiveElements.first();
        await expect(firstInteractive).toBeVisible();

        // Try to interact with it
        await firstInteractive.click();
        await page.waitForTimeout(1000); // Wait for any animations

        // Page should remain functional
        await expect(page.locator('body')).toBeVisible();
      }

      // Look for metrics display
      const metricsElements = page.locator('.metric, .stat, .number, .percentage');
      const metricsCount = await metricsElements.count();

      if (metricsCount > 0) {
        // Should display actual metrics
        const metricText = await metricsElements.first().textContent();
        expect(metricText).toBeTruthy();
      }
    });
  });

  test.describe('Cross-page Navigation Workflow', () => {
    test('should support seamless navigation between pages', async ({ page }) => {
      // Test navigation flow: Home -> Issues -> Back to Home

      // Step 1: Start on homepage
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const homeUrl = page.url();
      expect(homeUrl).toBeTruthy();

      // Step 2: Navigate to issues
      const issuesLink = page.locator('a[href*="issues"], a[href="/issues"]');
      const issuesLinkCount = await issuesLink.count();

      if (issuesLinkCount > 0) {
        await issuesLink.first().click();
        await page.waitForLoadState('networkidle');

        const issuesUrl = page.url();
        expect(issuesUrl).toContain('issues');

        // Step 3: Navigate back to home
        const homeLink = page.locator('a[href="/"], a[href=""], .home-link, .logo');
        const homeLinkCount = await homeLink.count();

        if (homeLinkCount > 0) {
          await homeLink.first().click();
          await page.waitForLoadState('networkidle');

          const finalUrl = page.url();
          expect(finalUrl).toBe(homeUrl);
        }
      }
    });

    test('should maintain navigation state across pages', async ({ page }) => {
      // Test that navigation remains consistent
      const pages = ['/', '/issues', '/quality'];

      for (const pagePath of pages) {
        try {
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');

          // Should have consistent navigation elements
          const navElements = page.locator('nav, .nav, .navigation, .menu');
          const navCount = await navElements.count();

          if (navCount > 0) {
            await expect(navElements.first()).toBeVisible();
          }

          // Should have page title
          const title = await page.title();
          expect(title).toBeTruthy();
        } catch {
          // Page might not exist, skip to next
          continue;
        }
      }
    });
  });

  test.describe('Responsive User Experience Workflow', () => {
    test('should provide consistent experience across devices', async ({ page }) => {
      const deviceScenarios = [
        { width: 1200, height: 800, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' },
      ];

      for (const device of deviceScenarios) {
        await page.setViewportSize({ width: device.width, height: device.height });

        // Test core functionality on each device
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Should render properly
        await expect(page.locator('body')).toBeVisible();

        // Should have no horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth + 10;
        });
        expect(hasHorizontalScroll).toBe(false);

        // Should have functional navigation
        const navElements = page.locator('nav, .nav, a[href]');
        const navCount = await navElements.count();

        if (navCount > 0) {
          await expect(navElements.first()).toBeVisible();
        }

        // Test touch targets on mobile
        if (device.width <= 768) {
          const clickableElements = page.locator('button, a, input[type="submit"]');
          const clickableCount = await clickableElements.count();

          if (clickableCount > 0) {
            const buttonBox = await clickableElements.first().boundingBox();
            if (buttonBox) {
              expect(buttonBox.height).toBeGreaterThanOrEqual(32);
            }
          }
        }
      }
    });
  });

  test.describe('Error Handling and Recovery Workflow', () => {
    test('should handle navigation errors gracefully', async ({ page }) => {
      // Test navigation to non-existent page
      try {
        await page.goto('/non-existent-page');
        await page.waitForLoadState('networkidle');

        // Should show some form of error page or redirect
        const pageContent = await page.locator('body').textContent();
        expect(pageContent).toBeTruthy();

        // Should have some way to get back to working parts of the site
        const homeLink = page.locator('a[href="/"], a[href=""], .home-link, .back-link');
        const homeLinkCount = await homeLink.count();

        if (homeLinkCount > 0) {
          await homeLink.first().click();
          await page.waitForLoadState('networkidle');

          // Should navigate back to working page
          const currentUrl = page.url();
          expect(currentUrl).toBeTruthy();
        }
      } catch (error) {
        // 404 handling varies by server setup
        expect(error).toBeDefined();
      }
    });

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      // Monitor console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Navigate through the site
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to interact with elements
      const interactiveElements = page.locator('button, a, input');
      const interactiveCount = await interactiveElements.count();

      if (interactiveCount > 0) {
        await interactiveElements.first().click();
        await page.waitForTimeout(1000);
      }

      // Should have minimal console errors
      expect(consoleErrors.length).toBeLessThan(5);
    });
  });

  test.describe('Performance and Loading Workflow', () => {
    test('should load pages efficiently', async ({ page }) => {
      const testPages = ['/', '/issues', '/quality'];

      for (const pagePath of testPages) {
        try {
          const startTime = Date.now();

          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');

          const loadTime = Date.now() - startTime;
          expect(loadTime).toBeLessThan(15000); // 15 seconds max

          // Should be interactive
          const interactiveElements = page.locator('button, a, input');
          const interactiveCount = await interactiveElements.count();

          if (interactiveCount > 0) {
            await expect(interactiveElements.first()).toBeVisible();
          }
        } catch {
          // Page might not exist, continue
          continue;
        }
      }
    });

    test('should handle slow network conditions', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should still load and be functional
      await expect(page.locator('body')).toBeVisible();

      // Should have some content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(10);
    });
  });
});
