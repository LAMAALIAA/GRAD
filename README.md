# 🧪 Virtual Chemistry Lab

**A Web-Based Chemistry Teaching Platform Built as a CS Graduation Project**

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Language](https://img.shields.io/badge/Languages-English%20%7C%20العربية-blue)
![Lines](https://img.shields.io/badge/Lines%20of%20Code-4,768-lightblue)

## 📚 Overview

Virtual Chemistry Lab is an interactive web application that enables students and teachers to conduct virtual chemistry experiments safely and engagingly. It supports three modes of learning:

- **Solo Exploration**: Students experiment at their own pace
- **Free Lab**: Mix primary elements to discover reactions
- **Class Competition**: Team-based challenges with real-time leaderboards

## ✨ Key Features

### 🔬 16 Interactive Experiments
- **6 Easy**: Neutralization, Vinegar-Soda, Copper Sulfate, Starch-Iodine, Zinc-Copper, Elephant Toothpaste
- **5 Medium**: Dry Ice Fog, Iron-Sulfur, Calcium-Water, Lead Iodide, Manganese-H₂O₂
- **5 Hard**: Luminol Glow, Sodium-Water, Copper-Nitric Acid, Sugar-Sulfuric Acid, Aluminum-NaOH

### 🧬 Free Lab Mode
- 6 primary elements: H, O, C, N, Na, Cl
- 5 discoverable reactions
- Real-time visual feedback
- Container selection (Beaker, Test Tube, Flask)

### 🏆 Class Competition
- Teacher dashboard with real-time monitoring
- Student leaderboards
- Code-based class joining
- Performance tracking

### 🎨 Bilingual Interface
- Full English support
- Complete Arabic (Saudi dialect) translation
- RTL layout support
- Dynamic language switching

### 🎯 Interactive Features
- Drag-and-drop chemistry
- 3D pseudo-realistic apparatus
- Hand gesture recognition (MediaPipe)
- Haptic feedback for interactions
- Real-time chalkboard updates

## 🛠️ Technical Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Storage | Browser localStorage |
| Gestures | MediaPipe Hands |
| Deployment | Static hosting (any server) |
| Languages | English + Arabic (Saudi) |

## 📁 Project Structure

```
virtual-chem-lab/
├── index.html           # Main HTML structure (784 lines)
├── style.css            # Styling & animations (1,983 lines)
├── script.js            # Core logic & interactions (2,001 lines)
└── hand-tracking.js     # MediaPipe gesture support (~200 lines)
```

## 🚀 Quick Start

### 1. Installation
```bash
# Clone or download the project
cd virtual-chem-lab

# Open in browser
open index.html
# or
firefox index.html
```

### 2. First Run
- Loading screen appears (1.1 seconds)
- Home page loads automatically
- Click "Start Lab" to begin

### 3. Test Each Mode
- **Solo**: Select "Solo Exploration" → Pick an experiment
- **Free Lab**: Select "Free Lab" → Mix H + O to make H₂O
- **Class Mode**: Teacher creates code, students join

## 📖 How It Works

### Solo Mode Flow
```
Select Experiment → Read Instructions → 
Mix Chemicals → Watch Reaction → 
See Results → Repeat
```

### Free Lab Flow
```
Choose Container → Drag Element 1 →
Drag Element 2 → Evaluate Reaction →
Visual Feedback → Clear & Retry
```

### Class Mode Flow
```
[Teacher]                  [Student]
Create Code            →   Enter Name
Select Experiments    →    Enter Code
Monitor Leaderboard   ←    Complete Tasks
                      ←    Submit Scores
```

## 🎮 User Interactions

### Mouse/Touch
- Click buttons for navigation
- Drag bottles to mix chemicals
- Click apparatus selector
- Tap language toggle

### Keyboard
- Arrow keys for navigation (if enabled)
- Escape to close modals
- Enter to submit forms

### Gestures (with MediaPipe)
- Hand detection in Free Lab
- Gesture recognition for drag operations
- Haptic feedback on successful actions

## 🔒 Data Management

### localStorage Keys
```javascript
competition: {        // Class mode data
  mode: 'solo|class|free'
  code: 'ABC123'
  selectedExperiments: [ids]
  studentName: 'John'
  students: { ... }
  startTime: timestamp
}
```

### Auto-Save Features
- Experiment progress
- Student scores
- Class leaderboards
- Settings & preferences

## 🎨 Customization

### Colors & Theme
Edit `style.css`:
- Primary: `--color-primary: #0d7dbf`
- Success: `--color-success: #34d399`
- Warning: `--color-warning: #fbbf24`

### Add Experiments
Edit `EXPERIMENTS` array in `script.js`

### Add Elements
Edit `CHEMICALS` object in `script.js`

### Add Reactions
Edit `FREE_REACTIONS` array in `script.js`

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Stuck on loading | Clear cache + refresh |
| Experiments not visible | Check Solo mode selection |
| Class code not working | Verify code format (ABC123) |
| Gestures not working | Check camera permissions |
| Arabic text cut off | Ensure RTL support enabled |

## 📊 Performance

- **Load Time**: ~1.5 seconds
- **Memory Usage**: ~50 MB
- **Storage**: ~2 MB (localStorage)
- **FPS**: 60 FPS for animations
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+

## 🔄 Version History

### v1.0.0 (Current)
- ✅ 16 guided experiments
- ✅ Free Lab with 6 elements
- ✅ Class competition mode
- ✅ Bilingual interface
- ✅ Hand tracking support
- ✅ Real-time leaderboards

### v0.9.0 (Previous)
- Initial release
- 10 experiments
- Basic UI

## 👨‍💻 Development

### Technologies Used
- **Build**: Plain JavaScript (no build tool)
- **Testing**: Manual + browser DevTools
- **Documentation**: Markdown
- **Version Control**: Git

### Code Style
- ES6+ modern JavaScript
- Functional programming patterns
- Clear variable naming
- Detailed comments in complex sections

## 🎓 Educational Value

### Chemistry Concepts
- Acid-base neutralization
- Oxidation-reduction reactions
- Precipitation reactions
- Exothermic reactions
- Color indicators
- Gas evolution

### STEM Skills
- Scientific observation
- Hypothesis testing
- Data collection
- Pattern recognition
- Problem-solving

## 📝 License

This project is a CS graduation project. Attribution appreciated.

## 🙏 Credits

- **Created by**:Lama Ali Alrebh 
- **Built with**: HTML5, CSS3, JavaScript ES6+

## 📞 Support & Contact

For questions or issues:
1. Check the SETUP_GUIDE.md
2. Review browser console (F12)
3. Try different browser
4. Clear localStorage

---

**Status**: ✅ Production Ready | **Last Updated**: Sept 27, 2026
