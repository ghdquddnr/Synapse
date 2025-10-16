# E2E Tests with Detox

End-to-end tests for the Synapse mobile app using Detox.

## Prerequisites

- Android Studio with Android SDK
- Android Emulator (recommended: Pixel 5 API 33)
- Node.js 18+ and npm

## Setup

1. **Install Detox CLI globally** (optional but recommended):
   ```bash
   npm install -g detox-cli
   ```

2. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

3. **Set up Android Emulator**:
   - Open Android Studio
   - Create an AVD named `Pixel_5_API_33` (or update `.detoxrc.js` with your AVD name)
   - Start the emulator

## Running E2E Tests

### Build the app for testing

```bash
# Build debug APK and test APK
npm run test:e2e:build
```

### Run the tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
detox test e2e/firstTest.e2e.ts --configuration android.emu.debug

# Run with specific test pattern
detox test --configuration android.emu.debug --grep "should create a new note"
```

### Run on attached device

```bash
# Build for attached device
detox build --configuration android.attached.debug

# Run tests on attached device
detox test --configuration android.attached.debug
```

## Test Structure

```
e2e/
├── jest.config.js       # Jest configuration for E2E tests
├── setup.ts             # Global setup (app launch, cleanup)
├── helpers.ts           # Helper functions (tap, type, wait, etc.)
├── firstTest.e2e.ts     # Basic app and note CRUD tests
├── searchFlow.e2e.ts    # Search functionality tests
└── offlineSync.e2e.ts   # Offline mode and sync tests
```

## Test Scenarios

### 1. Basic App Launch (`firstTest.e2e.ts`)
- App launches successfully
- Bottom navigation is visible
- Note CRUD operations:
  - Create a new note
  - View note details
  - Edit an existing note
  - Delete a note

### 2. Search Flow (`searchFlow.e2e.ts`)
- Navigate to search screen
- Perform search and display results
- Tap search result and view detail
- Handle empty search results

### 3. Offline Sync (`offlineSync.e2e.ts`)
- Create note while offline
- Show offline indicator
- Sync when coming back online
- Persist offline changes after app restart
- Handle conflicts with LWW resolution

## Test ID Convention

UI elements should have `testID` prop for Detox to identify them:

```tsx
// Example
<View testID="homeScreen">
  <Button testID="createNoteButton" onPress={handleCreate} />
  <TextInput testID="searchInput" />
  <View testID="bottomNavigation">
    <TouchableOpacity testID="homeTab" />
    <TouchableOpacity testID="searchTab" />
    <TouchableOpacity testID="settingsTab" />
  </View>
</View>
```

## Debugging Tests

### View test logs

```bash
# Run with verbose logging
detox test --configuration android.emu.debug --loglevel verbose
```

### Take screenshots on failure

Detox automatically takes screenshots on test failures in `e2e/artifacts/`.

### Record video

```bash
# Run with video recording (requires additional setup)
detox test --configuration android.emu.debug --record-videos all
```

## Troubleshooting

### Emulator not found

**Problem**: Detox can't find the emulator

**Solution**:
```bash
# List available AVDs
emulator -list-avds

# Update .detoxrc.js with the correct AVD name
```

### Build fails

**Problem**: Gradle build fails

**Solution**:
```bash
# Clean gradle cache
cd android
./gradlew clean

# Build manually to check for errors
./gradlew assembleDebug assembleAndroidTest
```

### Tests timeout

**Problem**: Tests timeout waiting for elements

**Solution**:
- Increase timeout in test: `waitFor(element(matcher)).toBeVisible().withTimeout(10000)`
- Check that `testID` matches in the code
- Ensure the element is actually rendered

### App crashes during test

**Problem**: App crashes when running E2E tests

**Solution**:
- Check logcat: `adb logcat *:E`
- Run app manually to reproduce
- Check Metro bundler for errors

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Build E2E tests
  run: cd mobile && npm run test:e2e:build

- name: Run E2E tests
  run: cd mobile && npm run test:e2e
```

## Best Practices

1. **Use testID**: Always add `testID` to interactive elements
2. **Wait for elements**: Use `waitFor()` instead of fixed delays
3. **Clean state**: Reset app state between tests (use `device.launchApp({ delete: true })`)
4. **Descriptive names**: Use clear test descriptions
5. **Avoid flakiness**:
   - Don't rely on timing
   - Use proper element matchers
   - Handle async operations properly
6. **Reusable helpers**: Extract common operations to `helpers.ts`

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Detox API Reference](https://wix.github.io/Detox/docs/api/actions)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)
