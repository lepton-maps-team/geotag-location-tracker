# GeoTag Location Tracker

## 1. Project Overview

**GeoTag location tracker** is a React Native mobile application built with Expo that enables field workers to capture, store, and manage GPS location data with rich metadata. The app is designed for survey and field data collection workflows.

### Primary Use Cases

- Field survey data collection with GPS tracking
- Recording location paths with metadata (State, District, Block, Ring, etc.)
- Offline-first data capture with cloud sync capabilities
- Session management and organization

### Target Users

- Field surveyors and data collectors
- Field workers conducting location-based surveys
- Teams requiring GPS tracking with structured metadata

### Key Features

- **Real-time GPS Tracking**: Continuous location recording with Kalman filtering for accuracy
- **Metadata Management**: Rich session metadata (State, District, Block, Ring, ChildRing)
- **Offline Support**: Local storage with AsyncStorage, upload when connectivity available
- **Search & Filter**: Search sessions by name, filter by date
- **Cloud Sync**: Upload sessions to Supabase backend
- **Export**: Save sessions as JSON files for sharing
- **Authentication**: User login with Supabase integration

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
         │   Supabase Backend   │
         │  (Users, GPS Tracks,  │
         │      Surveys)         │
         └──────────────────────┘
```

### Frontend / Backend / Services Breakdown

**Frontend (React Native/Expo)**

- File-based routing with Expo Router
- Component-based UI architecture
- Local state management with React hooks
- AsyncStorage for persistent local data

**Backend (Supabase)**

- PostgreSQL database via Supabase
- Tables: `users`, `gps_tracks`, `surveys`
- REST API for data operations
- Authentication via custom user table

**Services**

- **Location Service**: `expo-location` for GPS tracking
- **Storage Service**: `AsyncStorage` for local persistence
- **Filter Service**: Custom Kalman filter for GPS smoothing
- **Sync Service**: Supabase client for cloud operations

### Data Flow

1. **Recording Flow**:

   ```
   User Input (Metadata) → Start Recording → GPS Tracking →
   Kalman Filter → Distance Filter → Store in State →
   Save to AsyncStorage
   ```

2. **Upload Flow**:

   ```
   Select Session → Upload to Supabase →
   Insert into gps_tracks → Insert into surveys →
   Mark as uploaded → Update AsyncStorage
   ```

3. **Authentication Flow**:
   ```
   Login Screen → Query Supabase users table →
   Validate credentials → Store user in AsyncStorage →
   Navigate to Home
   ```

---

## 3. Tech Stack

### Languages, Frameworks, and Libraries

**Core**

- **React Native** (0.81.5): Mobile framework
- **React** (19.1.0): UI library
- **TypeScript** (5.9.2): Type safety
- **Expo** (~54.0.23): Development platform and tooling

**Navigation & Routing**

- **expo-router** (~6.0.15): File-based routing
- **@react-navigation/native** (^7.1.8): Navigation primitives
- **@react-navigation/bottom-tabs** (^7.4.0): Tab navigation

**Backend & Data**

- **@supabase/supabase-js** (^2.80.0): Supabase client
- **@react-native-async-storage/async-storage** (2.2.0): Local storage

**Location & Device**

- **expo-location** (~19.0.7): GPS tracking
- **expo-file-system** (~19.0.19): File operations
- **expo-sharing** (~14.0.7): File sharing

**UI & Styling**

- **@expo/vector-icons** (^15.0.3): Material Icons
- **react-native-svg** (15.12.1): SVG rendering
- **react-native-safe-area-context** (~5.6.0): Safe area handling

**Development Tools**

- **ESLint** (^9.25.0): Linting
- **eslint-config-expo** (~10.0.0): Expo ESLint config
- **Babel**: Transpilation with module resolver

---

## 4. Folder & File Structure

```
location-tracker/
├── app/                    # Expo Router pages (file-based routing)
│   ├── _layout.tsx        # Root layout with navigation stack
│   ├── index.tsx          # Home screen (session list)
│   ├── auth.tsx           # Authentication screen
│   ├── location.tsx       # GPS recording screen
│   ├── profile.tsx        # User profile screen
│   ├── modal.tsx          # Tips modal screen
│   └── (tabs)/            # Tab group (currently empty)
│
├── components/            # Reusable React components
│   ├── Auth.tsx           # Login form component
│   ├── SessionCard.tsx    # Session list item with actions
│   ├── DatePicker.tsx    # Custom calendar date picker
│   ├── themed-text.tsx   # Themed text component
│   ├── themed-view.tsx   # Themed view component
│   ├── haptic-tab.tsx    # Haptic feedback tab
│   └── external-link.tsx # External link component
│
├── lib/                   # Core business logic
│   ├── supabase.ts       # Supabase client configuration
│   └── filter.ts         # AdaptiveKalman GPS filter
│
├── constants/             # Static data and configuration
│   ├── lists.ts          # States, districts, blocks arrays
│   └── theme.ts          # Theme constants
│
├── hooks/                 # Custom React hooks
│   ├── use-color-scheme.ts      # Color scheme detection
│   ├── use-color-scheme.web.ts  # Web color scheme
│   └── use-theme-color.ts       # Theme color hook
│
├── assets/                # Static assets
│   └── images/           # App icons, splash screens
│
├── scripts/               # Build and utility scripts
│   └── reset-project.js  # Project reset script
│
├── dist/                 # Build output (generated)
│
├── app.json              # Expo app configuration
├── eas.json              # EAS Build configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── babel.config.js       # Babel configuration
├── metro.config.js       # Metro bundler configuration
├── eslint.config.js      # ESLint configuration
└── README.md             # This file
```

### Entry Points

- **`app/_layout.tsx`**: Root layout, initializes navigation stack
- **`app/index.tsx`**: Home screen, first screen after auth
- **`index.js`**: Expo entry point (expo-router/entry)

### Critical Modules

- **`lib/supabase.ts`**: Backend connection, must be configured with Supabase credentials
- **`lib/filter.ts`**: GPS smoothing algorithm
- **`app/location.tsx`**: Core GPS recording logic
- **`app/index.tsx`**: Session management and upload logic

---

## 5. Core Modules & Components

### 5.1 Authentication Module (`components/Auth.tsx`)

**Purpose**: User authentication via Supabase

**Key Responsibilities**:

- Validate username/password against Supabase `users` table
- Store authenticated user in AsyncStorage
- Handle login errors and display feedback

**Public API**:

- Component renders login form
- On success: stores user data, navigates to home

**Important Logic**:

- Queries Supabase with `username` and `password` (plain text comparison)
- Stores entire user object in AsyncStorage under key `"user"`
- Error handling for invalid credentials and network issues

**Interactions**:

- Uses `lib/supabase.ts` for database queries
- Uses `expo-router` for navigation
- Uses `AsyncStorage` for session persistence

---

### 5.2 Location Recording Module (`app/location.tsx`)

**Purpose**: Capture GPS location data with metadata

**Key Responsibilities**:

- Request location permissions
- Record GPS points with Kalman filtering
- Collect session metadata (State, District, Block, Ring, etc.)
- Save sessions to AsyncStorage

**Public API**:

- Screen component with recording UI
- Exports `LocationScreen` component

**Important Internal Logic**:

1. **Metadata Collection**: Modal form collects required fields before recording
2. **GPS Tracking**:

   - Uses `expo-location.watchPositionAsync` with `BestForNavigation` accuracy
   - Updates every 1 second or 1 meter movement
   - Applies `AdaptiveKalman` filter to smooth coordinates
   - Distance filter: only adds points if moved ≥0.3 meters

3. **Timestamp Calculation**: First point = 0, subsequent points = seconds since first point

4. **Session Storage**: Saves to AsyncStorage key `"RECORDINGS"` as JSON array

**Interactions**:

- Uses `lib/filter.ts` for GPS smoothing
- Uses `constants/lists.ts` for metadata options
- Uses `AsyncStorage` for persistence

---

### 5.3 Home/Session List Module (`app/index.tsx`)

**Purpose**: Display and manage recorded sessions

**Key Responsibilities**:

- Load sessions from AsyncStorage
- Display session list with search and date filtering
- Handle session actions: upload, save, edit, delete
- Verify authentication on focus

**Public API**:

- Screen component with session list
- Exports `HomeScreen` component

**Important Internal Logic**:

1. **Session Loading**: Reads from AsyncStorage on screen focus
2. **Search & Filter**:

   - Text search: filters by session name (case-insensitive)
   - Date filter: filters by session DateTime (date only, ignores time)

3. **Upload Logic**:

   - Inserts into Supabase `gps_tracks` table
   - Creates related `surveys` record with metadata
   - Marks session as `uploaded: true` in AsyncStorage

4. **Save to Device**: Exports session as JSON file, uses `expo-sharing` to share

5. **Edit**: Updates session metadata in AsyncStorage

6. **Delete**: Removes session from AsyncStorage array

**Interactions**:

- Uses `lib/supabase.ts` for uploads
- Uses `components/SessionCard.tsx` for list items
- Uses `components/DatePicker.tsx` for date selection
- Uses `expo-file-system` and `expo-sharing` for file operations

---

### 5.4 Session Card Component (`components/SessionCard.tsx`)

**Purpose**: Display individual session with action buttons

**Key Responsibilities**:

- Render session metadata and timestamp
- Provide action buttons (edit, upload, save, delete)
- Handle edit modal with metadata form

**Public API**:

```typescript
interface SessionCardProps {
  item: any; // Session data
  originalIndex: number; // Index in full array
  onUpload: () => void; // Upload callback
  onSave: () => void; // Save callback
  onDelete: () => void; // Delete callback
  onEdit: (updatedMeta: any) => void; // Edit callback
  isUploading: boolean; // Upload state
  isSaving: boolean; // Save state
  isDeleting: boolean; // Delete state
}
```

**Important Logic**:

- Shows upload status (checkmark if uploaded)
- Edit modal uses same searchable pickers as recording screen
- Displays formatted DateTime from session metadata

---

### 5.5 GPS Filter Module (`lib/filter.ts`)

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

---

### 5.6 Supabase Client (`lib/supabase.ts`)

**Purpose**: Configure and export Supabase client

**Key Responsibilities**:

- Initialize Supabase client with URL and API key
- Configure authentication storage (AsyncStorage)
- Enable session persistence

**Public API**:

- Exports `supabase` client instance

**Configuration**:

- Supabase URL and publishable key are hardcoded (should use environment variables in production)
- Uses AsyncStorage for auth persistence
- Auto-refresh tokens enabled

**Database Schema** (inferred from code):

- `users`: username, password, user_id, and other fields
- `gps_tracks`: id, name, location_data (JSON), timestamp, duration, route_id, entity_id, depth_data
- `surveys`: name, gps_track_id, timestamp, user_id, state, district, block, ring

---

## 6. State Management & Data Handling

### State Flow

**Local State (React Hooks)**

- Component-level state with `useState`
- No global state management library (Redux, Zustand, etc.)
- Session data stored in AsyncStorage, loaded on screen focus

**State Ownership**:

- **Home Screen**: Owns `locations` array, manages all session operations
- **Location Screen**: Owns recording state (`path`, `meta`, `isRecording`)
- **Auth Screen**: Owns login form state

### API Calls / Services

**Supabase Operations**:

- **Authentication**: Query `users` table for login
- **Upload**: Insert into `gps_tracks`, then `surveys` tables
- All operations use Supabase JavaScript client

**Local Storage Operations**:

- **Sessions**: `AsyncStorage.getItem("RECORDINGS")` / `setItem("RECORDINGS", ...)`
- **User**: `AsyncStorage.getItem("user")` / `setItem("user", ...)`

### Caching or Persistence

**AsyncStorage**:

- All sessions cached locally in `"RECORDINGS"` key
- User data cached in `"user"` key
- No expiration or cache invalidation (manual delete only)

**Offline-First**:

- App works fully offline for recording and viewing
- Upload requires network connectivity
- Failed uploads can be retried

### Error Handling Patterns

**Try-Catch Blocks**:

- All async operations wrapped in try-catch
- Errors logged to console
- User-facing alerts via `Alert.alert()`

---

## 7. Configuration & Environment

### Environment Variables

**Current Implementation**:

```typescript
const supabaseUrl = "https://xengyefjbnoolmqyphxw.supabase.co";
const supabasePublishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### Config Files

