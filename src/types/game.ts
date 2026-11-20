export type CampusZone =
  | 'Main Entrance Gate & Bus Bay'
  | 'Central 12M Spine Avenue'
  | 'Main Building (East Portico)'
  | 'PG Block'
  | 'Central Library'
  | 'First Year Block'
  | 'Student Service Block'
  | 'Landscape Garden & HT Tower'
  | 'Computer Science Block (CSE)'
  | 'AC Sheet Workshop Sheds'
  | 'Cricket Stadium & Pavilion'
  | 'Sports Courts & Exam Hall'
  | 'Boy\'s Hostel & West Campus'
  | 'Racha Kalwa Perimeter Canal';

export interface VehicleInteractionState {
  vehicleId: string;
  vehicleName: string;
  isDriving: boolean;
  speedKmh: number;
}

export interface GameState {
  fps: number;
  currentZone: CampusZone;
  zoneDescription: string;
  playerPosition: {
    x: number;
    y: number;
    z: number;
  };
  playerRotationY: number; // yaw angle in radians for minimap heading arrow
  playerSpeed: number; // in m/s
  isSprinting: boolean;
  isGrounded: boolean;
  isPointerLocked: boolean;
  vehicleInteraction?: VehicleInteractionState | null;
}

export interface LandmarkLocation {
  name: CampusZone;
  shortLabel: string;
  x: number;
  y: number;
  z: number;
  description: string;
}

export const CVR_LANDMARKS: LandmarkLocation[] = [
  {
    name: 'Main Entrance Gate & Bus Bay',
    shortLabel: 'Main Gate',
    x: 25,
    y: 1.5,
    z: -168,
    description: 'Sandstone Monument, CVR Medallion, Wrought-Iron Gates & North Bus Bay',
  },
  {
    name: 'Central 12M Spine Avenue',
    shortLabel: '12M Spine',
    x: 25,
    y: 1.5,
    z: -110,
    description: '12m Wide Central Avenue Spine connecting North Gate to Campus Core',
  },
  {
    name: 'Main Building (East Portico)',
    shortLabel: 'Main Building',
    x: 12,
    y: 1.5,
    z: -75,
    description: 'East-Facing Overhanging Portico, Dark Granite Pillars & Royal-Blue Sign',
  },
  {
    name: 'Landscape Garden & HT Tower',
    shortLabel: 'Landscape',
    x: 75,
    y: 1.5,
    z: -85,
    description: 'Lush Garden Park, Pathways, Shaded Trees & 36m Steel Lattice HT Tower',
  },
  {
    name: 'PG Block',
    shortLabel: 'PG Block',
    x: -65,
    y: 1.5,
    z: -75,
    description: '4-Story Postgraduate & Engineering Research Wing West of Main Building',
  },
  {
    name: 'Central Library',
    shortLabel: 'Library',
    x: -12,
    y: 1.5,
    z: -23,
    description: '3-Story Central Academic Library South of Main Building',
  },
  {
    name: 'First Year Block',
    shortLabel: 'First Year',
    x: -65,
    y: 1.5,
    z: -10,
    description: '4-Story Freshman Engineering Academic Complex',
  },
  {
    name: 'Student Service Block',
    shortLabel: 'Student Service',
    x: -8,
    y: 1.5,
    z: 7,
    description: 'Student Center, Administrative Counters & Amenities Block',
  },
  {
    name: 'Computer Science Block (CSE)',
    shortLabel: 'CSE Block',
    x: 76,
    y: 1.5,
    z: -23,
    description: '4-Story Computing Facilities, AI/ML Labs & Innovation Centers',
  },
  {
    name: 'AC Sheet Workshop Sheds',
    shortLabel: 'Workshops',
    x: 92,
    y: 1.5,
    z: 16,
    description: 'Pitched Terracotta-Red Workshop Sheds (Buildings 1, 2, and 3)',
  },
  {
    name: 'Cricket Stadium & Pavilion',
    shortLabel: 'Cricket Oval',
    x: 82,
    y: 1.5,
    z: 72,
    description: 'Athletic Turf Oval, Central Pitch & Stepped Spectator Pavilion',
  },
  {
    name: 'Sports Courts & Exam Hall',
    shortLabel: 'Sports Courts',
    x: 0,
    y: 1.5,
    z: 52,
    description: 'Basketball & Volleyball Courts, Exam Hall & Utilities',
  },
  {
    name: 'Boy\'s Hostel & West Campus',
    shortLabel: 'Boy\'s Hostel',
    x: -155,
    y: 1.5,
    z: 115,
    description: 'Multi-Story Residential Hostel Block & South-West Grounds',
  },
  {
    name: 'Racha Kalwa Perimeter Canal',
    shortLabel: 'Racha Kalwa',
    x: 152,
    y: 1.5,
    z: 20,
    description: 'Curving Rain Water Canal & Stone Embankments on Campus Perimeter',
  },
];
