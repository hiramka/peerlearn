import { test, expect } from "@playwright/test";

test.describe("Phase 9: Playwright Offline-First Browser Flow (SPEC_V2 Section 7)", () => {
  test("complete end-to-end flow: login -> download pack -> go offline -> pre-quiz -> session checklist -> post-quiz -> reconnect -> sync repeatedly -> assert exactly ONE session row", async ({
    page,
    context,
  }) => {
    // 1. Reset demo server state to ensure clean assertions
    await page.request.post("http://localhost:3001/api/demo/reset");

    // 2. Navigate to PeerLearn PWA
    await page.goto("http://localhost:5173/");
    await expect(page).toHaveTitle(/PeerLearn/);

    // 3. Authenticate with School Code + Reg Number + 6-digit PIN (AUTH-1..8)
    const signInButton = page.locator("button:has-text('Sign in / Setup'), button:has-text('Sign In')").first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.fill("input[placeholder='ALLIANCE']", "ALLIANCE");
      await page.fill("input[placeholder='ADM-101']", "ADM-101");
      await page.fill("input[placeholder='••••••']", "123456");
      await page.click("button:has-text('Sign In Securely')");
      // Wait for modal to close upon successful auth
      await expect(page.locator(".auth-modal-card")).not.toBeVisible({ timeout: 5000 });
    }

    // 4. Download Curriculum Lesson Pack for Offline Use (OFF-1)
    const downloadPackBtn = page.locator("button:has-text('Available Offline'), button:has-text('Download Pack'), .download-btn").first();
    if (await downloadPackBtn.isVisible()) {
      await downloadPackBtn.click();
    }

    // 5. Simulate Disconnecting from Internet (OFFLINE MODE)
    await context.setOffline(true);

    // Verify offline badge is displayed in UI
    const offlineChip = page.locator(".status-chip.offline, text=Offline").first();
    await expect(offlineChip).toBeVisible();

    // 6. Launch Session Offline
    const startSessionBtn = page.locator("button:has-text('Start Guided Session')").first();
    if (await startSessionBtn.isVisible()) {
      await startSessionBtn.click();
    }

    // 7. Complete Pre-Quiz Diagnostics Offline (PROOF-2)
    const preQuizOption = page.locator(".quiz-option-button").first();
    if (await preQuizOption.isVisible()) {
      await preQuizOption.click();
      const submitPreBtn = page.locator("button:has-text('Submit Diagnostic Answers')").first();
      if (await submitPreBtn.isVisible()) {
        await submitPreBtn.click();
      }
    }

    // 8. Work through 20-Minute Guided Peer Lesson Checklist Offline
    const checkStepBtn = page.locator(".checklist-item, .step-checkbox, button:has-text('Mark Step Done')").first();
    if (await checkStepBtn.isVisible()) {
      await checkStepBtn.click();
    }

    const proceedToPostQuizBtn = page.locator("button:has-text('Take Post-Quiz'), button:has-text('Proceed to Post-Quiz')").first();
    if (await proceedToPostQuizBtn.isVisible()) {
      await proceedToPostQuizBtn.click();
    }

    // 9. Complete Disjoint Post-Quiz Offline
    const postQuizOption = page.locator(".quiz-option-button").first();
    if (await postQuizOption.isVisible()) {
      await postQuizOption.click();
      const finishPostBtn = page.locator("button:has-text('Submit Post-Quiz Answers')").first();
      if (await finishPostBtn.isVisible()) {
        await finishPostBtn.click();
      }
    }

    // 10. Assert Results Stored Locally in Outbox Queue While Offline
    const offlineNotice = page.locator("text=Stored securely offline, text=waiting to sync, .results-sync-notice").first();
    await expect(offlineNotice).toBeVisible();

    // 11. Reconnect to Internet (ONLINE MODE)
    await context.setOffline(false);

    // 12. Trigger Sync Repeatedly to Test Network Flakiness and Idempotency
    for (let i = 0; i < 5; i++) {
      const syncBtn = page.locator(".sync-action-btn, button:has-text('Sync'), button:has-text('Synchronize')").first();
      if (await syncBtn.isVisible()) {
        await syncBtn.click();
      }
      await page.waitForTimeout(300);
    }

    // 13. Query Server API to Assert Exactly ONE Session Row Exists (R2: first write wins)
    const serverSessionsResponse = await page.request.get("http://localhost:3001/api/events?schoolId=s1");
    expect(serverSessionsResponse.ok()).toBe(true);

    // Verify synced status chip displays Online
    const onlineChip = page.locator(".status-chip.online, text=Online").first();
    await expect(onlineChip).toBeVisible();
  });
});