**`app.json`**: Expo app configuration

- App name: "GeoTag location tracker"
- Package: `com.sahillepton.locationtracker`
- Google Maps API key (Android): `AIzaSyByraLO7WVzW-9K-H6NErKftVydyJK2058`
- Hermes JS engine enabled
- New architecture enabled
- Portrait orientation

**`eas.json`**: EAS Build configuration

- Preview build: APK for Android
- Production build: App Bundle for Android
- Update channels: `preview`, `production`

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
- Ignores `dist/*` directory

### Secrets Handling

**Current**: Secrets hardcoded in source code

- Supabase keys in `lib/supabase.ts`
- Google Maps API key in `app.json`

**Security Recommendations**:

1. Move secrets to environment variables
2. Use Expo Secrets for EAS Build
3. Never commit `.env` files
4. Rotate keys if exposed
5. Use Supabase Row Level Security (RLS) policies

---

## 8. Setup & Installation

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

3. **Configure Supabase**:

   - Update `lib/supabase.ts` with your Supabase URL and key
   - Ensure database tables exist: `users`, `gps_tracks`, `surveys`

4. **Configure Google Maps** (Android):
   - Update `app.json` with your Google Maps API key

### Environment Setup

**No environment file currently used**. To add:

1. Create `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_KEY=your_key
   ```

