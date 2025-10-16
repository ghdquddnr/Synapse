import { device } from 'detox';

beforeAll(async () => {
  // Launch app before all tests
  await device.launchApp({
    permissions: { notifications: 'YES' },
    delete: true, // Delete app before launching (clean slate)
  });
});

beforeEach(async () => {
  // Reload React Native bundle before each test
  await device.reloadReactNative();
});

afterAll(async () => {
  // Clean up after all tests
  await device.terminateApp();
});
