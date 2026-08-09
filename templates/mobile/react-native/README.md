# __PROJECT_NAME__

Cross-platform mobile application generated with **Nova** using **React Native** and **Expo SDK 52**.

## Getting Started

1. Install dependencies:

```bash
__INSTALL_CMD__
```

2. Start the development server:

```bash
__DEV_CMD__
```

In the interactive terminal:
- Press **i** to open in iOS Simulator (macOS required)
- Press **a** to open in Android Emulator
- Press **w** to open in Web Browser
- Scan the QR code using the **Expo Go** app on your physical iOS or Android device

## Project Structure

```
├── App.tsx             # Root dashboard component & navigation provider
├── app.json            # Expo configuration (bundle ID, package name, icons)
├── index.js            # Entry point for native bundle
├── src/
│   ├── components/     # Reusable UI components (Card, Button, etc.)
│   ├── services/       # Typed API client
│   └── theme/          # Design tokens (colors, typography)
└── tsconfig.json       # TypeScript configuration
```

## Documentation

See `docs/mobile.md` for details on EAS build, native dependencies, and production deployment.