2. Install `react-native-dotenv` or use `expo-constants`

3. Update `lib/supabase.ts` to read from env

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

**EAS Build** (recommended):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (if needed)
eas build:configure

# Build for Android
eas build --platform android --profile preview (keep jsEngine = 'hermes' in app.json)

# Build for iOS

```

**Local Build**:

```bash
# Android
npm run android

# iOS
npm run ios
```

**Build Outputs**:

- Android: APK (preview) or App Bundle (production)
- iOS: IPA file

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
- Limited functionality (no native GPS, file system)

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

## 16. Code Details

### 16.1 Type Definitions

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
  Name: string;
  State: string;
  District: string;
  Block: string;
  Ring: string;
  ChildRing: string;
  DateTime: string; // ISO 8601 format
};
```

**Recording Session Structure** (`app/location.tsx`):

```typescript
type RecordingSession = {
  meta: SessionMeta;
  path: LocationData[];
  uploaded?: boolean; // Optional flag for upload status
};
```

**Session Card Props** (`components/SessionCard.tsx`):

```typescript
interface SessionCardProps {
  item: any; // Session data object
  originalIndex: number; // Index in full array
  onUpload: () => void; // Upload callback
  onSave: () => void; // Save callback
  onDelete: () => void; // Delete callback
  onEdit: (updatedMeta: any) => void; // Edit callback with metadata
  isUploading: boolean; // Upload state flag
  isSaving: boolean; // Save state flag
  isDeleting: boolean; // Delete state flag
}
```

