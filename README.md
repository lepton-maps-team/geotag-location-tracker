# GeoTag Location Tracker

A React Native mobile application built with Expo that enables field workers to capture, store, and manage GPS location data with video recording capabilities. The app is designed for survey and field data collection workflows with offline-first architecture.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Folder Structure](#4-folder-structure)
5. [Core Modules](#5-core-modules--components)
6. [Code Details](#6-code-details)
7. [Setup & Installation](#7-setup--installation)
8. [Configuration](#8-configuration)
9. [Scripts & Commands](#9-scripts--commands)
10. [Glossary](#10-glossary)
11. [Change Log](#11-change-log)

---

## 1. Project Overview

### Primary Use Cases

- Field survey data collection with GPS tracking
- Video recording with location metadata
- Recording location paths with metadata (Block, Route, Entity, ChildRing)
- Offline-first data capture with cloud sync capabilities
- Session management and organization

### Target Users

- Field surveyors and data collectors
- Field workers conducting location-based surveys
- Teams requiring GPS tracking with structured metadata and video recording

### Key Features

- **Real-time GPS Tracking**: Continuous location recording with Kalman filtering for accuracy
- **Video Recording**: Record videos with location metadata
- **Metadata Management**: Rich session metadata (Block, Route, Entity, ChildRing)
- **Offline Support**: Local storage with AsyncStorage, upload when connectivity available
- **Search & Filter**: Search sessions by name
- **Cloud Sync**: Upload sessions and videos to backend
- **Export**: Save sessions and videos for sharing
- **Authentication**: User login with backend API integration

---

## 2. Architecture

### Overall System Architecture

```
┌─────────────────────────────────────────┐
│         Mobile App (React Native)        │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   UI     │  │  State   │  │  Local  ││
│  │  Layer   │→ │  Mgmt    │→ │ Storage ││
│  └──────────┘  └──────────┘  └────────┘│
│       ↓              ↓            ↓      │
│  ┌──────────────────────────────────┐  │
│  │      Expo Router Navigation       │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │   Backend API        │
         │  (Login, Upload)      │
         └──────────────────────┘
```

### Frontend / Backend / Services Breakdown

**Frontend (React Native/Expo)**

- File-based routing with Expo Router
- Component-based UI architecture
- Local state management with React hooks
- AsyncStorage for persistent local data

**Backend**

- REST API for authentication and data upload
- Video upload support
- User authentication service

**Services**

- **Location Service**: `expo-location` for GPS tracking
- **Storage Service**: `AsyncStorage` for local persistence
- **Filter Service**: Custom Kalman filter for GPS smoothing
- **Video Service**: `expo-camera` for video recording
- **File Service**: `expo-file-system` for file operations

### Data Flow

1. **Recording Flow**:

   ```
   User Input (Metadata) → Start Recording → GPS Tracking + Video Recording →
   Kalman Filter → Distance Filter → Store in State → Save to AsyncStorage
   ```

2. **Upload Flow**:

   ```
   Select Session → Upload Video → Upload GPS Track → Mark as uploaded →
   Update AsyncStorage
   ```

3. **Authentication Flow**:
   ```
   Login Screen → API Call → Validate credentials → Store user in AsyncStorage →
   Navigate to Home
   ```

---

## 3. Tech Stack

### Core

- **React Native** (0.81.5): Mobile framework
- **React** (19.1.0): UI library
- **TypeScript** (5.9.2): Type safety
- **Expo** (~54.0.23): Development platform and tooling

### Navigation & Routing

- **expo-router** (~6.0.14): File-based routing
- **@react-navigation/native** (^7.1.8): Navigation primitives

### Backend & Data

- **axios** (^1.6.0): HTTP client for API calls
- **@supabase/supabase-js** (^2.80.0): Supabase client (optional)
- **@react-native-async-storage/async-storage** (2.2.0): Local storage

### Location & Device

- **expo-location** (~19.0.7): GPS tracking
- **expo-camera** (~17.0.9): Camera and video recording
- **expo-file-system** (~19.0.19): File operations
- **expo-media-library** (~18.2.0): Media library access
- **expo-sharing** (~14.0.7): File sharing
- **react-native-maps** (1.20.1): Map display

### UI & Styling

- **@expo/vector-icons** (^15.0.3): Material Icons
- **react-native-svg** (15.12.1): SVG rendering
- **react-native-safe-area-context** (^5.6.1): Safe area handling

### Development Tools

- **ESLint** (^9.25.0): Linting
- **eslint-config-expo** (~10.0.0): Expo ESLint config
- **TypeScript** (5.9.2): Type checking

---

## 4. Folder Structure

```
location-tracker/
├── app/                           # Expo Router pages (file-based routing)
│   ├── _layout.tsx               # Root layout with navigation stack
│   ├── index.tsx                 # Home screen (session list)
│   ├── auth.tsx                  # Authentication screen
│   ├── location.tsx              # GPS recording screen
│   ├── video.tsx                 # Video recording screen
│   ├── account.tsx               # User account screen
│   ├── modal.tsx                 # Modal screen
│   └── components/               # App-specific components
│       ├── FloatingActionButton.tsx
│       ├── HeroHeader.tsx
│       ├── MetadataDialog.tsx
│       ├── RecordingView.tsx
│       ├── SearchBar.tsx
│       ├── SessionListItem.tsx
│       ├── SessionsList.tsx
│       └── UploadProgressDialog.tsx
│
├── components/                    # Reusable React components
│   ├── Auth.tsx                  # Login form component
│   ├── LocationMap.tsx           # Map component
│   ├── themed-text.tsx           # Themed text component
│   ├── themed-view.tsx           # Themed view component
│   ├── haptic-tab.tsx            # Haptic feedback tab
│   └── external-link.tsx         # External link component
│
├── lib/                          # Core business logic
│   ├── supabase.ts              # Supabase client configuration
│   ├── filter.ts                # AdaptiveKalman GPS filter
│   └── video-upload.ts          # Video upload utilities
│
├── constants/                    # Static data and configuration
│   ├── lists.ts                 # Metadata options arrays
│   └── theme.ts                 # Theme constants
│
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts      # Color scheme detection
│   ├── use-color-scheme.web.ts  # Web color scheme
│   └── use-theme-color.ts       # Theme color hook
│
├── assets/                       # Static assets
│   └── images/                  # App icons, splash screens
│
├── scripts/                      # Build and utility scripts
│   └── reset-project.js         # Project reset script
│
├── app.json                      # Expo app configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── babel.config.js               # Babel configuration
├── metro.config.js               # Metro bundler configuration
├── eslint.config.js              # ESLint configuration
└── README.md                     # This file
```

### Entry Points

- **`app/_layout.tsx`**: Root layout, initializes navigation stack
- **`app/index.tsx`**: Home screen, first screen after auth
- **`index.js`**: Expo entry point (expo-router/entry)

### Critical Modules

- **`lib/supabase.ts`**: Backend connection configuration
- **`lib/filter.ts`**: GPS smoothing algorithm
- **`app/location.tsx`**: Core GPS recording logic
- **`app/index.tsx`**: Session management and upload logic
- **`lib/video-upload.ts`**: Video upload functionality

---

## 5. Core Modules & Components

### 5.1 Authentication Module (`components/Auth.tsx`)

**Purpose**: User authentication via backend API

**Key Responsibilities**:

- Validate username/password against backend API
- Store authenticated user in AsyncStorage
- Handle login errors and display feedback

**Public API**:

- Component renders login form
- On success: stores user data, navigates to home

**Important Logic**:

- Makes POST request to login API endpoint
- Validates response status code (must be "5001" for successful login)
- Stores user object in AsyncStorage under key `"user"`
- Error handling for invalid credentials and network issues

**Bug Fix - Authentication Status Code Validation:**

Previously, there was a bug that allowed users to login with incorrect passwords due to a status code mismatch in the validation logic. This caused authentication to succeed even with wrong credentials, which then led to upload failures since the user ID was invalid or missing. The issue has been fixed by properly validating the API response status code (Status === "5001") before storing user data and allowing login to proceed.

**Interactions**:

- Uses `axios` for API calls
- Uses `expo-router` for navigation
- Uses `AsyncStorage` for session persistence

### 5.2 Location Recording Module (`app/location.tsx`)

**Purpose**: Capture GPS location data with video and metadata

**Key Responsibilities**:

- Request location and camera permissions
- Record GPS points with Kalman filtering
- Record video with metadata
- Collect session metadata (Block, Route, Entity, ChildRing)
- Save sessions to AsyncStorage

**Public API**:

- Screen component with recording UI
- Exports `LocationScreen` component

**Important Internal Logic**:

1. **Metadata Collection**: Modal form collects required fields before recording
2. **GPS Tracking**:

   - Uses `expo-location.watchPositionAsync` with high accuracy
   - Applies `AdaptiveKalman` filter to smooth coordinates
   - Distance filter: only adds points if moved minimum distance

3. **Video Recording**: Records video using `expo-camera`

4. **Session Storage**: Saves to AsyncStorage key `"RECORDINGS"` as JSON array

**Interactions**:

- Uses `lib/filter.ts` for GPS smoothing
- Uses `AsyncStorage` for persistence
- Uses `expo-camera` for video recording

### 5.3 Home/Session List Module (`app/index.tsx`)

**Purpose**: Display and manage recorded sessions

**Key Responsibilities**:

- Load sessions from AsyncStorage
- Display session list with search functionality
- Handle session actions: upload, save, edit, delete
- Verify authentication on focus

**Public API**:

- Screen component with session list
- Exports `HomeScreen` component

**Important Internal Logic**:

1. **Session Loading**: Reads from AsyncStorage on screen focus
2. **Search**: Filters by session name (case-insensitive)
3. **Upload Logic**:
   - Uploads video to backend
   - Uploads GPS track data
   - Marks session as `uploaded: true` in AsyncStorage
4. **Save to Device**: Exports session and video files
5. **Edit**: Updates session metadata in AsyncStorage
6. **Delete**: Removes session from AsyncStorage array

**Interactions**:

- Uses `lib/video-upload.ts` for video uploads
- Uses `expo-file-system` and `expo-sharing` for file operations
- Uses `AsyncStorage` for local storage

### 5.4 GPS Filter Module (`lib/filter.ts`)

**Purpose**: Smooth GPS coordinates using Kalman filtering

**Key Responsibilities**:

- Reduce GPS noise and jitter
- Adapt filter parameters based on GPS accuracy

**Public API**:

```typescript
class AdaptiveKalman {
  filter(value: number, accuracy: number | null): number;
}
```

**Important Logic**:

- **Initialization**: First value initializes filter
- **Adaptive Noise**: Measurement noise (`R`) adjusts based on GPS accuracy
- **Kalman Algorithm**: Standard prediction-correction cycle
- **Process Noise**: Fixed `Q = 0.00001` for process uncertainty

**Usage**: One filter instance per coordinate (latitude, longitude)

### 5.5 Supabase Client (`lib/supabase.ts`)

**Purpose**: Configure and export Supabase client (optional backend)

**Key Responsibilities**:

- Initialize Supabase client with URL and API key
- Configure authentication storage (AsyncStorage)
- Enable session persistence

**Public API**:

- Exports `supabase` client instance

**Configuration**:

- Supabase URL and publishable key are hardcoded
- Uses AsyncStorage for auth persistence
- Auto-refresh tokens enabled

---

## 6. Code Details

### 6.1 Type Definitions

**Location Data Structure** (`app/location.tsx`):

```typescript
type LocationData = {
  Latitude: number;
  Longitude: number;
  Accuracy: number | null;
  Timestamp: number; // Seconds since first point (0 for first point)
};
```

**Session Metadata Structure** (`app/location.tsx`):

```typescript
type SessionMeta = {
  videoName: string;
  blockName: string;
  route: string;
  entity: string;
  childRing: string;
  videoPath?: string | null;
  recordedAt?: number; // Timestamp when recording started
};
```

**Recording Session Structure** (`app/location.tsx`):

```typescript
type RecordingSession = {
  meta: SessionMeta;
  uploaded?: boolean; // Optional flag for upload status
  videoUri?: string | null;
  pathFile?: string | null;
};
```

### 6.2 Key Data Structures

**AsyncStorage Keys**:

- `"RECORDINGS"`: Array of `RecordingSession` objects (metadata only)
- `"user"`: User object from authentication

**Storage Architecture**:

**Important Note on Path Storage:**

Initially, GPS path data was stored in AsyncStorage along with session metadata. However, due to AsyncStorage limitations (size constraints and performance issues with large datasets), the path storage was moved to the file system.

- **Path Storage**: GPS paths are now saved as JSON files in the file system (`FileSystem.documentDirectory + "paths/"`)
- **Session Metadata**: Only session metadata is stored in AsyncStorage (small, lightweight data)
- **File Reference**: Sessions reference their path files via the `pathFile` property containing the file URI

This separation allows the app to handle large GPS tracking datasets without hitting AsyncStorage size limits.

**Session Storage Format**:

```typescript
// AsyncStorage.getItem("RECORDINGS") returns:
[
  {
    meta: {
      videoName: "Field Survey 1",
      blockName: "Block A",
      route: "R1",
      entity: "Entity 1",
      childRing: "CR1",
      videoPath: "file:///path/to/video.mp4",
      recordedAt: 1642234567890,
    },
    uploaded: false,
    videoUri: "file:///path/to/video.mp4",
    pathFile: "file:///path/to/path.json",
  },
  // ... more sessions
];
```

### 6.3 Core Module Code Examples

#### 6.3.1 Kalman Filter Implementation (`lib/filter.ts`)

**Complete Filter Class**:

```typescript
export class AdaptiveKalman {
  private R = 0.0001; // measurement noise (adaptive)
  private Q = 0.00001; // process noise (fixed)
  private x = 0; // estimated value
  private p = 1; // estimation error covariance
  private k = 0; // Kalman gain
  private initialized = false;

  filter(value: number, accuracy: number | null): number {
    // Initialize with first value
    if (!this.initialized) {
      this.x = value;
      this.initialized = true;
      return value;
    }

    // Adapt measurement noise based on GPS accuracy
    if (accuracy !== null && accuracy > 0) {
      this.R = Math.max(0.0001, accuracy * accuracy * 0.000001);
    }

    // Prediction step
    this.p = this.p + this.Q;

    // Update step
    this.k = this.p / (this.p + this.R);
    this.x = this.x + this.k * (value - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }
}
```

**Usage Example**:

```typescript
// Create separate filters for latitude and longitude
const latFilter = useRef(new AdaptiveKalman()).current;
const lngFilter = useRef(new AdaptiveKalman()).current;

// Apply filtering
const smoothLat = latFilter.filter(latitude, accuracy || null);
const smoothLng = lngFilter.filter(longitude, accuracy || null);
```

#### 6.3.2 Authentication Logic (`components/Auth.tsx`)

**Login Implementation**:

```typescript
const handleLogin = useCallback(async () => {
  const trimmedUsername = username.trim();

  if (!trimmedUsername || !password) {
    setError("Please enter both username and password.");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const data = JSON.stringify({
      User_Name: trimmedUsername,
      Password: password,
      Fcm_Key: "your_fcm_key",
    });

    const response = await axios.post(
      "https://your-api.com/api/Video/LoginUser",
      { data },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responseData =
      typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data.data
        ? JSON.parse(response.data.data)
        : response.data;

    const { Status, Message, Result } = responseData;

    if (Status !== "5001" || !Result) {
      setError(Message || "Invalid username or password.");
      return;
    }

    // Store user data
    await AsyncStorage.setItem("user", JSON.stringify(Result));
    router.replace("/");
  } catch (caughtError) {
    console.error("Login error:", caughtError);
    setError("An unexpected error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
}, [password, router, username]);
```

#### 6.3.3 Supabase Client Configuration (`lib/supabase.ts`)

**Client Setup**:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://your-project.supabase.co";
const supabasePublishableKey = "your_publishable_key";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### 6.3.4 Permission Handling

**Location Permission**:

```typescript
const ensureLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Location permission is required to record."
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error requesting location permission:", error);
    Alert.alert("Error", "Could not request location permission.");
    return false;
  }
};
```

**Camera Permission**:

```typescript
const [cameraPermission, requestCameraPermission] = useCameraPermissions();
const [microphonePermission, requestMicrophonePermissions] =
  useMicrophonePermissions();

// Request permissions
if (!cameraPermission?.granted) {
  await requestCameraPermission();
}
if (!microphonePermission?.granted) {
  await requestMicrophonePermissions();
}
```

#### 6.3.5 Error Handling Patterns

**Standard Error Handling**:

```typescript
try {
  // Async operation
  await someAsyncOperation();
} catch (error) {
  console.error("Operation failed:", error);
  Alert.alert("Error", "Operation failed. Please try again.");
} finally {
  // Cleanup
  setLoading(false);
}
```

### 6.4 Component Hooks Usage

**useFocusEffect for Data Loading**:

```typescript
useFocusEffect(
  useCallback(() => {
    const fetchLocations = async () => {
      const storedLocations = await AsyncStorage.getItem("RECORDINGS");
      const parsed = storedLocations ? JSON.parse(storedLocations) : [];
      setLocations(parsed);
    };
    fetchLocations();
  }, [])
);
```

**useRef for Filters**:

```typescript
// Filters persist across re-renders
const latFilter = useRef(new AdaptiveKalman()).current;
const lngFilter = useRef(new AdaptiveKalman()).current;

// Subscription ref for cleanup
const locationSubscription = useRef<Location.LocationSubscription | null>(null);
```

### 6.5 Key Algorithms and Calculations

**Distance Calculation** (Haversine approximation):

```typescript
// Calculate distance between two GPS points in meters
const dx = lat2 - lat1;
const dy = lng2 - lng1;
const distance = Math.sqrt(dx * dx + dy * dy) * 111320; // ~111320 meters per degree
```

**Timestamp Calculation**:

```typescript
// First point timestamp = 0
// Subsequent points = seconds since first point
if (currentPath.length === 0) {
  firstPointTimestamp.current = Date.now();
  timestamp = 0;
} else {
  timestamp = Math.floor((Date.now() - firstPointTimestamp.current!) / 1000);
}
```

---

## 7. Setup & Installation

### Prerequisites

- **Node.js**: v18+ recommended
- **npm** or **yarn** or **pnpm**
- **Expo CLI**: `npm install -g expo-cli` (optional, can use `npx`)
- **iOS Development**: Xcode (macOS only) for iOS builds
- **Android Development**: Android Studio for Android builds
- **Expo Go App**: For development on physical devices (optional)

### Installation Steps

1. **Clone repository** (if applicable):

   ```bash
   git clone <repository-url>
   cd location-tracker
   ```

2. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure Backend**:

   - Update API endpoints in authentication and upload modules
   - Configure Supabase (if using) in `lib/supabase.ts`

4. **Configure Google Maps** (Android):
   - Update `app.json` with your Google Maps API key

### Running Locally

**Development Server**:

```bash
npm start
# or
yarn start
# or
pnpm start
```

**Platform-Specific**:

```bash
npm run android    # Run on Android emulator/device
npm run ios        # Run on iOS simulator/device
npm run web        # Run in web browser
```

**Expo Go**:

- Scan QR code with Expo Go app
- App loads on device

### Build and Production Steps

#### Important: JavaScript Engine Configuration

**⚠️ Before building, ensure `app.json` has `jsEngine: 'hermes'` configured:**

```json
{
  "expo": {
    "jsEngine": "hermes"
    // ... other config
  }
}
```

Hermes is required for optimal performance and is enabled by default in modern Expo projects.

#### EAS Build (Recommended for Production)

EAS Build is the recommended way to create production builds. It builds your app in the cloud on Expo's servers.

**Step-by-Step Guide:**

1. **Install EAS CLI globally:**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to your Expo account:**

   ```bash
   eas login
   ```

   If you don't have an account, create one at [expo.dev](https://expo.dev)

3. **Configure EAS Build (first time only):**

   ```bash
   eas build:configure
   ```

   This creates/updates the `eas.json` file in your project.

4. **Build Android APK (Preview Profile):**

   ```bash
   eas build --platform android --profile preview
   ```

   - This creates an APK file (installable on any Android device)
   - Build configuration is in `eas.json` → `build.preview.android.buildType: "apk"`
   - Build process typically takes 10-20 minutes
   - You'll get a download link when the build completes

5. **Build Android App Bundle (Production Profile):**

   ```bash
   eas build --platform android --profile production
   ```

   - This creates an AAB file (required for Google Play Store submission)
   - Build configuration is in `eas.json` → `build.production.android.buildType: "app-bundle"`

6. **Build for iOS (requires Apple Developer account):**

   ```bash
   eas build --platform ios --profile preview
   # or
   eas build --platform ios --profile production
   ```

7. **Download your build:**

   - After the build completes, EAS will provide a download link
   - You can also download from [expo.dev](https://expo.dev) → Your project → Builds
   - APK files can be directly installed on Android devices
   - AAB files must be uploaded to Google Play Console

8. **Install APK on Android device:**

   ```bash
   # Option 1: Download from the link provided by EAS
   # Then transfer to device and install

   # Option 2: Use ADB to install directly (if device is connected via USB)
   adb install path/to/your-app.apk
   ```

**EAS Build Configuration (`eas.json`):**

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk" // Creates APK file
      },
      "developmentClient": false
    },
    "production": {
      "android": {
        "buildType": "app-bundle" // Creates AAB for Play Store
      }
    }
  }
}
```

**Useful EAS Build Commands:**

```bash
# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Cancel a build
eas build:cancel [BUILD_ID]

# Build with specific channel
eas build --platform android --profile preview --channel preview

# Build with local credentials (iOS only)
eas build --platform ios --local
```

#### Local Build (Development/Testing)

Local builds require full Android/iOS development environments but allow faster iteration.

**Prerequisites for Local Android Build:**

- Android Studio installed
- Android SDK configured
- Java Development Kit (JDK) installed
- Android device connected via USB OR Android emulator running
- USB debugging enabled (for physical devices)

**Step-by-Step Local Android Build:**

1. **Ensure `app.json` has `jsEngine: 'hermes'`:**

   ```json
   {
     "expo": {
       "jsEngine": "hermes"
     }
   }
   ```

2. **Install development build dependencies:**

   ```bash
   npx expo install expo-dev-client
   ```

3. **Prebuild native code (first time only):**

   ```bash
   npx expo prebuild
   ```

   This generates the native Android and iOS project folders.

4. **Build and run on Android:**

   ```bash
   # Option 1: Build and install on connected device/emulator
   npm run android
   # or
   npx expo run:android

   # Option 2: Build APK only (without installing)
   cd android
   ./gradlew assembleRelease
   # APK will be at: android/app/build/outputs/apk/release/app-release.apk
   ```

5. **Install APK manually (if built without running):**

   ```bash
   # Using ADB
   adb install android/app/build/outputs/apk/release/app-release.apk

   # Or transfer APK to device and install via file manager
   ```

**Local iOS Build (macOS only):**

1. **Ensure Xcode is installed and configured**

2. **Prebuild native code:**

   ```bash
   npx expo prebuild
   ```

3. **Build and run:**

   ```bash
   npm run ios
   # or
   npx expo run:ios
   ```

**Local Build Outputs:**

- **Android APK Location:**

  - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
  - Release: `android/app/build/outputs/apk/release/app-release.apk`

- **iOS:**
  - Builds directly to simulator or connected device
  - Archive for App Store: Use Xcode → Product → Archive

#### Build Comparison

| Method          | Pros                                           | Cons                             | Best For                                |
| --------------- | ---------------------------------------------- | -------------------------------- | --------------------------------------- |
| **EAS Build**   | No local setup, consistent builds, cloud-based | Requires internet, build time    | Production releases, team collaboration |
| **Local Build** | Faster iteration, offline, full control        | Complex setup, platform-specific | Development, debugging native code      |

#### Troubleshooting Build Issues

**EAS Build Issues:**

- **Build fails with "jsEngine" error:** Ensure `jsEngine: 'hermes'` is in `app.json`
- **Authentication errors:** Run `eas login` again
- **Build timeout:** Check Expo account limits, try building during off-peak hours

**Local Build Issues:**

- **Gradle sync fails:** Clean and rebuild: `cd android && ./gradlew clean && cd ..`
- **Metro bundler issues:** Clear cache: `npx expo start --clear`
- **Native module errors:** Run `npx expo prebuild --clean`
- **Android SDK not found:** Configure `ANDROID_HOME` environment variable

#### Troubleshooting Upload Issues

If you encounter errors when uploading videos, check the following:

**Note:** If uploads are failing, ensure you're logged in with valid credentials. Previously, a bug allowed login with incorrect passwords (due to status code mismatch), which then caused upload failures. This has been fixed - make sure authentication succeeds with status code "5001" before attempting uploads.

1. **App Out of Memory:**

   This issue was fixed by temporarily saving video chunks to the file system before uploading them.

2. **SaveVideoGeocodedDetails API Failure:**

   If the video is successfully uploaded to R2 and Mux, but the `SaveVideoGeocodedDetails` API call fails, verify the following:

   **a. Request Body Format:**

   Ensure the request body matches the exact format shown in `app/index.tsx` (lines 203-219):

   ```typescript
   const geoCodeDataBody = JSON.stringify({
     Video_ID: videoFileName,
     Video_Duration: String(videoDuration),
     Capture_Time: captureTime,
     Created_By: userName,
     Route_ID: "1",
     Entity_ID: "5",
     Video_Name: record?.meta?.videoName || "Unnamed",
     Remarks: record?.meta?.childRing || "",
     videoGeoLocation: videoGeoLocation,
     Depth_Points: [],
     is_supabase_upload: true,
     supabase_id: videoFileName,
     block: record?.meta?.blockName || "",
   });
   ```

   **Key points:**

   - All field names must match exactly (case-sensitive)
   - `Video_Duration` must be a string
   - `videoGeoLocation` should be an array of location points
   - `Depth_Points` should be an array (empty array `[]` if no depth data)

   **b. User ID in Headers:**

   Ensure the `userId` is correctly set in the request headers:

   ```typescript
   {
     headers: {
       userId: userId, // User ID must be present in headers
     },
   }
   ```

   Verify that:

   - User ID is retrieved correctly from AsyncStorage
   - User ID is not null or undefined
   - User ID format matches the API requirements

   **c. GPS Points Linestring Format:**

   The `videoGeoLocation` points might not be forming a valid linestring. Check:

   - Ensure GPS points array is not empty
   - Verify points have valid `Latitude` and `Longitude` values
   - Check that points are ordered correctly (chronological order)
   - Ensure minimum number of points required (API may require at least 2 points)
   - Verify coordinate format matches expected format (decimal degrees)

   **Common Error Messages:**

   - **Status "5004":** "Not enough data for GeoLocation tracking" - Need more GPS tracking points
   - **Status not "5001":** API validation failed - Check request format, headers, or data format
   - **Network errors:** Check internet connectivity and API endpoint availability

   **Debug Steps:**

   1. Check console logs for the exact error message and status code
   2. Verify the `geoCodeDataBody` structure matches the required format
   3. Confirm `userId` is present in headers (check console log: `console.log("userId", userId)`)
   4. Verify `videoGeoLocation` array structure and content
   5. Ensure all required fields are populated (Video_ID, Video_Duration, Capture_Time, etc.)

---

## 8. Configuration

### Environment Variables

**Current Implementation**: Backend URLs and API keys are hardcoded in source files.

**Recommended**: Use environment variables:

1. Create `.env`:

   ```
   EXPO_PUBLIC_API_URL=https://your-api.com
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_KEY=your_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
   ```

2. Install `react-native-dotenv` or use `expo-constants`

3. Update code to read from environment variables

### Config Files

**`app.json`**: Expo app configuration

- App name: "GeoTag location tracker"
- Package: `com.sahillepton.locationtracker`
- Google Maps API key (Android): Configured in android config
- **JavaScript Engine**: `jsEngine: 'hermes'` (required - must be set to 'hermes')
- New architecture enabled
- Portrait orientation

**⚠️ Important:** Ensure `jsEngine: 'hermes'` is set in `app.json` before building. This is required for builds to work correctly.

**`tsconfig.json`**: TypeScript configuration

- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Includes Expo types

### Build/Runtime Configuration

**Babel** (`babel.config.js`):

- Module resolver plugin for `@/` path alias
- Expo preset

**Metro** (`metro.config.js`):

- Default Expo Metro config

**ESLint** (`eslint.config.js`):

- Expo ESLint config

### Secrets Handling

**Security Recommendations**:

1. Move secrets to environment variables
2. Use Expo Secrets for EAS Build
3. Never commit `.env` files
4. Rotate keys if exposed
5. Use secure storage for sensitive data

---

## 9. Scripts & Commands

### Available Scripts (`package.json`)

**`npm start`** or **`expo start`**

- Starts Expo development server
- Opens Metro bundler
- Displays QR code for Expo Go

**`npm run android`** or **`expo run:android`**

- Builds and runs Android app on connected device/emulator
- Requires Android development environment

**`npm run ios`** or **`expo run:ios`**

- Builds and runs iOS app on simulator/device
- Requires Xcode (macOS only)

**`npm run web`** or **`expo start --web`**

- Runs app in web browser
- Limited functionality (no native GPS, camera, file system)

**`npm run lint`** or **`expo lint`**

- Runs ESLint on codebase
- Reports linting errors and warnings

**`npm run reset-project`** or **`node ./scripts/reset-project.js`**

- Resets project to template state (if implemented)
- Use with caution

### Development Workflow

1. Start dev server: `npm start`
2. Open on device: Scan QR with Expo Go, or press `a` (Android) / `i` (iOS)
3. Make code changes: Hot reload updates automatically
4. Check logs: Metro bundler console or device logs

---

## 10. Glossary

### Domain Terms

- **Session**: A single GPS recording session with metadata, video, and location path
- **GPS Track**: The path of GPS coordinates recorded during a session
- **Metadata**: Structured information about a session (Block, Route, Entity, ChildRing)
- **Block**: Administrative division identifier
- **Route**: Route identifier (R1, R2, etc.)
- **Entity**: Entity identifier
- **Child Ring**: Sub-ring identifier within a route

### Technical Terms

- **Expo Router**: File-based routing system for Expo apps
- **AsyncStorage**: React Native's key-value storage API
- **Kalman Filter**: Algorithm for smoothing noisy sensor data (GPS)
- **Supabase**: Backend-as-a-Service platform (PostgreSQL + API)
- **EAS**: Expo Application Services (build and submit service)
- **Metro**: React Native's JavaScript bundler
- **Hermes**: JavaScript engine optimized for React Native

### Abbreviations

- **GPS**: Global Positioning System
- **API**: Application Programming Interface
- **JSON**: JavaScript Object Notation
- **JWT**: JSON Web Token
- **EAS**: Expo Application Services
- **OTA**: Over-The-Air (updates without app store)
- **FCM**: Firebase Cloud Messaging

---

## 11. Change Log

This section documents significant bug fixes and features added during development, particularly those implemented in the `vishwa/bug-fixes` branch.

### Bug Fixes

#### 1. Multipart Upload Error (December 2025)

**Commit:** `0d2d2fb` - "fixed multipart upload error"

- **Issue:** Video upload functionality was failing due to multipart upload errors
- **Solution:** Refactored video upload logic in `lib/video-upload.ts`
- **Impact:**
  - Reduced code complexity (170 lines refactored, -118 deletions, +67 insertions)
  - Fixed video upload reliability
  - Improved error handling for multipart uploads
- **Files Modified:**
  - `app/index.tsx`
  - `lib/video-upload.ts`

#### 2. Authentication Status Code Validation (December 2025)

**Commit:** `b0b711d` - "changes"

- **Issue:** Authentication bug allowed users to login with incorrect passwords due to status code mismatch in validation logic
- **Impact:**
  - Users could authenticate with wrong credentials
  - This caused upload failures since user IDs were invalid or missing
- **Solution:** Fixed status code validation to properly check for "5001" status before allowing login
- **Files Modified:**
  - `components/Auth.tsx`
  - `app/index.tsx`
  - `app/location.tsx`

#### 3. App Out of Memory Issue (December 2025)

- **Issue:** App was running out of memory during video uploads
- **Solution:** Fixed by temporarily saving video chunks to file system before uploading them
- **Impact:**
  - Prevents memory overflow during large video uploads
  - Improves app stability and performance
  - Allows handling of larger video files

#### 4. Path Storage Limitations (November-December 2025)

- **Issue:** GPS path data was stored in AsyncStorage, which has size limitations and performance issues with large datasets
- **Solution:** Migrated GPS path storage from AsyncStorage to file system
- **Implementation:**
  - Paths are now saved as JSON files in `FileSystem.documentDirectory + "paths/"`
  - Session metadata (lightweight data) remains in AsyncStorage
  - Sessions reference path files via `pathFile` property
- **Impact:**
  - Can handle large GPS tracking datasets without hitting AsyncStorage limits
  - Improved performance for sessions with many GPS points
  - Better separation of concerns between metadata and path data
- **Files Modified:**
  - `app/location.tsx` (path storage logic)
  - `app/index.tsx` (path file reading)

### Features Added

#### 1. Low Quality Video Recording (January 2026)

**Commits:**

- `8fc3caa` - "record in low quality"
- `8e8226f` - "quality changes"

- **Feature:** Added ability to record videos in low quality to save storage space
- **Benefits:**
  - Reduces video file sizes
  - Saves device storage space
  - Faster upload times
  - Better performance on devices with limited storage
- **Implementation:**
  - Modified video recording settings in `app/components/RecordingView.tsx`
  - Added quality configuration options
- **Files Modified:**
  - `app/components/RecordingView.tsx`
  - `app/index.tsx` (significant additions: 584+ lines)
  - `app/location.tsx`

#### 2. Video Quality Improvements (January 2026)

**Commit:** `8e8226f` - "quality changes"

- **Feature:** Additional quality-related improvements for video recording
- **Impact:** Enhanced video recording functionality and quality management

#### 3. Storage Usage Monitoring & Management (January 2026)

**Location:** `app/index.tsx` (lines 896-1016)

- **Feature:** Added storage usage monitoring dialog and data clearing functionality
- **Purpose:** Monitor storage usage and clear all app data without uninstalling the app
- **Functionality:**
  - **Storage Monitoring:**
    - Displays number of records
    - Shows video count and total video file size
    - Shows track file count and total track file size
    - Displays metadata size (AsyncStorage)
    - Shows total storage usage across all components
  - **Data Management:**
    - Refresh button to recalculate storage usage
    - Clear All button to delete all app data:
      - Clears AsyncStorage (RECORDINGS and metadata)
      - Deletes all track files from `paths/` directory
      - Deletes all video files from `videos/` directory
      - Provides confirmation dialog before clearing
    - Progress indicators during clearing process
- **Benefits:**
  - Users can monitor storage consumption
  - Easy way to free up space without uninstalling
  - Helps identify storage-heavy components
  - Useful for troubleshooting storage issues
- **UI Components:**
  - Modal dialog with storage breakdown
  - Formatted byte display (KB, MB)
  - Loading states during calculation
  - Action buttons (Refresh, Clear All, Close)
- **Files Modified:**
  - `app/index.tsx` (storage dialog UI and logic)

### Summary

The development work focused on:

- **Reliability:** Fixed critical upload and authentication bugs
- **Performance:** Optimized memory usage and storage architecture
- **Storage:** Migrated from AsyncStorage limitations to file system for large data
- **Optimization:** Added low quality recording option to save storage space
- **Security:** Fixed authentication validation to prevent unauthorized access

All fixes and features have been tested and are included in the current codebase.

---

## Additional Notes

- **Version**: 1.0.0
- **Owner**: sahillepton
- **Project ID**: a4b5db8d-23df-4af7-a61b-ee255cd5309a
- **Last Updated**: See git history
