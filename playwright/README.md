# Playwright E2E Tests

End-to-end tests for the bookclub application using Playwright.

## Overview

This test suite covers 7 critical user flows:

1. **Create Bookclub** - 독서모임 생성
2. **Participant Join** - 참여자 참여
3. **Reading Record** - 독서 기록 작성
4. **Start Meeting** - 모임 시작
5. **Steps Progression** - STEP 진행
6. **End Meeting** - 모임 종료
7. **New Session** - 새 회차 생성

## Installation

Playwright is installed as a dev dependency:

```bash
npm install -D @playwright/test
```

To install browsers:

```bash
npx playwright install
```

## Configuration

The test configuration is in `playwright.config.ts` at the project root.

Key settings:

- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium
- **Run Mode**: Sequential (fullyParallel: false)
- **Webserver**: Auto-starts `npm run dev`
- **Screenshots**: Only on failure
- **Trace**: On first retry
- **Reporter**: HTML

## Running Tests

### All tests

```bash
npm run e2e
```

### UI mode (interactive)

```bash
npm run e2e:ui
```

Allows you to:
- Run tests one at a time
- Step through tests
- Inspect elements
- See live browser interaction

### Debug mode

```bash
npm run e2e:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Headed mode (see browser)

```bash
npm run e2e:headed
```

Runs tests with visible browser (default is headless).

### Specific test

```bash
npx playwright test 01-create-bookclub
```

Or run a single test:

```bash
npx playwright test 01-create-bookclub.spec.ts -g "should create"
```

### View report

After tests run:

```bash
npm run e2e:report
```

Opens HTML report showing:
- Test results
- Screenshots
- Video recordings (if enabled)
- Timing information

## Test Structure

```
playwright/
├── tests/
│   ├── 01-create-bookclub.spec.ts
│   ├── 02-participant-join.spec.ts
│   ├── 03-reading-record.spec.ts
│   ├── 04-start-meeting.spec.ts
│   ├── 05-steps-progression.spec.ts
│   ├── 06-end-meeting.spec.ts
│   └── 07-new-session.spec.ts
├── fixtures/
│   └── app.ts (App helper class)
└── README.md
```

## App Helper Class

The `App` class in `fixtures/app.ts` provides high-level methods for testing:

```typescript
// Create bookclub
const { bookClubId } = await app.createBookClub(
  'Club Name',
  'Nickname',
  'Book Title',
  '2026-09-15'
);

// Join bookclub
await app.joinBookClub(bookClubId, inviteCode, 'Participant Name');

// Write reading record
await app.writeReadingRecord(
  'Sentence',
  'Question',
  'Application'
);

// Start meeting
const { sessionId } = await app.startMeeting();

// Navigate through steps
await app.nextSentence();
await app.nextQuestion();
await app.nextTakeaway();

// End meeting
await app.endMeeting();
await app.returnToBookClubRoom(bookClubId);

// Create new session
await app.createNewSession('New Book Title', '2026-10-01');
```

## Writing Tests

### Basic test structure

```typescript
import { test, expect } from '@playwright/test';
import { App } from '../fixtures/app';

test.describe('Feature Name', () => {
  let app: App;

  test.beforeEach(async ({ page }) => {
    app = new App(page);
  });

  test('should do something', async ({ page }) => {
    await app.gotoHome();
    // ... test actions
    await expect(page.locator('text=Expected Text')).toBeVisible();
  });
});
```

### Best practices

1. **Use App helper methods** - They abstract away implementation details
2. **Clear test names** - Should describe what is being tested
3. **Wait for network** - Use `page.waitForLoadState('networkidle')`
4. **Flexible selectors** - Use text-based selectors when possible
5. **Meaningful assertions** - Check for both success and failure cases

### Debugging tips

1. Use `--debug` mode to step through tests
2. Add `page.pause()` to stop at a point
3. Use `page.screenshot()` to capture state
4. Check browser console: `await page.evaluate(() => console.log(document.body.innerHTML))`

## CI/CD Integration

Tests are configured to run in CI environment:

```bash
CI=true npm run e2e
```

CI settings:
- Retries: 2
- Workers: 1 (sequential)
- No reuse of existing server

## Performance

Expected test execution time:
- Individual test: 30-60 seconds
- Full suite (7 tests): 4-7 minutes
- With UI mode: varies by user interaction speed

## Troubleshooting

### Tests timeout

- Ensure dev server is running: `npm run dev`
- Check if Supabase is connected
- Increase timeout: `{ timeout: 30000 }` in test

### Element not found

- Use `--headed` mode to see what's happening
- Check selectors match actual element text
- Add logging: `console.log(await page.locator('...').count())`

### Navigation not working

- Verify URL patterns match your routes
- Add wait for navigation: `await page.waitForURL(...)`
- Check for redirects in your app

### Flaky tests

- Add proper waits: `page.waitForLoadState('networkidle')`
- Use stable selectors (not by class alone)
- Add explicit waits for dynamic content

## Files Modified/Created

### Created
- `/playwright/playwright.config.ts` - Configuration file
- `/playwright/fixtures/app.ts` - App helper class
- `/playwright/tests/01-create-bookclub.spec.ts`
- `/playwright/tests/02-participant-join.spec.ts`
- `/playwright/tests/03-reading-record.spec.ts`
- `/playwright/tests/04-start-meeting.spec.ts`
- `/playwright/tests/05-steps-progression.spec.ts`
- `/playwright/tests/06-end-meeting.spec.ts`
- `/playwright/tests/07-new-session.spec.ts`
- `/playwright/README.md` - This file

### Modified
- `/package.json` - Added E2E test scripts

## Next Steps

1. Run tests locally: `npm run e2e:ui`
2. Fix any failing tests
3. Add to CI/CD pipeline
4. Increase coverage with additional tests
5. Set up parallel execution for faster feedback

## Resources

- [Playwright Documentation](https://playwright.dev)
- [API Testing Guide](https://playwright.dev/docs/test-api-testing)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