### 16.2 Key Data Structures

**AsyncStorage Keys**:

- `"RECORDINGS"`: Array of `RecordingSession` objects
- `"user"`: User object from authentication

**Session Storage Format**:

```typescript
// AsyncStorage.getItem("RECORDINGS") returns:
[
  {
    meta: {
      Name: "Field Survey 1",
      State: "Punjab",
      District: "Amritsar",
      Block: "Chogawan",
      Ring: "R1",
      ChildRing: "CR1",
      DateTime: "2024-01-15T10:30:00.000Z",
    },
    path: [
      {
        Latitude: 31.634308,
        Longitude: 74.873678,
        Accuracy: 5.2,
        Timestamp: 0,
      },
      {
        Latitude: 31.63431,
        Longitude: 74.87368,
        Accuracy: 4.8,
        Timestamp: 2,
      },
      // ... more points
    ],
    uploaded: false,
  },
  // ... more sessions
];
```

### 16.3 Core Module Code Examples

#### 16.3.1 Location Recording Logic (`app/location.tsx`)

**GPS Tracking Setup**:

```typescript
// Initialize Kalman filters for smoothing
const latFilter = useRef(new AdaptiveKalman()).current;
const lngFilter = useRef(new AdaptiveKalman()).current;

// Location subscription
locationSubscription.current = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000, // Update every 1 second
    distanceInterval: 1, // Or every 1 meter
  },
  (location) => {
    const { latitude, longitude, accuracy } = location.coords;

    // Apply Kalman filtering
    const smoothLat = parseFloat(
      latFilter.filter(latitude, accuracy || null).toFixed(6)
    );
    const smoothLng = parseFloat(
      lngFilter.filter(longitude, accuracy || null).toFixed(6)
    );

    // Distance filter (only add if moved ≥0.3m)
    const prev = currentPath[currentPath.length - 1];
    const dx = smoothLat - prev.Latitude;
    const dy = smoothLng - prev.Longitude;
    const distance = Math.sqrt(dx * dx + dy * dy) * 111320; // meters

    if (distance < 0.3) return; // Skip if too close

    // Calculate timestamp (0 for first point, seconds since first for others)
    let timestamp = 0;
    if (currentPath.length === 0) {
      firstPointTimestamp.current = Date.now();
      timestamp = 0;
    } else {
      timestamp = Math.floor(
        (Date.now() - firstPointTimestamp.current!) / 1000
      );
    }

    // Add to path
    const loc: LocationData = {
      Latitude: smoothLat,
      Longitude: smoothLng,
      Accuracy: accuracy || null,
      Timestamp: timestamp,
    };

    setPath((prev) => [...prev, loc]);
  }
);
```

