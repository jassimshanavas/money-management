import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppProvider as FirebaseAppProvider, useApp as useFirebaseApp } from './context/AppContextFirebase';
import Navigation from './components/Navigation';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import TransactionHistory from './components/TransactionHistory';
import CategoryBreakdown from './components/CategoryBreakdown';
import BudgetTracker from './components/BudgetTracker';
import Settings from './components/Settings';
import AIInsights from './components/AIInsights';
import SavingsGoals from './components/SavingsGoals';
import RecurringExpenses from './components/RecurringExpenses';
import SmartBudgetAssistant from './components/SmartBudgetAssistant';
import ExpenseForecasting from './components/ExpenseForecasting';
import MultiWallet from './components/MultiWallet';
import ReceiptScanner from './components/ReceiptScanner';
import SharedExpenses from './components/SharedExpenses';
import TaxEstimator from './components/TaxEstimator';
import MonthlyReports from './components/MonthlyReports';
import Notifications from './components/Notifications';
import {
  LayoutDashboard,
  Plus,
  History,
  PieChart,
  Target,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  Repeat,
  Wallet,
  Camera,
  Users,
  Calculator,
  FileText,
  Bell,
} from 'lucide-react';

const views = {
  dashboard: { component: Dashboard, icon: LayoutDashboard, label: 'Dashboard' },
  insights: { component: AIInsights, icon: Sparkles, label: 'AI Insights' },
  add: { component: AddTransaction, icon: Plus, label: 'Add' },
  scanner: { component: ReceiptScanner, icon: Camera, label: 'Scanner' },
  history: { component: TransactionHistory, icon: History, label: 'History' },
  categories: { component: CategoryBreakdown, icon: PieChart, label: 'Categories' },
  budget: { component: BudgetTracker, icon: Target, label: 'Budget' },
  smartBudget: { component: SmartBudgetAssistant, icon: Sparkles, label: 'Smart Budget' },
  forecasting: { component: ExpenseForecasting, icon: TrendingUp, label: 'Forecast' },
  goals: { component: SavingsGoals, icon: Target, label: 'Goals' },
  recurring: { component: RecurringExpenses, icon: Repeat, label: 'Recurring' },
  wallets: { component: MultiWallet, icon: Wallet, label: 'Wallets' },
  shared: { component: SharedExpenses, icon: Users, label: 'Shared' },
  tax: { component: TaxEstimator, icon: Calculator, label: 'Tax' },
  reports: { component: MonthlyReports, icon: FileText, label: 'Reports' },
  notifications: { component: Notifications, icon: Bell, label: 'Notifications' },
  settings: { component: Settings, icon: SettingsIcon, label: 'Settings' },
};

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

// Main app content for LocalStorage mode
function LocalStorageAppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const appContext = useApp();
  const CurrentComponent = views[currentView].component;

  if (appContext.loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navigation 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        views={views}
      />
      <main className="pb-20 md:pl-64 md:pb-4 pt-16 md:pt-0">
        <CurrentComponent />
      </main>
    </div>
  );
}

// Main app content for Firebase mode
function FirebaseAppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const appContext = useFirebaseApp();
  const { user, loading, dataLoading } = appContext;
  const CurrentComponent = views[currentView].component;

  // Show loading screen while checking auth
  // Only show loading for data if we have no cached data AND no transactions loaded yet
  if (loading) {
    return <LoadingScreen />;
  }
  
  // If we have cached data for THIS user or transactions already loaded, show app immediately
  // The data will update in the background from Firestore
  const currentUserId = localStorage.getItem('currentUserId');
  const hasCachedData = localStorage.getItem('moneyTrackerData') && currentUserId === user?.uid;
  const hasTransactions = appContext.transactions && appContext.transactions.length > 0;
  
  if (user && dataLoading && !hasCachedData && !hasTransactions) {
    return <LoadingScreen />;
  }

  // Show landing page or login based on state
  if (!user) {
    if (showLogin) {
      return <Login onLoginSuccess={() => window.location.reload()} onBack={() => setShowLogin(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navigation 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        views={views}
      />
      <main className="pb-20 md:pl-64 md:pb-4 pt-16 md:pt-0">
        <CurrentComponent />
      </main>
    </div>
  );
}

function App() {
  // Check if Firebase config exists (using hardcoded defaults in config file)
  // If env vars are set, use them; otherwise check if defaults in firebase.config.js are set
  const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY || 
                            (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_FIREBASE_PROJECT_ID);

  // Use Firebase if config exists (either from env or defaults)
  // Since firebase.config.js has defaults, we'll use Firebase
  return (
    <FirebaseAppProvider>
      <FirebaseAppContent />
    </FirebaseAppProvider>
  );

  // If you want to use LocalStorage instead, uncomment below and comment above
  // return (
  //   <AppProvider>
  //     <LocalStorageAppContent />
  //   </AppProvider>
  // );
}

export default App;