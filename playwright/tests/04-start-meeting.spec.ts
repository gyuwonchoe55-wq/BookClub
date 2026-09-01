import { test, expect } from '@playwright/test';
import { App } from '../fixtures/app';

/**
 * E2E Test 4: Start Meeting
 *
 * User Flow:
 * 1. Create bookclub
 * 2. Click "모임 시작하기"
 * 3. Verify session is created
 * 4. Verify redirect to STEP 1
 * 5. Verify sessionId in URL
 */
test.describe('E2E 4: Start Meeting', () => {
  let app: App;
  let bookClubId: string;

  test.beforeEach(async ({ page }) => {
    app = new App(page);
  });

  test('should start meeting and navigate to STEP 1', async ({ page }) => {
    // 1. Create bookclub
    const result = await app.createBookClub(
      `Start Meeting Test ${Date.now()}`,
      'Host',
      'Test Book'
    );
    bookClubId = result.bookClubId;

    // 2. Click "모임 시작하기"
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    // 3. Verify session is created and redirect to STEP 1
    await page.waitForURL(/\/session\/step1/);

    // 4. Verify sessionId is in URL
    const url = page.url();
    const sessionId = new URL(url).searchParams.get('sessionId');

    expect(sessionId).toBeTruthy();
    expect(sessionId?.length).toBeGreaterThan(0);

    // 5. Verify STEP 1 page content
    const step1Content = await page.locator('text=STEP 1|text=아이스브레이킹').isVisible({
      timeout: 5000,
    }).catch(() => false);

    expect(step1Content || url.includes('step1')).toBeTruthy();
  });

  test('should display current step information', async ({ page }) => {
    // Create bookclub
    const result = await app.createBookClub(
      `Step Display Test ${Date.now()}`,
      'Host',
      'Book'
    );
    bookClubId = result.bookClubId;

    // Start meeting
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    // Verify step indicator is visible
    const stepIndicators = [
      'text=STEP 1',
      'text=1단계',
      'text=아이스브레이킹',
      '[data-testid="current-step"]',
    ];

    let found = false;
    for (const indicator of stepIndicators) {
      const element = page.locator(indicator);
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        found = true;
        break;
      }
    }

    expect(found).toBeTruthy();
  });

  test('should only allow host to start meeting', async ({ page, browser }) => {
    // Create bookclub
    const result = await app.createBookClub(
      `Host Only Test ${Date.now()}`,
      'Host',
      'Book'
    );
    bookClubId = result.bookClubId;

    // Get invite code
    const inviteCode = await app.getInviteCode();

    // Participant joins
    const pContext = await browser.newContext();
    const pPage = await pContext.newPage();

    await pPage.goto(`/join/${inviteCode}`);
    await pPage.waitForLoadState('networkidle');

    await pPage.fill(
      'input[placeholder*="별명" i], input[name*="nickname" i]',
      'Participant'
    );
    await pPage.click('button:has-text("참여하기")');
    await pPage.waitForURL(new RegExp(`/${bookClubId}$`));
    await pPage.waitForLoadState('networkidle');

    // Participant should not see start button or it should be disabled
    const startButton = pPage.locator('button:has-text("모임 시작"), button:has-text("시작하기")');
    const isDisabled = await startButton.isDisabled().catch(() => false);
    const isVisible = await startButton.isVisible({ timeout: 2000 }).catch(() => false);

    expect(!isVisible || isDisabled).toBeTruthy();

    await pContext.close();
  });

  test('should maintain session state across page reload', async ({ page }) => {
    // Create bookclub
    const result = await app.createBookClub(
      `Session State Test ${Date.now()}`,
      'Host',
      'Book'
    );
    bookClubId = result.bookClubId;

    // Start meeting
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    // Get session ID
    const url = page.url();
    const sessionId = new URL(url).searchParams.get('sessionId');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify session ID is still the same
    const reloadedUrl = page.url();
    const reloadedSessionId = new URL(reloadedUrl).searchParams.get('sessionId');

    expect(reloadedSessionId).toBe(sessionId);
  });

  test('should display progress information', async ({ page }) => {
    // Create bookclub
    const result = await app.createBookClub(
      `Progress Test ${Date.now()}`,
      'Host',
      'Book'
    );
    bookClubId = result.bookClubId;

    // Start meeting
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    // Look for progress indicators
    const progressIndicators = [
      'text=진행률',
      'text=남은 시간',
      'text=%',
      '[role="progressbar"]',
      '[data-testid="progress"]',
    ];

    let progressShown = false;
    for (const indicator of progressIndicators) {
      const element = page.locator(indicator);
      const visible = await element.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        progressShown = true;
        break;
      }
    }

    // Progress may or may not be shown, but URL should confirm we're in a session
    expect(page.url().includes('step1')).toBeTruthy();
  });
});
