# RehabAI - Privacy-First AI Rehab Assistant

A clinical-grade Progressive Web App for home exercise rehabilitation with Edge AI, real-time biomechanical analysis, and complete privacy-first architecture.

![RehabAI Banner](./docs/banner.png)

## 🌟 Features

### Core Capabilities
- **12+ Exercises** - Push-ups, Squats, Bicep Curls, Lunges, Planks, and more
- **Real-time Pose Detection** - MediaPipe Pose with 33 3D landmarks
- **3D Digital Twin** - Three.js avatar that mirrors your movements
- **Form Analysis** - Joint angle calculations, symmetry scoring, form feedback
- **Rep Counting** - Accurate phase detection and rep tracking
- **Daily Streak** - Gamification to keep you motivated

### Privacy-First Architecture
- **100% On-Device Processing** - All AI runs in your browser
- **Local Data Storage** - IndexedDB via Dexie.js, nothing sent to servers
- **Offline Capable** - Works without internet connection
- **No Account Required** - Start exercising immediately

### Analytics Dashboard
- **Weekly/Monthly Reports** - Track your progress over time
- **Form Score Trends** - See how your technique improves
- **Exercise Breakdown** - Pie chart of your workout mix
- **Duration Tracking** - Monitor your workout time

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| MediaPipe Pose | AI Pose Detection |
| Three.js | 3D Avatar Visualization |
| Recharts | Analytics Charts |
| Dexie.js | IndexedDB Wrapper |

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home - Exercise selection
│   ├── exercise/[id]/page.tsx # Exercise tracking interface
│   └── dashboard/page.tsx    # Analytics dashboard
├── components/
│   ├── ExerciseCard.tsx      # Exercise selection cards
│   ├── WebcamCanvas.tsx      # Camera + pose overlay
│   ├── Avatar3D.tsx          # Three.js digital twin
│   ├── FeedbackPanel.tsx     # Real-time form feedback
│   └── StreakCounter.tsx     # Daily streak display
├── lib/
│   ├── PoseEstimator.ts      # MediaPipe integration
│   ├── Biometrics.ts         # Joint angle calculations
│   ├── ExerciseEngine.ts     # Rep counting logic
│   ├── DTWAnalysis.ts        # Movement comparison
│   └── db.ts                 # IndexedDB setup
├── data/
│   └── exercises.ts          # Exercise definitions
└── types/
    └── index.ts              # TypeScript interfaces
```

## 🔒 Wi-Fi Kill Demo (Privacy Proof)

This demo proves that the app works completely offline with all data stored locally.

### Step-by-Step Instructions

1. **Start the app normally**
   ```bash
   npm run dev
   ```

2. **Complete one exercise session**
   - Go to http://localhost:3000
   - Select any exercise (e.g., Push-ups)
   - Complete 5-10 reps
   - Click "Finish" to save the session
   - Note your total reps and streak

3. **Go offline**
   - Open Chrome DevTools (F12)
   - Go to Network tab
   - Check "Offline" checkbox
   - OR simply disconnect from Wi-Fi/Ethernet

4. **Verify offline functionality**
   - Refresh the page - app loads from cache ✓
   - Navigate to Dashboard - data persists ✓
   - Start a new exercise - camera and AI work ✓
   - Complete another session - reps are counted ✓
   - Finish the session - data is saved ✓

5. **Check data persistence**
   - Go to DevTools → Application → IndexedDB
   - Expand "RehabAssistantDB"
   - You'll see your workout data in:
     - `sessions` - Individual workout records
     - `dailyStats` - Aggregated daily statistics
     - `streaks` - Your streak data

6. **Reconnect and verify**
   - Uncheck "Offline" or reconnect Wi-Fi
   - All data is still there
   - No data was sent to any server

### What This Proves

- ✅ **Zero network dependency** - App runs entirely in browser
- ✅ **Local AI processing** - MediaPipe runs on-device
- ✅ **Persistent local storage** - IndexedDB survives browser restarts
- ✅ **True privacy** - Your exercise data never leaves your device

## 🧮 Biomechanical Calculations

### Joint Angle Calculation
```typescript
// 3D angle between three points (in degrees)
function calculateAngle3D(pointA, pointB, pointC) {
  const vectorBA = subtract(pointA, pointB);
  const vectorBC = subtract(pointC, pointB);
  const dotProduct = dot(vectorBA, vectorBC);
  const angle = Math.acos(dotProduct / (magnitude(vectorBA) * magnitude(vectorBC)));
  return angle * 180 / Math.PI;
}
```

### Angular Velocity
```typescript
// Degrees per second
function calculateAngularVelocity(currentAngle, previousAngle, deltaTimeMs) {
  return Math.abs(currentAngle - previousAngle) / (deltaTimeMs / 1000);
}
```

### Symmetry Score
```typescript
// 0-100 score comparing left vs right
function calculateSymmetryScore(leftAngle, rightAngle) {
  const difference = Math.abs(leftAngle - rightAngle);
  const maxAngle = Math.max(leftAngle, rightAngle);
  return Math.round((1 - difference / maxAngle) * 100);
}
```

## 📊 Exercise Phase Detection

Each exercise uses a state machine for accurate rep counting:

```
IDLE → DOWN → UP → COMPLETE → IDLE
         ↓         ↓
       (angle     (angle
        below      above
        threshold) threshold)
```

### Example: Push-up
- **UP phase**: Elbow angle > 160°
- **DOWN phase**: Elbow angle < 90°
- **Rep counted**: When transitioning from DOWN → UP

## 🎨 UI/UX Highlights

- **Glassmorphism design** with frosted glass effects
- **Gradient accents** in cyan, purple, and pink
- **Animated backgrounds** with floating orbs
- **Micro-interactions** on hover and click
- **Real-time visual feedback** with color-coded joints
- **Responsive layout** for all screen sizes

## 🏥 Healthcare Theme

The design follows healthcare UX principles:
- **Calming color palette** - Blues and cyans reduce anxiety
- **Clear feedback** - Traffic light colors for form quality
- **Encouraging messages** - Positive reinforcement
- **Accessible typography** - High contrast, readable fonts

## 📱 PWA Features

- **Installable** - Add to home screen on mobile
- **Offline-first** - Service worker caches all assets
- **App-like experience** - Standalone display mode
- **Fast loading** - Optimized bundle size

## 🔮 Future Enhancements

- [ ] Voice coaching with audio feedback
- [ ] Custom exercise creation
- [ ] Workout plans and programs
- [ ] Social sharing (opt-in)
- [ ] Export data to JSON/CSV
- [ ] Multi-language support

## 📄 License

MIT License - Feel free to use for hackathons and personal projects!

---

Built with ❤️ for the 2026 Hackathon
