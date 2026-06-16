# AIVENTRA Android

The Android companion app for the AIVENTRA forensic intelligence platform.
Built with **Kotlin + Jetpack Compose**, talks to the **same FastAPI backend**
and **same Firebase project** as the web app — but stores its data in
mobile-specific Firestore collections (`cases`, `analyses`,
`chat_sessions`).

## Features

- 🔐 **Firebase Email/Password Auth** — shared accounts with the web app
- 📊 **Dashboard** — live stats, priority case queue, quick AI module access
- 📁 **Cases list & detail** — searchable, filterable, with action grid
- 🔬 **Autopsy Analyzer** — upload PDF, get NLP injury extraction + body chart + LLM deep reasoning
- 🖼️ **Image Analysis** — upload victim photo, get OpenCV injury detection + body chart with red markers
- 💬 **AI Assistant** — grounded forensic chat with citations
- 🗺️ **Crime Scene Map** — Google Maps with body location markers
- ⏱️ **Timeline** — multi-source event reconstruction

All AI runs on your existing FastAPI backend at `/api/*` — no model code on device.

## Opening the project (Antigravity OR Android Studio)

Both IDEs treat this as a standard Kotlin + Gradle Android project.

### Antigravity (or any IntelliJ-based IDE)

1. **File → Open** → select the `aiventra-android` folder (the one containing `settings.gradle.kts`)
2. Antigravity will detect Gradle and start sync. The first sync downloads the Gradle wrapper jar (`gradle-wrapper.jar`) automatically via the bootstrap logic in `gradlew` / `gradlew.bat` — **no manual setup needed**.
3. Once sync finishes, install these plugins if you don't have them already:
   - **Android** (if not bundled)
   - **Kotlin** (usually bundled)
4. Configure the Android SDK: **File → Project Structure → SDKs** → point at your local Android SDK (download via Android Studio's SDK Manager if you don't have one).
5. Connect a device or start an emulator (Antigravity uses the same AVDs Android Studio creates).
6. **Run → Run 'app'** (or Shift+F10).

### Android Studio

1. **File → Open** → select the `aiventra-android` folder
2. Click **Trust Project** when prompted
3. Wait for Gradle sync — first time takes ~5 minutes
4. Pick your emulator/device in the toolbar dropdown
5. Click the green ▶ Run button

### Setup

### 1. Prerequisites

- **Android Studio** Ladybug | 2024.2.1 or newer
- **JDK 17**
- **Android SDK** 35
- AIVENTRA backend running and reachable from your test device

### 2. Firebase configuration

This app uses the **same Firebase project** as the web (`trace-8e47e`).

1. Open the Firebase Console → **Project Settings** → scroll to "Your apps"
2. Click **Add app** → **Android**
3. Use package name: `com.aiventra.app`
4. Download `google-services.json`
5. **Place it at `app/google-services.json`**

You're done — auth, Firestore, and analytics will all work with the same accounts as the web app.

### 3. Google Maps API key

For the Crime Scene Map screen:

1. Go to https://console.cloud.google.com/google/maps-apis
2. Select your Firebase project (it's already a GCP project under the hood)
3. Enable **Maps SDK for Android**
4. Create an API key, then restrict it to Android apps + your package name
5. Open `app/src/main/AndroidManifest.xml` and replace `YOUR_MAPS_API_KEY_HERE` with the key

### 4. Backend URL configuration

Open `app/build.gradle.kts` and update:

```kotlin
defaultConfig {
    // For Android emulator (10.0.2.2 = host machine's localhost):
    buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8000/api/\"")

    // For physical device on same WiFi:
    // buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.100:8000/api/\"")
    // (use your PC's actual LAN IP from `ipconfig`)
}

buildTypes {
    release {
        // For production deployed backend:
        buildConfigField("String", "API_BASE_URL", "\"https://your-backend.onrender.com/api/\"")
    }
}
```

### 5. Build & run

Open the project in Android Studio. Let Gradle sync (first sync takes ~5 minutes for dep download).

- **Run** on an emulator (Pixel 8 / API 34+ recommended) or USB-connected device
- The app launches to the login screen
- Sign in with the same email/password you use on the web

## Project structure

```
aiventra-android/
├── app/
│   ├── build.gradle.kts                ← module config + API_BASE_URL
│   ├── google-services.json            ← (you add this from Firebase console)
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml         ← permissions + Maps API key
│       ├── java/com/aiventra/app/
│       │   ├── AiventraApp.kt          ← @HiltAndroidApp
│       │   ├── MainActivity.kt
│       │   ├── data/
│       │   │   ├── model/Models.kt     ← Moshi data classes
│       │   │   ├── remote/
│       │   │   │   ├── ApiService.kt   ← Retrofit interface
│       │   │   │   └── AuthInterceptor.kt  ← injects Firebase ID token
│       │   │   └── repository/AiventraRepository.kt
│       │   ├── di/AppModule.kt         ← Hilt DI
│       │   └── ui/
│       │       ├── AppNavigation.kt    ← NavHost
│       │       ├── AuthViewModel.kt
│       │       ├── CasesViewModel.kt
│       │       ├── AnalysisViewModel.kt
│       │       ├── components/        ← shared Compose UI
│       │       ├── screens/           ← Login, Dashboard, Cases, Detail,
│       │       │                        Autopsy, Image, Assistant, Map, Timeline
│       │       └── theme/Theme.kt
│       └── res/
│           ├── values/{strings,colors,themes}.xml
│           └── mipmap-*/              ← (Android Studio generates ic_launcher)
├── build.gradle.kts                    ← top-level plugins
├── settings.gradle.kts
├── gradle/
│   ├── libs.versions.toml              ← version catalog
│   └── wrapper/gradle-wrapper.properties
└── gradle.properties
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Compose UI                                                   │
│  (Login · Dashboard · Cases · CaseDetail · Autopsy ·          │
│   Image · Assistant · Map · Timeline)                          │
└──────────────────────────┬───────────────────────────────────┘
                           │ collects StateFlow
┌──────────────────────────┴───────────────────────────────────┐
│  ViewModels (Hilt-injected)                                   │
│  AuthViewModel · CasesViewModel · AnalysisViewModel           │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────┐
│  AiventraRepository (single source of truth)                  │
└─────────┬───────────────────────────┬────────────────────────┘
          │                           │
   ┌──────┴────────┐         ┌────────┴────────┐
   │ Retrofit API  │         │ Firebase        │
   │ (FastAPI AI)  │         │ Auth + Firestore│
   └──────┬────────┘         └─────────────────┘
          │
          │ Bearer <Firebase ID token> (via AuthInterceptor)
          ▼
   FastAPI backend (your existing aiventra/backend)
   ├── POST /api/reports/analyze       (autopsy NLP)
   ├── POST /api/images/generate-body-chart  (image or PDF → body chart)
   ├── POST /api/assistant/ask          (RAG chat)
   ├── GET  /api/timeline/{caseId}      (multi-source events)
   └── GET  /api/risk/score/{caseId}    (explainable risk)
```

## Firestore collections (shared with web app)

The app reads/writes to the **same** collections as the web app, so a case
created on either platform is visible on the other:

| Collection | Purpose |
|---|---|
| `cases` | All forensic cases (shared with web) |
| `evidence` | Evidence + chain-of-custody (shared with web) |
| `analyses` | Persisted autopsy + image analyses audit trail (shared) |
| `chat_sessions` | AI Assistant conversation transcripts (shared) |
| `geo_markers` | Crime scene map markers (shared) |
| `timeline_events` | Multi-source events (shared) |
| `users` | User profiles (shared) |

Records created on the Android app are stamped with `platform: "android"`
so you can filter by source on either side if needed.

## Troubleshooting

**"Cannot reach backend"** when running on emulator
→ The emulator must use `http://10.0.2.2:8000/api/` (not `localhost`)
→ Make sure your FastAPI server is running with `uvicorn app.main:app --host 0.0.0.0 --port 8000`

**"Cannot reach backend"** on physical device
→ Phone and PC must be on the same WiFi
→ Use your PC's LAN IP: run `ipconfig` (Win) or `ifconfig` (Mac/Linux), find the WiFi adapter's IPv4
→ Update `API_BASE_URL` in `app/build.gradle.kts`
→ Allow the FastAPI port through Windows Firewall

**Login works but Firestore reads return permission-denied**
→ Make sure you've published the `firestore.rules` from the web app's project root to your Firebase project

**Build fails with "google-services.json not found"**
→ You must download it from Firebase Console (Step 2 above) and place it at `app/google-services.json`

**Maps shows blank gray screen**
→ Maps API key missing or restricted incorrectly
→ Replace `YOUR_MAPS_API_KEY_HERE` in `AndroidManifest.xml`
→ Make sure **Maps SDK for Android** is enabled in Google Cloud Console

**App crashes on startup with NPE on Firebase**
→ The `google-services` plugin didn't generate values
→ Clean and rebuild: `./gradlew clean assembleDebug`

## Building a release APK

```bash
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk` (~12 MB)

For Play Store, generate an AAB instead: `./gradlew bundleRelease`

## License

Same as the parent AIVENTRA project.
