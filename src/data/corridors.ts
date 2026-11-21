import type { RouteRecord } from '../types/routerelay'

export const SEEDED_ROUTES: RouteRecord[] = [
  {
    id: 'gt-road-grw-ksk',
    name: 'GT Road: Gujranwala ↔ UET KSK',
    origin: 'Gujranwala (Chanda Qila)',
    destination: 'UET KSK Campus Gate',
    color: '#ef4444', // Red / Coral
    waypoints: [
      [32.1384, 74.1925], // Gujranwala General Bus Stand
      [32.1158, 74.1882], // Chanda Qila Bypass
      [32.0620, 74.2014], // Rahwali / Cantt outskirts
      [31.9745, 74.2238], // Kamoke GT Road
      [31.9312, 74.2340], // Gunnaur Toll
      [31.8680, 74.2480], // Sadhoke
      [31.8021, 74.2615], // Muridke Main Chowk
      [31.7760, 74.2810], // Kala Shah Kaku Interchange approach
      [31.7585, 74.2952], // GT Road KSK Turn
      [31.7552, 74.2995], // UET KSK Main Gate
    ],
    stops: [
      { id: 'stop-grw-chanda', name: 'Chanda Qila (Gujranwala)', lat: 32.1158, lng: 74.1882 },
      { id: 'stop-grw-kamoke', name: 'Kamoke Bus Stop', lat: 31.9745, lng: 74.2238 },
      { id: 'stop-grw-sadhoke', name: 'Sadhoke Stop', lat: 31.8680, lng: 74.2480 },
      { id: 'stop-grw-muridke', name: 'Muridke GT Chowk', lat: 31.8021, lng: 74.2615 },
      { id: 'stop-grw-uet-gate', name: 'UET KSK Main Gate', lat: 31.7552, lng: 74.2995 },
    ],
  },
  {
    id: 'lahore-ksk-shuttle',
    name: 'Lahore Express: Thokar/Shahdara ↔ UET KSK',
    origin: 'Lahore (Thokar Niaz Baig / Shahdara)',
    destination: 'UET KSK Campus Gate',
    color: '#3b82f6', // Blue
    waypoints: [
      [31.4704, 74.2398], // Thokar Niaz Baig
      [31.5120, 74.2750], // Gulshan-e-Ravi
      [31.5450, 74.2980], // Chauburji
      [31.5890, 74.3090], // Azadi Chowk / Minar-e-Pakistan
      [31.6210, 74.2820], // Shahdara Chowk
      [31.6580, 74.2870], // Imamia Colony Phattak
      [31.7100, 74.2920], // Rana Town / Ferozewala
      [31.7450, 74.2965], // KSK Interchange
      [31.7552, 74.2995], // UET KSK Main Gate
    ],
    stops: [
      { id: 'stop-lhr-thokar', name: 'Thokar Niaz Baig', lat: 31.4704, lng: 74.2398 },
      { id: 'stop-lhr-azadi', name: 'Azadi Chowk', lat: 31.5890, lng: 74.3090 },
      { id: 'stop-lhr-shahdara', name: 'Shahdara Metro Terminal', lat: 31.6210, lng: 74.2820 },
      { id: 'stop-lhr-ferozewala', name: 'Ferozewala Stop', lat: 31.7100, lng: 74.2920 },
      { id: 'stop-lhr-uet-gate', name: 'UET KSK Main Gate', lat: 31.7552, lng: 74.2995 },
    ],
  },
  {
    id: 'ksk-campus-loop',
    name: 'UET KSK: Campus & Hostels Loop',
    origin: 'UET KSK Main Gate',
    destination: 'Hostels & Academic Blocks (Loop)',
    color: '#10b981', // Emerald / Green
    waypoints: [
      [31.7552, 74.2995], // Main Gate
      [31.7565, 74.3020], // Admin Block
      [31.7578, 74.3050], // Electrical / Telecom Dept
      [31.7590, 74.3075], // CS / Mechanical Block
      [31.7610, 74.3080], // Central Library & Cafe
      [31.7630, 74.3060], // Boys Hostels (Liaquat / Iqbal)
      [31.7625, 74.3025], // Sports Complex & Ground
      [31.7595, 74.3005], // Girls Hostel & Medical Center
      [31.7570, 74.2998], // Faculty Quarters
      [31.7552, 74.2995], // Back to Main Gate
    ],
    stops: [
      { id: 'stop-loop-gate', name: 'Main Gate & Security', lat: 31.7552, lng: 74.2995 },
      { id: 'stop-loop-admin', name: 'Admin Block & Bank', lat: 31.7565, lng: 74.3020 },
      { id: 'stop-loop-academic', name: 'Academic Complex (CS/EE)', lat: 31.7590, lng: 74.3075 },
      { id: 'stop-loop-hostels', name: 'Boys Hostels & Mess', lat: 31.7630, lng: 74.3060 },
      { id: 'stop-loop-sports', name: 'Sports Pavilion & Gym', lat: 31.7625, lng: 74.3025 },
      { id: 'stop-loop-girls-hostel', name: 'Girls Hostel & Dispensary', lat: 31.7595, lng: 74.3005 },
    ],
  },
]

export const DEFAULT_ROUTE = SEEDED_ROUTES[0]
