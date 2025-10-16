import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

/**
 * Helper function to wait for an element to be visible
 */
export async function waitForElement(
  matcher: Detox.NativeMatcher,
  timeout: number = 5000
) {
  await waitFor(element(matcher))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Helper function to tap an element after waiting for it
 */
export async function tapElement(
  matcher: Detox.NativeMatcher,
  timeout: number = 5000
) {
  await waitForElement(matcher, timeout);
  await element(matcher).tap();
}

/**
 * Helper function to type text into an input field
 */
export async function typeText(
  matcher: Detox.NativeMatcher,
  text: string,
  timeout: number = 5000
) {
  await waitForElement(matcher, timeout);
  await element(matcher).typeText(text);
}

/**
 * Helper function to clear and type text
 */
export async function clearAndType(
  matcher: Detox.NativeMatcher,
  text: string,
  timeout: number = 5000
) {
  await waitForElement(matcher, timeout);
  await element(matcher).clearText();
  await element(matcher).typeText(text);
}

/**
 * Helper function to scroll until an element is visible
 */
export async function scrollToElement(
  scrollViewMatcher: Detox.NativeMatcher,
  elementMatcher: Detox.NativeMatcher,
  direction: Detox.Direction = 'down',
  distance: number = 200
) {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .whileElement(scrollViewMatcher)
    .scroll(distance, direction);
}

/**
 * Helper function to enable/disable airplane mode (simulates offline mode)
 */
export async function setAirplaneMode(enabled: boolean) {
  if (device.getPlatform() === 'android') {
    // Android: use ADB to toggle airplane mode
    const enableValue = enabled ? 'enable' : 'disable';
    await device.setURLBlacklist([enableValue === 'enable' ? '.*' : '']);
  }
}

/**
 * Helper function to wait for network request to complete
 */
export async function waitForNetworkIdle(timeout: number = 3000) {
  // Simple wait - in real scenario, you might want to use network mocking
  await new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Restart the app
 */
export async function restartApp(permissions?: any) {
  await device.terminateApp();
  await device.launchApp(permissions);
}
