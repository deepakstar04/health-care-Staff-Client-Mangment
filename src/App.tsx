/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs
} from 'firebase/firestore';
import { Staff, Client } from './types';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';
import { LogIn, Loader2, HeartPulse, UserCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<Staff | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginMode, setLoginMode] = useState<'admin' | 'staff'>('staff');
  
  // Form states
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setIsAdmin(user.email === 'codebrodev@gmail.com');
        const staffDoc = await getDoc(doc(db, 'staff', user.uid));
        if (staffDoc.exists()) {
          setStaffData({ id: staffDoc.id, ...staffDoc.data() } as Staff);
        }
      } else {
        setStaffData(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      setAuthError("Sign-in failed. Please try again.");
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      // 1. Find the staff user by staffId
      const q = query(collection(db, 'staff'), where('staffId', '==', staffId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setAuthError("Staff ID not found.");
        return;
      }

      const staffRecord = querySnapshot.docs[0].data() as Staff;
      const email = staffRecord.email; // We use their email for Firebase Auth

      // 2. Sign in with standard password
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Staff login failed", error);
      setAuthError("Incorrect password or login error.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Initializing CarePulse...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen px-6"
          >
            <div className="w-full max-w-sm p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <HeartPulse className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 mb-6">CareFlow Operations</h1>
              
              {/* Toggle Login Mode */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button 
                  onClick={() => setLoginMode('staff')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    loginMode === 'staff' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                  )}
                >
                  Staff ID
                </button>
                <button 
                  onClick={() => setLoginMode('admin')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    loginMode === 'admin' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                  )}
                >
                  Administrator
                </button>
              </div>

              {loginMode === 'admin' ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Access restricted to system administrators via verified Google account.
                  </p>
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98]"
                  >
                    <LogIn className="w-4 h-4" />
                    Admin Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStaffLogin} className="space-y-4 text-left">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Staff Identifier</label>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        required
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                        placeholder="e.g. CP-1002"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-colors" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Passcode</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-colors" 
                      />
                    </div>
                  </div>
                  
                  {authError && (
                    <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2 text-red-600 border border-red-100">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-bold">{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] mt-2"
                  >
                    Enter Portal
                  </button>
                </form>
              )}
              <p className="mt-6 text-xs text-gray-400">
                Secure access for authorized personnel only
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            {isAdmin ? (
              <AdminDashboard user={user} />
            ) : (
              <StaffDashboard user={user} profile={staffData} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
