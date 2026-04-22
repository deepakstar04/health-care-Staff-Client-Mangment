import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  auth,
  db 
} from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { Staff, Client, Attendance, Location } from '../types';
import { 
  MapPin, 
  Clock, 
  Wallet, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  History,
  Fingerprint
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StaffDashboardProps {
  user: User;
  profile: Staff | null;
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(l1: Location, l2: Location) {
  const R = 6371e3; // metres
  const φ1 = (l1.lat * Math.PI) / 180;
  const φ2 = (l2.lat * Math.PI) / 180;
  const Δφ = ((l2.lat - l1.lat) * Math.PI) / 180;
  const Δλ = ((l2.lng - l1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export default function StaffDashboard({ user, profile }: StaffDashboardProps) {
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [distanceToClient, setDistanceToClient] = useState<number | null>(null);

  useEffect(() => {
    // 1. Fetch active attendance
    const qActive = query(
      collection(db, 'attendance'),
      where('staffId', '==', user.uid),
      where('status', '==', 'active'),
      limit(1)
    );
    const unsubActive = onSnapshot(qActive, (snap) => {
      if (!snap.empty) {
        setActiveAttendance({ id: snap.docs[0].id, ...snap.docs[0].data() } as Attendance);
      } else {
        setActiveAttendance(null);
      }
    });

    // 2. Fetch history
    const qHistory = query(
      collection(db, 'attendance'),
      where('staffId', '==', user.uid),
      orderBy('punchIn', 'desc'),
      limit(10)
    );
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
    });

    // 3. Fetch assigned client
    if (profile?.currentClientId) {
      const unsubClient = onSnapshot(doc(db, 'clients', profile.currentClientId), (snap) => {
        if (snap.exists()) {
          setClient({ id: snap.id, ...snap.data() } as Client);
        }
      });
      return () => unsubClient();
    }

    // 4. Geolocation tracking
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        
        // Update staff last location
        updateDoc(doc(db, 'staff', user.uid), {
          lastLocation: { ...loc, updatedAt: new Date().toISOString() }
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => {
      unsubActive();
      unsubHistory();
      navigator.geolocation.clearWatch(watchId);
    };
  }, [user.uid, profile?.currentClientId]);

  useEffect(() => {
    if (currentLocation && client) {
      const dist = calculateDistance(currentLocation, client.geofenceCenter);
      setDistanceToClient(dist);

      // Auto Punch Out logic
      if (activeAttendance && dist > client.geofenceRadius + 100) { // 100m buffer
        handlePunchOut(true);
      }
    }
  }, [currentLocation, client, activeAttendance]);

  const handlePunchOut = async (isAuto = false) => {
    if (!activeAttendance || !currentLocation) return;
    
    await updateDoc(doc(db, 'attendance', activeAttendance.id), {
      punchOut: serverTimestamp(),
      locationOut: currentLocation,
      status: isAuto ? 'auto_out' : 'completed'
    });
  };

  const handlePunchIn = async () => {
    if (!client || !currentLocation) return;
    
    // Validate geofence
    if (distanceToClient! > client.geofenceRadius) {
      alert("You must be at the client location to punch in.");
      return;
    }

    await addDoc(collection(db, 'attendance'), {
      staffId: user.uid,
      clientId: client.id,
      shiftType: profile?.shiftPreference || '12h',
      punchIn: serverTimestamp(),
      locationIn: currentLocation,
      status: 'active'
    });
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full bg-slate-50">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Account Pending</h2>
        <p className="text-slate-500 mt-2">Your profile is being reviewed by administration.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-24 min-h-screen bg-slate-50">
      {/* Header */}
      <header className="p-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hello, {profile.name}</h1>
          <p className="text-[10px] text-blue-600 uppercase tracking-widest font-bold">
            {profile.role} • {profile.shiftPreference} Shift
          </p>
        </div>
        <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="p-6 space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance</span>
            </div>
            <p className="text-2xl font-black text-slate-900">${profile.balance}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Shift</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{profile.shiftPreference || 'N/A'}</p>
          </div>
        </div>

        {/* Current Assignment Card */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Assignment</h3>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-full uppercase tracking-wider">Live</span>
          </div>

          {client ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                  <MapPin className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-800">{client.name}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{client.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Live Distance</p>
                  <p className={cn(
                    "text-xl font-black",
                    distanceToClient !== null && distanceToClient <= client.geofenceRadius ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {distanceToClient !== null ? `${Math.round(distanceToClient)}m` : 'Locating...'}
                  </p>
                </div>
                <div className="text-right border-l border-slate-50 pl-4">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Geofence (Radius)</p>
                  <p className="text-slate-800 font-black text-xl">{client.geofenceRadius}m</p>
                </div>
              </div>

              {!activeAttendance ? (
                <button 
                  onClick={handlePunchIn}
                  disabled={!distanceToClient || distanceToClient > client.geofenceRadius}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-xl font-bold tracking-wide disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] shadow-sm"
                >
                  <Fingerprint className="w-5 h-5" />
                  PUNCH IN
                </button>
              ) : (
                <button 
                  onClick={() => handlePunchOut(false)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-rose-600 text-white rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-rose-100"
                >
                  <LogOut className="w-5 h-5" />
                  PUNCH OUT
                </button>
              )}
            </div>
          ) : (
            <p className="text-slate-400 italic text-sm text-center py-4">No assignment found.</p>
          )}
        </section>

        {/* Requests & Support */}
        <section className="grid grid-cols-2 gap-4">
          <button className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">Apply Leave</span>
          </button>
          <button className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">Need Advance</span>
          </button>
        </section>

        {/* Attendance Activity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h3>
            <button className="text-[10px] text-blue-600 font-bold uppercase">History</button>
          </div>
          
          <div className="space-y-2">
            {history.map((log) => (
              <div 
                key={log.id}
                className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    log.status === 'completed' ? "bg-slate-300" : "bg-green-500"
                  )}></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {log.status === 'active' ? "Shift Started" : "Shift Completed"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold font-mono">
                      {log.punchIn?.toDate ? format(log.punchIn.toDate(), 'MMM d, h:mm a') : 'Recently'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                    {log.shiftType}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
