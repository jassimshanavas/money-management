# 💰 Money Tracker - Full-Stack Finance Management Platform

A production-ready, intelligent money tracking application with secure authentication, cloud database, and beautiful UI.

## ✨ Features

### Core Functionality
- 📊 **Dashboard** with interactive charts and insights
- ➕ **Transaction Management** - Add, edit, delete income/expenses
- 🎯 **Budget Tracking** with visual progress indicators
- 💰 **Savings Goals** with milestone celebrations
- 📱 **Receipt Scanner** with OCR (mock)
- 👥 **Shared Expenses** for splitting bills
- 🔄 **Recurring Transactions** with auto-detection
- 👛 **Multi-Wallet Support** for different accounts

### Intelligence Features
- 🤖 **AI Insights** - Smart spending analysis
- 📈 **Forecasting** - Predict next month's expenses
- 💡 **Smart Budget Suggestions** based on history
- 🏆 **Goal Achievements** with confetti animations

### User Features
- 🔐 **Secure Authentication** with JWT
- ☁️ **Cloud Sync** across devices
- 🌓 **Dark/Light Mode** with system preference
- 📊 **Export Reports** to PDF/CSV
- 💱 **Multi-Currency** support
- 🔔 **Smart Notifications**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- (Optional) Firebase account for cloud sync

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd money_management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

**That's it!** The app works immediately with localStorage.

### Optional: Enable Firebase Cloud Sync

Follow `FIREBASE_QUICKSTART.md` for 5-minute setup to add cloud sync across devices!

## 📁 Project Structure

```
money_management/
├── src/
│   ├── components/         # React components
│   ├── context/            # State management
│   │   ├── AppContext.jsx       # LocalStorage version
│   │   └── AppContextFirebase.jsx  # Firebase version
│   ├── lib/                # Firebase services
│   ├── utils/              # Helper functions
│   └── App.jsx             # Main app
├── server/                 # (Optional) Backend API
└── public/                 # Static assets
```

## 🔐 Environment Variables

### Optional: Firebase (.env)
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

## 🗄️ Data Storage

**LocalStorage** (Default):
- ✅ Works offline
- ✅ No setup required
- ✅ Fast and private
- ⚠️ Single device only

**Firebase** (Optional):
- ☁️ Cloud sync
- 📱 Multi-device
- 🔐 User authentication
- ⚡ Real-time updates
- 🛡️ Secure storage

Setup guide: `FIREBASE_QUICKSTART.md`

## 🎨 Tech Stack

**Frontend**
- React 18 with Vite
- Tailwind CSS
- Recharts for charts
- Lucide Icons
- Framer Motion (ready)

**Backend & Database**
- **LocalStorage** (default) - Offline-first
- **Firebase** (optional) - Firestore + Auth
- Express + Prisma (optional - in server/)

**Deployment**
- Frontend: Vercel / Netlify
- Database: Firebase (included)
- Backend: Not required for current setup

## 📱 Features Overview

### Authentication
- Email/password signup & login
- JWT with refresh tokens
- Secure password hashing
- Session management

### Data Management
- Real-time sync across devices
- Automatic cloud backup
- Export/import functionality
- Receipt storage

### Intelligence
- AI-powered insights
- Spending pattern detection
- Budget recommendations
- Expense forecasting

## 🚢 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Backend (Render/Railway)
1. Connect GitHub repository
2. Add PostgreSQL database
3. Configure environment variables
4. Deploy

See `ARCHITECTURE.md` for detailed deployment instructions.

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Icons by Lucide
- Charts by Recharts
- Database by Prisma

---

Made with ❤️ for elegant financial management
