export type StaffRole = 'nurse' | 'gda' | 'office';
export type StaffStatus = 'active' | 'on_leave' | 'resigned';
export type ShiftType = '12h' | '24h';
export type AttendanceStatus = 'active' | 'completed' | 'auto_out';
export type FinancialType = 'staff_advance' | 'staff_salary' | 'client_payment';

export interface Location {
  lat: number;
  lng: number;
  updatedAt?: string;
}

export interface Staff {
  id: string;
  staffId?: string; // Explicit numeric/alpha ID
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  currentClientId?: string;
  shiftPreference?: ShiftType;
  lastLocation?: Location;
  balance: number;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  geofenceCenter: Location;
  geofenceRadius: number;
  assignedStaffIds: string[];
  paymentStatus: 'paid' | 'pending' | 'overdue';
  weeklyRate: number;
}

export interface Attendance {
  id: string;
  staffId: string;
  clientId: string;
  shiftType: ShiftType;
  punchIn: any; // Firestore Timestamp
  punchOut?: any; // Firestore Timestamp
  locationIn: Location;
  locationOut?: Location;
  status: AttendanceStatus;
}

export interface FinancialRecord {
  id: string;
  entityId: string;
  type: FinancialType;
  amount: number;
  date: any; // Firestore Timestamp
  description: string;
  status: 'pending' | 'confirmed';
}
