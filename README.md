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

## 16. Glossary

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
