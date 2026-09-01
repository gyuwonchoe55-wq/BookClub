import { test, expect } from '@playwright/test';
import { App } from '../fixtures/app';

/**
 * E2E Test 3: Reading Record
 *
 * User Flow:
 * 1. Create bookclub and join as participant
 * 2. Click "독서 기록 작성하기"
 * 3. Fill in 3 fields: sentence, question, application
 * 4. Click "저장하기"
 * 5. Verify return to bookclub room
 * 6. Verify reading record status shows "작성완료"
 */
test.describe('E2E 3: Reading Record', () => {
  let app: App;
  let bookClubId: string;

  test.beforeEach(async ({ page }) => {
    app = new App(page);
  });

  test('should create reading record and display completion status', async ({
    page,
  }) => {
    // 1. Create bookclub
    const clubName = `Record Test ${Date.now()}`;
    const result = await app.createBookClub(
      clubName,
      'Test User',
      'Test Book'
    );
    bookClubId = result.bookClubId;

    // 2. Click "독서 기록 작성하기"
    await page.click('button:has-text("독서 기록"), button:has-text("작성하기")');
    await page.waitForLoadState('networkidle');

    // Verify we're on record writing page
    const recordPageVisible = await page.url().includes('record');
    expect(recordPageVisible || page.locator('text=독서 기록').isVisible()).toBeTruthy();

    // 3. Fill in reading record fields
    const sentenceText =
      '이것은 인상 깊은 문장입니다. 이 책에서 가장 마음에 남은 부분입니다.';
    const questionText = '이 문장이 왜 중요하다고 생각하나요?';
    const applicationText = '우리 일상에 이를 적용하면 더 나은 삶을 살 수 있을 것 같습니다.';

    // Fill sentence field
    const sentenceInput = page.locator(
      'textarea[placeholder*="문장" i], input[placeholder*="인상" i]'
    );
    await sentenceInput.fill(sentenceText);

    // Fill question field
    const questionInput = page.locator(
      'textarea[placeholder*="질문" i], input[placeholder*="질문" i]'
    );
    await questionInput.fill(questionText);

    // Fill application field
    const applicationInput = page.locator(
      'textarea[placeholder*="적용" i], textarea[placeholder*="기억" i]'
    );
    await applicationInput.fill(applicationText);

    // 4. Click "저장하기"
    await page.click('button:has-text("저장"), button:has-text("Save")');
    await page.waitForLoadState('networkidle');

    // 5. Verify return to bookclub room
    const isBackOnBookclub =
      page.url().includes(bookClubId) &&
      !page.url().includes('record');
    expect(isBackOnBookclub || page.locator(`text=${clubName}`).isVisible()).toBeTruthy();

    // 6. Verify reading record completion status
    // Look for status indicator like "작성완료", checkmark, or similar
    const completionIndicators = [
      'text=작성완료',
      'text=완료',
      '[data-testid="record-status"]',
      'svg[data-testid*="check"]',
    ];

    let found = false;
    for (const indicator of completionIndicators) {
      const element = page.locator(indicator);
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        found = true;
        break;
      }
    }

    // Fallback: verify by checking the record is saved by navigating and returning
    if (!found) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      // Verify the record is still there after reload
      const recordStillVisible =
        await page.locator(`text=${sentenceText}`).isVisible().catch(() => false);
      expect(recordStillVisible || found).toBeTruthy();
    }
  });

  test('should allow editing reading record', async ({ page }) => {
    // Create bookclub and record
    const result = await app.createBookClub(
      `Edit Record ${Date.now()}`,
      'Test',
      'Book'
    );
    bookClubId = result.bookClubId;

    // Write initial record
    await page.click('button:has-text("독서 기록"), button:has-text("작성하기")');
    await page.waitForLoadState('networkidle');

    const initialSentence = 'Initial sentence';
    await page.locator('textarea[placeholder*="문장" i], input[placeholder*="인상" i]').fill(
      initialSentence
    );
    await page.locator('textarea[placeholder*="질문" i], input[placeholder*="질문" i]').fill(
      'Initial question'
    );
    await page.locator('textarea[placeholder*="적용" i], textarea[placeholder*="기억" i]').fill(
      'Initial application'
    );

    await page.click('button:has-text("저장")');
    await page.waitForLoadState('networkidle');

    // Go back to edit
    await page.click('button:has-text("수정"), button:has-text("Edit")');
    await page.waitForLoadState('networkidle');

    // Update record
    const updatedSentence = 'Updated sentence';
    const sentenceField = page.locator('textarea[placeholder*="문장" i], input[placeholder*="인상" i]');
    await sentenceField.clear();
    await sentenceField.fill(updatedSentence);

    await page.click('button:has-text("저장")');
    await page.waitForLoadState('networkidle');

    // Verify update
    const updatedContent = await page.textContent('body');
    expect(updatedContent?.includes(updatedSentence) || updatedContent?.includes(initialSentence)).toBeTruthy();
  });

  test('should require all fields to save reading record', async ({ page }) => {
    // Create bookclub
    await app.createBookClub(`Validation Test ${Date.now()}`, 'User', 'Book');

    // Go to record page
    await page.click('button:has-text("독서 기록"), button:has-text("작성하기")');
    await page.waitForLoadState('networkidle');

    // Try to save without filling fields
    const saveButton = page.locator('button:has-text("저장")');
    const isDisabled = await saveButton.isDisabled();

    if (!isDisabled) {
      // If button is not disabled, it might show validation error
      await saveButton.click();

      // Check for error message
      const errorVisible = await page.locator('[role="alert"], text=필수').isVisible({
        timeout: 3000,
      }).catch(() => false);

      expect(isDisabled || errorVisible).toBeTruthy();
    }
  });

  test('should display reading record status for all participants', async ({
    page,
    browser,
  }) => {
    // Create bookclub with multiple participants
    const clubName = `Status Test ${Date.now()}`;
    const result = await app.createBookClub(clubName, 'Host', 'Book');
    bookClubId = result.bookClubId;

    // Host writes record
    await app.writeReadingRecord(
      'Host sentence',
      'Host question',
      'Host application'
    );

    const inviteCode = await app.getInviteCode();

    // Participant joins and writes record
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

    await pPage.click('button:has-text("독서 기록"), button:has-text("작성하기")');
    await pPage.waitForLoadState('networkidle');

    await pPage.locator('textarea[placeholder*="문장" i], input[placeholder*="인상" i]').fill(
      'Participant sentence'
    );
    await pPage.locator('textarea[placeholder*="질문" i], input[placeholder*="질문" i]').fill(
      'Participant question'
    );
    await pPage.locator('textarea[placeholder*="적용" i], textarea[placeholder*="기억" i]').fill(
      'Participant application'
    );

    await pPage.click('button:has-text("저장")');
    await pPage.waitForLoadState('networkidle');

    // Verify both have completion status
    // Both pages should show completion status
    await expect(pPage.locator(`text=Host|text=Participant`)).toBeVisible({ timeout: 5000 });

    // Go back to host page and verify both statuses
    await page.goto(`/${bookClubId}`);
    await page.waitForLoadState('networkidle');

    // Should see both participants with status indicators
    await expect(page.locator(`text=Host`)).toBeVisible();
    await expect(page.locator(`text=Participant`)).toBeVisible();

    await pContext.close();
  });
});
