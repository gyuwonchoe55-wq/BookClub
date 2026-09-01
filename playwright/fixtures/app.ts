import { Page, expect } from '@playwright/test';

/**
 * App Helper Class
 *
 * Provides high-level methods for E2E testing that simulate user interactions.
 * Abstracts away implementation details and makes tests more readable.
 */
export class App {
  constructor(private page: Page, private baseURL: string = '') {}

  /**
   * Navigate to home page
   */
  async gotoHome() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to create bookclub page and fill form
   */
  async createBookClub(
    clubName: string,
    nickname: string,
    bookTitle: string,
    meetingDate?: string
  ) {
    // Click "독서모임 시작하기" or navigate to /create
    await this.page.goto('/create');
    await this.page.waitForLoadState('networkidle');

    // Fill club name
    await this.page.fill('input[name="clubName"]', clubName);

    // Fill nickname
    await this.page.fill('input[name="nickname"]', nickname);

    // Fill book title
    await this.page.fill('input[name="bookTitle"]', bookTitle);

    // Fill meeting date if provided
    if (meetingDate) {
      await this.page.fill('input[name="meetingDate"]', meetingDate);
    }

    // Click submit button
    await this.page.click('button[type="submit"]');

    // Wait for navigation to book club room
    await this.page.waitForURL(/\/[a-z0-9-]+$/);
    await this.page.waitForLoadState('networkidle');

    // Extract and return bookClubId from URL
    const url = this.page.url();
    const bookClubId = url.split('/').pop();
    return { bookClubId };
  }

  /**
   * Get invite code from current bookclub page
   */
  async getInviteCode(): Promise<string> {
    // The invite code should be displayed on the bookclub page
    // Look for it in the page content or get it from the button/link text
    const inviteLink = await this.page.getAttribute(
      'button[title*="invite" i], button[title*="share" i], a[href*="join"]',
      'href'
    );

    if (inviteLink) {
      const code = inviteLink.split('/').pop();
      if (code) return code;
    }

    // Fallback: try to find it in visible text
    const text = await this.page.textContent('body');
    const match = text?.match(/\/join\/([A-Z0-9]+)/);
    return match?.[1] || '';
  }

  /**
   * Join a bookclub via invite link
   */
  async joinBookClub(bookClubId: string, inviteCode: string, nickname: string) {
    // Navigate to join page
    await this.page.goto(`/join/${inviteCode}`);
    await this.page.waitForLoadState('networkidle');

    // Fill nickname
    await this.page.fill('input[name*="nickname" i], input[placeholder*="별명" i]', nickname);

    // Click join button
    await this.page.click('button:has-text("참여하기"), button:has-text("Join")');

    // Wait for navigation to bookclub room
    await this.page.waitForURL(new RegExp(`/${bookClubId}$`));
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Write reading record
   */
  async writeReadingRecord(
    sentence: string,
    question: string,
    application: string
  ) {
    // Click "독서 기록 작성하기" button
    await this.page.click('button:has-text("독서 기록"), button:has-text("작성하기")');

    // Wait for record page to load
    await this.page.waitForLoadState('networkidle');

    // Fill sentence field
    await this.page.fill(
      'textarea[placeholder*="문장" i], input[placeholder*="인상" i]',
      sentence
    );

    // Fill question field
    await this.page.fill(
      'textarea[placeholder*="질문" i], input[placeholder*="질문" i]',
      question
    );

    // Fill application field
    await this.page.fill(
      'textarea[placeholder*="적용" i], input[placeholder*="기억" i]',
      application
    );

    // Click save button
    await this.page.click('button:has-text("저장"), button:has-text("Save")');

    // Wait for navigation back to bookclub room
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Start meeting
   */
  async startMeeting() {
    // Click "모임 시작하기" button
    await this.page.click('button:has-text("모임 시작"), button:has-text("시작하기")');

    // Wait for session creation and navigation to step 1
    await this.page.waitForURL(/\/session\/step1/);
    await this.page.waitForLoadState('networkidle');

    // Extract sessionId from URL
    const url = this.page.url();
    const sessionId = new URL(url).searchParams.get('sessionId') || '';
    return { sessionId };
  }

  /**
   * Proceed to next sentence (in STEP 1)
   */
  async nextSentence() {
    // Click "다음 문장" or similar button
    await this.page.click('button:has-text("다음"), button:has-text("Next")');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reveal author in STEP 1
   */
  async revealAuthor() {
    // Click "작성자 공개" or similar button
    const buttons = await this.page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text?.includes('공개') || text?.includes('Reveal')) {
        await button.click();
        break;
      }
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Proceed to next question (in STEP 2)
   */
  async nextQuestion() {
    // Click "다음 질문" or similar button
    await this.page.click('button:has-text("다음"), button:has-text("Next")');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Proceed to next takeaway (in STEP 3)
   */
  async nextTakeaway() {
    // Click "다음 참여자" or similar button
    await this.page.click('button:has-text("다음"), button:has-text("Next")');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * End meeting
   */
  async endMeeting() {
    // Click "모임 종료" button
    await this.page.click('button:has-text("모임 종료"), button:has-text("End")');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Return to bookclub room after meeting
   */
  async returnToBookClubRoom(bookClubId: string) {
    // Click "독서모임방으로 돌아가기" button
    await this.page.click('button:has-text("돌아가기"), button:has-text("Return")');

    // Wait for navigation back to bookclub room
    await this.page.waitForURL(new RegExp(`/${bookClubId}$`));
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Create new session
   */
  async createNewSession(
    bookTitle: string,
    meetingDate?: string
  ) {
    // Click "+ 새 모임 만들기" button
    await this.page.click('button:has-text("새"), button:has-text("새 회차")');

    // Wait for new session page
    await this.page.waitForLoadState('networkidle');

    // Fill book title
    await this.page.fill('input[placeholder*="책" i], input[name*="bookTitle" i]', bookTitle);

    // Fill meeting date if provided
    if (meetingDate) {
      await this.page.fill('input[type="date"], input[name*="meetingDate" i]', meetingDate);
    }

    // Click create button
    await this.page.click('button:has-text("만들기"), button:has-text("Create")');

    // Wait for navigation to new session bookclub room
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify current page displays specific text
   */
  async expectToSee(text: string) {
    await expect(this.page.locator(`text=${text}`)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify current page URL matches pattern
   */
  async expectURL(pattern: RegExp | string) {
    if (typeof pattern === 'string') {
      await this.page.waitForURL(pattern);
    } else {
      await this.page.waitForURL(pattern);
    }
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Get the underlying page object for direct access if needed
   */
  getPage(): Page {
    return this.page;
  }
}