**Save Session to AsyncStorage**:

```typescript
const stopRecording = async (navigateBack: boolean = true) => {
  setIsRecording(false);

  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const oldSessions: RecordingSession[] = existing
      ? JSON.parse(existing)
      : [];

    const newSession: RecordingSession = {
      meta,
      path,
      uploaded: false,
    };
    const updated = [...oldSessions, newSession];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    Alert.alert(
      "Recording Saved",
      `Saved ${path.length} points for ${meta.Name || "Unnamed"}`
    );

    if (navigateBack) {
      router.back();
    }
  } catch (error) {
    console.error("Error saving data:", error);
    Alert.alert("Error", "Could not save location data.");
  }
};
```

#### 16.3.2 Authentication Logic (`components/Auth.tsx`)

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
    const { data, error: supabaseError } = await supabase
      .from("users")
      .select("*")
      .eq("username", trimmedUsername)
      .eq("password", password)
      .single();

    if (supabaseError) {
      if (
        supabaseError.code === "PGRST116" ||
        supabaseError.message?.includes("No rows")
      ) {
        setError("Invalid username or password.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      return;
    }

    if (!data || data.password !== password) {
      setError("Invalid username or password.");
      return;
    }

    // Store user data
    AsyncStorage.setItem("user", JSON.stringify(data));
    router.replace("/");
  } catch (caughtError) {
    console.error("Login error:", caughtError);
    setError("An unexpected error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
}, [password, router, username]);
```

#### 16.3.3 Upload to Supabase (`app/index.tsx`)

**Upload Session Logic**:

```typescript
const handleUpload = useCallback(
  async (record: any, index: number) => {
    if (record?.uploaded) {
      Alert.alert(
        "Already uploaded",
        "This session has already been uploaded to Supabase."
      );
      return;
    }

    try {
      setUploadingIndex(index);
      const storedUser = await AsyncStorage.getItem("user");
      const user = JSON.parse(storedUser as string);

      const track = record.path;

      // Insert GPS track
      const { data, error } = await supabase
        .from("gps_tracks")
        .insert({
          name: record?.meta?.Name,
          location_data: track,
          timestamp: Date.now(),
          duration: track[track.length - 1].Timestamp - track[0].Timestamp,
          route_id: "",
          entity_id: "",
          depth_data: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Insert survey record
      await supabase.from("surveys").insert({
        name: record?.meta?.Name,
        gps_track_id: data.id,
        timestamp: Date.now(),
        user_id: user.user_id,
        state: record?.meta?.State,
        district: record?.meta?.District,
        block: record?.meta?.Block,
        ring: record?.meta?.Ring,
        child_ring: record?.meta?.ChildRing,
      });

      // Update local storage
      const updated = [...locations];
      updated[index] = { ...record, uploaded: true };
      setLocations(updated);
      await AsyncStorage.setItem("RECORDINGS", JSON.stringify(updated));

      Alert.alert("Uploaded", `Uploaded ${data.name} successfully.`);
    } catch (error) {
      console.error("Failed to upload recording:", error);
      Alert.alert(
        "Upload failed",
        "We couldn't upload the file. Please try again."
      );
    } finally {
      setUploadingIndex(null);
    }
  },
  [locations]
);
```

#### 16.3.4 Kalman Filter Implementation (`lib/filter.ts`)

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

#### 16.3.5 Supabase Client Configuration (`lib/supabase.ts`)

**Client Setup**:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xengyefjbnoolmqyphxw.supabase.co";
const supabasePublishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### 16.3.6 Session Filtering Logic (`app/index.tsx`)

**Search and Date Filtering**:

```typescript
const filteredLocations = locations.filter((item) => {
  // Filter by date if date is selected
  if (selectedDate) {
    const sessionDate = item?.meta?.DateTime;
    if (!sessionDate) return false;

    try {
      const sessionDateObj = new Date(sessionDate);
      const filterDateObj = new Date(selectedDate);

      // Compare dates (ignore time)
      const sessionDateStr = sessionDateObj.toDateString();
      const filterDateStr = filterDateObj.toDateString();
      if (sessionDateStr !== filterDateStr) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // Filter by search query (case-insensitive)
  if (!searchQuery.trim()) return true;
  const name = item?.meta?.Name?.toLowerCase() || "";
  return name.includes(searchQuery.toLowerCase().trim());
});
```

#### 16.3.7 File Export Logic (`app/index.tsx`)

**Save Session as JSON File**:

```typescript
const handleSaveToDevice = useCallback(async (record: any, index: number) => {
  try {
    setSavingIndex(index);
    const randomId = Math.random().toString(36).substring(2, 10);
    const fileName = `${record?.meta?.Name || "record"}-${randomId}.txt`;

    const directoryUri = FileSystem.documentDirectory;
    const fileUri = directoryUri + fileName;

    // Write JSON to file
    FileSystem.writeAsStringAsync(fileUri, JSON.stringify(record));

    // Share file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri);
    } else {
      alert("You need to give permission to share.");
    }
  } catch (error: any) {
    console.error(error);
    alert(`Failed to save file.\n\nError: ${error.message || error}`);
  } finally {
    setSavingIndex(null);
  }
}, []);
```

### 16.4 Navigation Setup (`app/_layout.tsx`)

**Root Layout Configuration**:

```typescript
import { Stack } from "expo-router";
import { ThemeProvider } from "@react-navigation/native";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="location" options={{ title: "Location" }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
```

### 16.5 Constants and Configuration

**Metadata Options** (`constants/lists.ts`):

```typescript
export const states = [
  "Punjab",
  "Uttar Pradesh (East)",
  "Manipur",
  // ... more states
];

export const districts = [
  "Amritsar",
  "AMRITSAR",
  "Barnala",
  // ... more districts
];

export const blocks = [
  "Chogawan",
  "Jandiwala Guru",
  // ... more blocks
];
```

**Storage Keys** (`app/location.tsx`, `app/index.tsx`):

```typescript
const STORAGE_KEY = "RECORDINGS"; // For session storage
const USER_KEY = "user"; // For authenticated user storage
```

### 16.6 Key Algorithms and Calculations

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

**Duration Calculation** (for upload):

```typescript
const duration = track[track.length - 1].Timestamp - track[0].Timestamp;
```

### 16.7 Error Handling Patterns

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

**Permission Handling**:

```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== "granted") {
  Alert.alert(
    "Permission required",
    "Location permission is required to record."
  );
  return;
}
```

### 16.8 Component Hooks Usage

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

### 16.9 Database Schema (Inferred from Code)

**Supabase Tables**:

```sql
-- users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  -- other fields...
);

-- gps_tracks table
CREATE TABLE gps_tracks (
  id SERIAL PRIMARY KEY,
  name TEXT,
  location_data JSONB, -- Array of LocationData objects
  timestamp BIGINT,
  duration INTEGER, -- Seconds
  route_id TEXT,
  entity_id TEXT,
  depth_data JSONB
);

-- surveys table
CREATE TABLE surveys (
  id SERIAL PRIMARY KEY,
  name TEXT,
  gps_track_id INTEGER REFERENCES gps_tracks(id),
  timestamp BIGINT,
  user_id INTEGER REFERENCES users(user_id),
  state TEXT,
  district TEXT,
  block TEXT,
  ring TEXT,
  child_ring TEXT
);
```

---

## 17. Glossary

### Domain Terms

- **Session**: A single GPS recording session with metadata and location path
- **GPS Track**: The path of GPS coordinates recorded during a session
- **Metadata**: Structured information about a session (State, District, Block, Ring, etc.)
- **Survey**: A database record linking a GPS track to user and metadata
- **Ring**: Hierarchical location identifier (R1-R10)
- **Child Ring**: Sub-ring identifier within a ring
- **Block**: Administrative division within a district
- **District**: Administrative division within a state
- **State**: Top-level administrative region

### Technical Terms

- **Expo Router**: File-based routing system for Expo apps
- **AsyncStorage**: React Native's key-value storage API
- **Kalman Filter**: Algorithm for smoothing noisy sensor data (GPS)
- **Supabase**: Backend-as-a-Service platform (PostgreSQL + API)
- **EAS**: Expo Application Services (build and submit service)
- **Metro**: React Native's JavaScript bundler
- **Hermes**: JavaScript engine optimized for React Native
- **RLS**: Row Level Security (Supabase database security feature)
- **OTA**: Over-The-Air (updates without app store)

### Abbreviations

- **GPS**: Global Positioning System
- **API**: Application Programming Interface
- **JSON**: JavaScript Object Notation
- **JWT**: JSON Web Token
- **RLS**: Row Level Security
- **EAS**: Expo Application Services
- **OTA**: Over-The-Air
- **RLS**: Row Level Security

---

## Additional Notes

- **Version**: 1.0.0
- **Owner**: sahillepton
- **Project ID**: a4b5db8d-23df-4af7-a61b-ee255cd5309a
- **Last Updated**: See git history

For questions or issues, refer to the codebase or contact the development team.
