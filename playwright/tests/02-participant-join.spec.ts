import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { App } from '../fixtures/app';

/**
 * E2E Test 2: Participant Join
 *
 * User Flow:
 * 1. Host creates a bookclub
 * 2. Extract invite link from bookclub page
 * 3. New participant opens invite link in different browser context
 * 4. Participant enters nickname and clicks "참여하기"
 * 5. Verify participant is added to bookclub
 * 6. Verify participant appears in members list
 */
test.describe('E2E 2: Participant Join', () => {
  let hostApp: App;
  let participantApp: App;
  let bookClubId: string;
  let inviteCode: string;

  test.beforeEach(async ({ page }) => {
    hostApp = new App(page);
  });

  test('should allow participant to join bookclub via invite link', async ({
    page,
    context,
    browser,
  }) => {
    // 1. Host creates a bookclub
    const hostName = 'Host User';
    const clubName = `Join Test ${Date.now()}`;
    const bookTitle = 'Test Book';

    const result = await hostApp.createBookClub(clubName, hostName, bookTitle);
    bookClubId = result.bookClubId;

    // 2. Extract invite code from bookclub page
    inviteCode = await hostApp.getInviteCode();
    expect(inviteCode).toBeTruthy();

    // 3. Create new browser context for participant (simulate different user)
    const participantContext = await browser.newContext();
    const participantPage = await participantContext.newPage();
    participantApp = new App(participantPage);

    // 4. Participant accesses invite link
    await participantPage.goto(`/join/${inviteCode}`);
    await participantPage.waitForLoadState('networkidle');

    // Verify invite page is shown
    await expect(
      participantPage.locator(`text=${clubName}`)
    ).toBeVisible({ timeout: 5000 });

    // 5. Participant enters nickname and joins
    const participantName = 'Participant User';
    await participantPage.fill(
      'input[placeholder*="별명" i], input[name*="nickname" i]',
      participantName
    );

    await participantPage.click('button:has-text("참여하기")');

    // Wait for navigation to bookclub room
    await participantPage.waitForURL(new RegExp(`/${bookClubId}$`));
    await participantPage.waitForLoadState('networkidle');

    // 6. Verify participant appears in members list
    await expect(
      participantPage.locator(`text=${participantName}`)
    ).toBeVisible();

    // Verify host is still shown
    await expect(participantPage.locator(`text=${hostName}`)).toBeVisible();

    // Clean up
    await participantContext.close();
  });

  test('should display bookclub info on join page before participation', async ({
    page,
    context,
    browser,
  }) => {
    // Create bookclub
    const clubName = `Display Test ${Date.now()}`;
    const bookTitle = 'Display Book';

    const result = await hostApp.createBookClub(
      clubName,
      'Host',
      bookTitle,
      '2026-09-20'
    );
    bookClubId = result.bookClubId;

    // Get invite code
    inviteCode = await hostApp.getInviteCode();

    // Open join page in new context
    const joinContext = await browser.newContext();
    const joinPage = await joinContext.newPage();

    await joinPage.goto(`/join/${inviteCode}`);
    await joinPage.waitForLoadState('networkidle');

    // Verify info is displayed
    await expect(joinPage.locator(`text=${clubName}`)).toBeVisible();
    await expect(joinPage.locator(`text=${bookTitle}`)).toBeVisible();

    // Verify nickname input field exists
    const nicknameInput = joinPage.locator(
      'input[placeholder*="별명" i], input[name*="nickname" i]'
    );
    await expect(nicknameInput).toBeVisible();

    // Verify join button exists
    const joinButton = joinPage.locator('button:has-text("참여하기")');
    await expect(joinButton).toBeVisible();

    await joinContext.close();
  });

  test('should update member list when multiple participants join', async ({
    page,
    browser,
  }) => {
    // Create bookclub
    const clubName = `Multi Join ${Date.now()}`;
    const result = await hostApp.createBookClub(clubName, 'Host', 'Book');
    bookClubId = result.bookClubId;

    inviteCode = await hostApp.getInviteCode();

    // Multiple participants join
    const participantNames = ['Participant 1', 'Participant 2', 'Participant 3'];

    for (const pName of participantNames) {
      const pContext = await browser.newContext();
      const pPage = await pContext.newPage();

      await pPage.goto(`/join/${inviteCode}`);
      await pPage.waitForLoadState('networkidle');

      await pPage.fill(
        'input[placeholder*="별명" i], input[name*="nickname" i]',
        pName
      );

      await pPage.click('button:has-text("참여하기")');
      await pPage.waitForURL(new RegExp(`/${bookClubId}$`));
      await pPage.waitForLoadState('networkidle');

      await pContext.close();
    }

    // Verify all participants are shown on host's page
    await page.goto(`/${bookClubId}`);
    await page.waitForLoadState('networkidle');

    for (const pName of participantNames) {
      await expect(page.locator(`text=${pName}`)).toBeVisible();
    }

    // Verify member count is correct (host + 3 participants)
    const memberCount = await page.locator('[data-testid*="member"], li').count();
    expect(memberCount).toBeGreaterThanOrEqual(3);
  });
});
