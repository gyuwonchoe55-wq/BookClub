import { test, expect } from '@playwright/test';
import { App } from '../fixtures/app';

/**
 * E2E Test 1: Create Bookclub
 *
 * User Flow:
 * 1. Visit landing page
 * 2. Click "독서모임 시작하기"
 * 3. Fill in bookclub creation form
 * 4. Click "독서모임 만들기"
 * 5. Verify redirection to bookclub room
 * 6. Verify bookclub info is displayed
 */
test.describe('E2E 1: Create Bookclub', () => {
  let app: App;
  let bookClubId: string;

  test.beforeEach(async ({ page }) => {
    app = new App(page);
  });

  test('should create a new bookclub and redirect to bookclub room', async ({
    page,
  }) => {
    // 1. Visit landing page
    await app.gotoHome();
    await app.expectToSee('함께 읽고');

    // 2. Click "독서모임 시작하기"
    await page.click('button:has-text("독서모임 시작하기")');
    await page.waitForURL('/create');
    await page.waitForLoadState('networkidle');

    // 3. Fill in bookclub creation form
    const clubName = `Test Bookclub ${Date.now()}`;
    const nickname = 'Test Host';
    const bookTitle = '테스트 책';
    const meetingDate = '2026-09-15';

    await page.fill('input[name="clubName"]', clubName);
    await page.fill('input[name="nickname"]', nickname);
    await page.fill('input[name="bookTitle"]', bookTitle);
    await page.fill('input[name="meetingDate"]', meetingDate);

    // 4. Click "독서모임 만들기"
    await page.click('button[type="submit"]');

    // 5. Verify redirection to bookclub room
    await page.waitForURL(/\/[a-z0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    bookClubId = url.split('/').pop() || '';

    // Verify we're on a valid bookclub page
    expect(bookClubId).toBeTruthy();
    expect(bookClubId.length).toBeGreaterThan(0);

    // 6. Verify bookclub info is displayed
    // Wait for page content to load properly
    await page.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for clubName in page text
    const pageText = await page.textContent('body');
    const containsClubName = pageText?.includes(clubName) ?? false;

    expect(containsClubName).toBeTruthy();

    // Check for bookTitle
    const bookTitleText = await page.locator(`text=${bookTitle}`).isVisible();
    expect(bookTitleText).toBeTruthy();

    // Check for host marker
    const hostText = await page.locator(`text=${nickname}`).isVisible();
    expect(hostText).toBeTruthy();

    // Verify current meeting is displayed
    await expect(page.locator('text=현재 회차')).toBeVisible({ timeout: 5000 });
  });

  test('should display invite link on bookclub page', async ({ page }) => {
    // Create bookclub first
    const result = await app.createBookClub(
      `Test BC ${Date.now()}`,
      'Host',
      'Test Book',
      '2026-09-15'
    );
    bookClubId = result.bookClubId;

    // Verify invite link is accessible
    const inviteLink = await page.getAttribute(
      'button[title*="invite" i], a[href*="/join/"]',
      'href'
    );

    // Or check for the link in page content
    const joinLinkVisible = await page.locator('text=/join\\//').isVisible();
    expect(joinLinkVisible || inviteLink).toBeTruthy();
  });

  test('should display bookclub information correctly', async ({ page }) => {
    const clubName = `Bookclub ${Date.now()}`;
    const bookTitle = 'Learn Playwright';

    await app.createBookClub(clubName, 'Creator', bookTitle, '2026-10-01');

    // Verify club name
    await expect(page.locator(`text=${clubName}`)).toBeVisible();

    // Verify book title
    await expect(page.locator(`text=${bookTitle}`)).toBeVisible();

    // Verify creator name
    await expect(page.locator(`text=Creator`)).toBeVisible();

    // Verify meeting status is shown
    await expect(
      page.locator('text=scheduled, text=예정됨, text=진행 예정')
    ).toBeVisible({ timeout: 5000 });
  });
});
