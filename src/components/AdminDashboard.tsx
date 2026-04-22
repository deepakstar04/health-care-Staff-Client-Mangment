import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { Staff, Client, FinancialRecord, Attendance } from '../types';
import { 
  Users, 
  UserPlus, 
  Building2, 
  DollarSign, 
  Activity, 
  Plus, 
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'clients' | 'finances'>('overview');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [finances, setFinances] = useState<FinancialRecord[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
    });
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });
    const unsubFinances = onSnapshot(query(collection(db, 'finances'), orderBy('date', 'desc'), limit(50)), (snap) => {
      setFinances(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
    });
    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), orderBy('punchIn', 'desc'), limit(20)), (snap) => {
      setRecentAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
    });

    return () => {
      unsubStaff();
      unsubClients();
      unsubFinances();
      unsubAttendance();
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'staff') {
        const email = `staff.${formData.staffId.toLowerCase().trim()}@careflow.io`;
        await addDoc(collection(db, 'staff'), {
          ...formData,
          email,
          balance: 0,
          status: 'active',
          createdAt: serverTimestamp()
        });
      } else if (activeTab === 'clients') {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          geofenceRadius: 150,
          geofenceCenter: { lat: 0, lng: 0 },
          assignedStaffIds: [],
          paymentStatus: 'pending',
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (err) {
      console.error(err);
      alert("Error saving data");
    }
  };

  const totalOwedByClients = clients.reduce((acc, c) => acc + (c.paymentStatus === 'overdue' ? c.weeklyRate : 0), 0);
  const totalStaffBalance = staff.reduce((acc, s) => acc + s.balance, 0);

  const seedData = async () => {
    try {
      const { setDoc, doc, collection, addDoc } = await import('firebase/firestore');
      
      // 1. Create a dummy client
      const clientRef = await addDoc(collection(db, 'clients'), {
        name: "Emerald City Household",
        address: "742 Evergreen Terrace, Springfield",
        geofenceCenter: { lat: 0, lng: 0 }, // Will be updated by staff
        geofenceRadius: 150,
        assignedStaffIds: [user.uid],
        paymentStatus: 'pending',
        weeklyRate: 450
      });

      // 2. Create staff profile for current user
      await setDoc(doc(db, 'staff', user.uid), {
        staffId: "admin",
        name: "Professional Caregiver",
        email: user.email,
        phone: "+1-555-0199",
        role: "nurse",
        status: "active",
        currentClientId: clientRef.id,
        shiftPreference: "12h",
        balance: 1200
      });

      alert("Demo data initialized! Please refresh to start.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden lg:flex-row bg-slate-50">
      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-200"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6">Create New {activeTab === 'staff' ? 'Staff Member' : 'Client Profile'}</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                {activeTab === 'staff' ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                      <input required type="text" onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Staff ID</label>
                        <input required type="text" placeholder="e.g. 1002" onChange={e => setFormData({...formData, staffId: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Login Passcode</label>
                        <input type="text" placeholder="Default: 123456" onChange={e => setFormData({...formData, password: e.target.value || "123456"})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Role</label>
                      <select onChange={e => setFormData({...formData, role: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300">
                        <option value="nurse">Nursing Staff</option>
                        <option value="gda">GDA (Helper)</option>
                        <option value="office">Office Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                      <input required type="tel" onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Client Name</label>
                      <input required type="text" onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Home Address</label>
                      <input required type="text" onChange={e => setFormData({...formData, address: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Weekly Rate ($)</label>
                      <input required type="number" onChange={e => setFormData({...formData, weeklyRate: Number(e.target.value)})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-300" />
                    </div>
                  </>
                )}
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">Save Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Seed Data Button - Debug Only */}
      {staff.length === 0 && (
        <div className="fixed top-4 right-4 z-[100]">
          <button onClick={seedData} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg text-sm">
            Initialize Demo Data
          </button>
        </div>
      )}
      {/* Sidebar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 lg:relative lg:w-64 bg-white border-t lg:border-t-0 lg:border-r border-slate-200 flex lg:flex-col h-full z-50">
        <div className="hidden lg:block p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">CareFlow</h1>
          </div>
          
          <ul className="space-y-1">
            {[
              { id: 'overview', icon: Activity, label: 'Dashboard' },
              { id: 'staff', icon: Users, label: 'Staff Management' },
              { id: 'clients', icon: Building2, label: 'Client Profiles' },
              { id: 'finances', icon: DollarSign, label: 'Payments & Payroll' },
            ].map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors w-full text-left",
                    activeTab === tab.id 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="hidden lg:block mt-auto p-6">
          <div className="bg-slate-900 text-white p-4 rounded-xl">
            <p className="text-[10px] text-slate-400 mb-1 uppercase font-bold tracking-wider">System Active</p>
            <p className="text-sm font-semibold">{staff.filter(s => s.status === 'active').length} Staff Online</p>
            <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
              <div className="bg-blue-400 h-full w-[88%]"></div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
              {user.email?.[0].toUpperCase()}
            </div>
            <button onClick={() => signOut(auth)} className="text-xs text-slate-400 hover:text-red-500 font-medium">Sign Out</button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex justify-around w-full p-2 bg-white">
          {[
            { id: 'overview', icon: Activity, label: 'Home' },
            { id: 'staff', icon: Users, label: 'Staff' },
            { id: 'clients', icon: Building2, label: 'Clients' },
            { id: 'finances', icon: DollarSign, label: 'Pay' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl",
                activeTab === tab.id ? "text-blue-600 bg-blue-50" : "text-slate-400"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800 capitalize">{activeTab} Overview</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Live</span>
          </div>
          <div className="flex items-center gap-3">
             <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
               <Search className="w-5 h-5" />
             </button>
             <button 
              onClick={() => {
                if (activeTab === 'overview') setActiveTab('staff');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98]"
             >
               <Plus className="w-4 h-4" />
               New {activeTab === 'overview' ? 'Staff' : activeTab.slice(0, -1)}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Live Attendance */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-slate-800">Live Attendance</h3>
                      <button className="text-blue-600 text-xs font-semibold">View All</button>
                    </div>
                    <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
                      {recentAttendance.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            log.status === 'active' ? "bg-green-500" : "bg-slate-300"
                          )}></div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800">
                              {staff.find(s => s.id === log.staffId)?.name || 'Unknown'}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[150px]">
                              At: {clients.find(c => c.id === log.clientId)?.name || 'Client'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-mono font-bold text-slate-700">
                              {log.status === 'active' ? 'IN' : 'OUT'} {log.punchIn?.toDate ? format(log.punchIn.toDate(), 'h:mm a') : '...'}
                            </p>
                            <p className="text-[9px] text-blue-500 uppercase font-bold">{log.shiftType}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Client Assignments */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-slate-800">Client Profiles</h3>
                      <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="p-4 space-y-4">
                      {clients.map(c => (
                        <div key={c.id} className="border-l-4 border-blue-500 pl-4 py-1">
                          <p className="text-xs font-bold text-slate-800">{c.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.assignedStaffIds.map(sid => (
                              <span key={sid} className="text-[9px] text-slate-500 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {staff.find(s => s.id === sid)?.name || 'Nurse'}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <span className={cn(
                              "px-2 py-0.5 text-[9px] rounded-full font-medium",
                              c.paymentStatus === 'overdue' ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                            )}>
                              {c.paymentStatus === 'overdue' ? 'Payment Reminder' : 'Paid cycle'}
                            </span>
                            <span className="text-[9px] font-bold text-blue-600 ml-auto">${c.weeklyRate}/wk</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financials Overview */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <h3 className="font-bold text-sm text-slate-800 mb-4">Financial Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Advances</p>
                          <p className="text-lg font-bold text-blue-900">${totalStaffBalance}</p>
                          <p className="text-[9px] text-blue-500 mt-1">Pending payout</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Receivables</p>
                          <p className="text-lg font-bold text-emerald-900">${totalOwedByClients}</p>
                          <p className="text-[9px] text-emerald-500 mt-1">Waiting collections</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <h3 className="font-bold text-sm text-slate-800 mb-3">Leave Activity</h3>
                      <div className="space-y-3">
                        {staff.filter(s => s.status === 'on_leave').map(s => (
                          <div key={s.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{s.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium uppercase">{s.role}</p>
                            </div>
                            <span className="text-[9px] font-bold text-amber-500 uppercase bg-amber-50 px-2 py-0.5 rounded">Active Leave</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'staff' && (
              <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {staff.map(s => (
                  <div key={s.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-black text-blue-600 overflow-hidden">
                        {s.name[0]}
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        s.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {s.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{s.name}</h4>
                      <p className="text-gray-400 text-sm font-medium">{s.role} • {s.phone}</p>
                    </div>
                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tight">Track</span>
                      </div>
                      <p className="font-black text-lg text-gray-900">${s.balance}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'clients' && (
               <motion.div key="clients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                 {clients.map(c => (
                   <div key={c.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                     <div className="h-24 bg-indigo-600 p-6 flex items-end justify-between">
                        <div className="p-3 bg-white rounded-2xl shadow-sm">
                          <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                          {c.paymentStatus}
                        </span>
                     </div>
                     <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-xl font-bold">{c.name}</h4>
                          <p className="text-gray-400 text-xs font-medium leading-relaxed mt-1">{c.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <Users className="w-4 h-4 text-gray-400" />
                           <span className="text-xs font-bold text-gray-600">{c.assignedStaffIds.length} Staff Assigned</span>
                        </div>
                        <button className="w-full py-3 bg-gray-50 text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                          Settings
                          <ExternalLink className="w-3 h-3" />
                        </button>
                     </div>
                   </div>
                 ))}
               </motion.div>
            )}
            
            {activeTab === 'finances' && (
               <motion.div key="finances" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-10">
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="font-bold text-lg">Transaction History</h3>
                      <div className="flex gap-2">
                         <button className="px-4 py-2 border border-gray-100 rounded-xl text-xs font-bold hover:bg-gray-50">Filter</button>
                         <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Export CSV</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50/50">
                            <tr>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {finances.map(f => (
                              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                  {f.date?.toDate ? format(f.date.toDate(), 'MMM d, yyyy') : '...'}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    f.type === 'client_payment' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                  )}>
                                    {f.type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-black text-gray-900">${f.amount}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{f.description}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {f.status === 'confirmed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                                    <span className="text-xs font-bold text-gray-600">{f.status}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                  </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
