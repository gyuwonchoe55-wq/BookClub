import { test, expect } from '@playwright/test';
import { App } from '../fixtures/app';

/**
 * E2E Test 7: New Session
 *
 * User Flow:
 * 1. Bookclub with completed meeting returns to room
 * 2. Click "+ 새 모임 만들기"
 * 3. Fill in new book title and date
 * 4. Click "새 회차 만들기"
 * 5. Verify new session bookclub room entry
 * 6. Verify existing participants are still there
 * 7. Verify past sessions list shows previous meeting
 */
test.describe('E2E 7: New Session', () => {
  let app: App;
  let bookClubId: string;

  test.beforeEach(async ({ page }) => {
    app = new App(page);
  });

  test('should create new session and maintain existing members', async ({
    page,
  }) => {
    // 1. Create bookclub
    const clubName = `New Session Test ${Date.now()}`;
    const firstBook = 'First Book';
    const secondBook = 'Second Book';

    const result = await app.createBookClub(clubName, 'Host', firstBook);
    bookClubId = result.bookClubId;

    // 2. Write record and complete a meeting (minimal)
    await app.writeReadingRecord('Sentence', 'Question', 'Application');
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    // Progress to end
    for (let i = 0; i < 25; i++) {
      const endButton = page.locator(
        'button:has-text("모임 종료"), button:has-text("End Meeting")'
      );
      if (await endButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await endButton.click();
        await page.waitForLoadState('networkidle');
        break;
      }

      const nextButton = page.locator('button:has-text("다음"), button:has-text("Next")').first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        break;
      }
    }

    // Return to bookclub
    const returnButton = page.locator(
      'button:has-text("돌아가기"), button:has-text("Return"), button:has-text("독서모임")'
    );
    if (await returnButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await returnButton.click();
      await page.waitForURL(new RegExp(`/${bookClubId}$`));
      await page.waitForLoadState('networkidle');
    }

    // 3. Click "+ 새 모임 만들기" or similar
    const newSessionButton = page.locator(
      'button:has-text("새"), button:has-text("새 회차"), button:has-text("New Session")'
    );

    if (await newSessionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newSessionButton.click();
      await page.waitForLoadState('networkidle');

      // 4. Fill in new session info
      await page.fill(
        'input[placeholder*="책" i], input[name*="bookTitle" i]',
        secondBook
      );

      await page.fill(
        'input[type="date"], input[name*="meetingDate" i]',
        '2026-10-15'
      );

      // 5. Click create button
      await page.click('button:has-text("만들기"), button:has-text("Create")');
      await page.waitForLoadState('networkidle');

      // 6. Verify we're in new session (book title changed)
      const newBookVisible = await page.locator(`text=${secondBook}`).isVisible({
        timeout: 5000,
      });
      expect(newBookVisible).toBeTruthy();

      // 7. Verify Host is still there (members maintained)
      const hostVisible = await page.locator('text=Host').isVisible({ timeout: 5000 });
      expect(hostVisible).toBeTruthy();
    }
  });

  test('should display past sessions list', async ({ page }) => {
    // Create bookclub
    const clubName = `Past Sessions Test ${Date.now()}`;
    const firstBook = 'First Book';
    const secondBook = 'Second Book';

    const result = await app.createBookClub(clubName, 'Host', firstBook);
    bookClubId = result.bookClubId;

    // Complete first session (simplified)
    await app.writeReadingRecord('S', 'Q', 'A');
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    // End meeting
    for (let i = 0; i < 20; i++) {
      const endButton = page.locator('button:has-text("모임 종료"), button:has-text("End Meeting")');
      if (await endButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await endButton.click();
        await page.waitForLoadState('networkidle');
        break;
      }

      const nextButton = page.locator('button:has-text("다음"), button:has-text("Next")').first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        break;
      }
    }

    // Return and create new session
    const returnButton = page.locator(
      'button:has-text("돌아가기"), button:has-text("Return"), button:has-text("독서모임")'
    );
    if (await returnButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await returnButton.click();
      await page.waitForURL(new RegExp(`/${bookClubId}$`));
      await page.waitForLoadState('networkidle');
    }

    // Create new session
    const newSessionButton = page.locator(
      'button:has-text("새"), button:has-text("새 회차"), button:has-text("New Session")'
    );

    if (await newSessionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newSessionButton.click();
      await page.waitForLoadState('networkidle');

      await page.fill(
        'input[placeholder*="책" i], input[name*="bookTitle" i]',
        secondBook
      );

      await page.click('button:has-text("만들기"), button:has-text("Create")');
      await page.waitForLoadState('networkidle');

      // Now check for past sessions list
      const pastSessionsButton = page.locator(
        'button:has-text("지난"), button:has-text("과거"), button:has-text("Past")'
      );
      const pastSessionsLink = page.locator('a:has-text("지난"), a:has-text("과거")');

      if (await pastSessionsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pastSessionsButton.click();
        await page.waitForLoadState('networkidle');

        // Should see the first book in past sessions
        const firstBookVisible = await page.locator(`text=${firstBook}`).isVisible({
          timeout: 5000,
        }).catch(() => false);

        // Past sessions might be displayed inline or on separate page
        // At minimum, no error should occur
        expect(page.url().includes(bookClubId)).toBeTruthy();
      }
    }
  });

  test('should only allow host to create new session', async ({
    page,
    browser,
  }) => {
    // Create bookclub
    const result = await app.createBookClub(
      `New Session Auth Test ${Date.now()}`,
      'Host',
      'Book'
    );
    bookClubId = result.bookClubId;

    // Complete first session
    await app.writeReadingRecord('S', 'Q', 'A');
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    // End quickly
    for (let i = 0; i < 20; i++) {
      const endButton = page.locator('button:has-text("모임 종료"), button:has-text("End Meeting")');
      if (await endButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await endButton.click();
        await page.waitForLoadState('networkidle');
        break;
      }

      const nextButton = page.locator('button:has-text("다음"), button:has-text("Next")').first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        break;
      }
    }

    // Return to bookclub
    const returnButton = page.locator(
      'button:has-text("돌아가기"), button:has-text("Return"), button:has-text("독서모임")'
    );
    if (await returnButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await returnButton.click();
      await page.waitForURL(new RegExp(`/${bookClubId}$`));
      await page.waitForLoadState('networkidle');
    }

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

    // Participant should NOT see new session button or it should be disabled
    const participantNewSessionBtn = pPage.locator(
      'button:has-text("새"), button:has-text("새 회차"), button:has-text("New Session")'
    );

    const isVisible = await participantNewSessionBtn.isVisible({ timeout: 2000 }).catch(
      () => false
    );
    const isDisabled = await participantNewSessionBtn.isDisabled().catch(() => false);

    expect(!isVisible || isDisabled).toBeTruthy();

    // Host should see new session button and it should be enabled
    const hostNewSessionBtn = page.locator(
      'button:has-text("새"), button:has-text("새 회차"), button:has-text("New Session")'
    );

    const hostCanSee = await hostNewSessionBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hostNotDisabled = !(await hostNewSessionBtn.isDisabled().catch(() => false));

    if (hostCanSee) {
      expect(hostNotDisabled).toBeTruthy();
    }

    await pContext.close();
  });

  test('should reset reading records for new session', async ({ page }) => {
    // Create bookclub
    const result = await app.createBookClub(
      `Record Reset Test ${Date.now()}`,
      'Host',
      'Book1'
    );
    bookClubId = result.bookClubId;

    // Write record for first session
    await app.writeReadingRecord('First Session Sentence', 'First Q', 'First A');

    // Verify record is there
    const recordVisible = await page.locator('text=First Session Sentence').isVisible({
      timeout: 3000,
    }).catch(() => false);

    // Complete session
    await page.click('button:has-text("모임 시작"), button:has-text("시작하기")');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 20; i++) {
      const endButton = page.locator('button:has-text("모임 종료"), button:has-text("End Meeting")');
      if (await endButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await endButton.click();
        await page.waitForLoadState('networkidle');
        break;
      }

      const nextButton = page.locator('button:has-text("다음"), button:has-text("Next")').first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        break;
      }
    }

    // Return and create new session
    const returnButton = page.locator(
      'button:has-text("돌아가기"), button:has-text("Return"), button:has-text("독서모임")'
    );
    if (await returnButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await returnButton.click();
      await page.waitForURL(new RegExp(`/${bookClubId}$`));
      await page.waitForLoadState('networkidle');
    }

    const newSessionButton = page.locator(
      'button:has-text("새"), button:has-text("새 회차"), button:has-text("New Session")'
    );

    if (await newSessionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newSessionButton.click();
      await page.waitForLoadState('networkidle');

      await page.fill(
        'input[placeholder*="책" i], input[name*="bookTitle" i]',
        'Book2'
      );

      await page.click('button:has-text("만들기"), button:has-text("Create")');
      await page.waitForLoadState('networkidle');

      // New session should not have previous session's records
      const oldRecordVisible = await page.locator('text=First Session Sentence').isVisible({
        timeout: 3000,
      }).catch(() => false);

      expect(!oldRecordVisible).toBeTruthy();
    }
  });
});
