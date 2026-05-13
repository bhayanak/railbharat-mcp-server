export interface StationEntry {
  code: string;
  name: string;
  zone?: string;
  state?: string;
}

// Top Indian railway stations for built-in lookup (offline fallback)
const STATIONS: StationEntry[] = [
  { code: 'NDLS', name: 'New Delhi', zone: 'NR', state: 'Delhi' },
  { code: 'DEE', name: 'Delhi Sarai Rohilla', zone: 'NR', state: 'Delhi' },
  { code: 'DLI', name: 'Old Delhi Junction', zone: 'NR', state: 'Delhi' },
  { code: 'NZM', name: 'Hazrat Nizamuddin', zone: 'NR', state: 'Delhi' },
  { code: 'ANVT', name: 'Anand Vihar Terminal', zone: 'NR', state: 'Delhi' },
  { code: 'BCT', name: 'Mumbai Central', zone: 'WR', state: 'Maharashtra' },
  { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', zone: 'CR', state: 'Maharashtra' },
  { code: 'LTT', name: 'Lokmanya Tilak Terminus', zone: 'CR', state: 'Maharashtra' },
  { code: 'BVI', name: 'Borivali', zone: 'WR', state: 'Maharashtra' },
  { code: 'PNVL', name: 'Panvel Junction', zone: 'CR', state: 'Maharashtra' },
  { code: 'HWH', name: 'Howrah Junction', zone: 'ER', state: 'West Bengal' },
  { code: 'SDAH', name: 'Sealdah', zone: 'ER', state: 'West Bengal' },
  { code: 'MAS', name: 'Chennai Central', zone: 'SR', state: 'Tamil Nadu' },
  { code: 'MS', name: 'Chennai Egmore', zone: 'SR', state: 'Tamil Nadu' },
  { code: 'SBC', name: 'KSR Bengaluru City Junction', zone: 'SWR', state: 'Karnataka' },
  { code: 'YPR', name: 'Yesvantpur Junction', zone: 'SWR', state: 'Karnataka' },
  { code: 'SC', name: 'Secunderabad Junction', zone: 'SCR', state: 'Telangana' },
  { code: 'HYB', name: 'Hyderabad Deccan', zone: 'SCR', state: 'Telangana' },
  { code: 'ADI', name: 'Ahmedabad Junction', zone: 'WR', state: 'Gujarat' },
  { code: 'JP', name: 'Jaipur Junction', zone: 'NWR', state: 'Rajasthan' },
  { code: 'AJJ', name: 'Arakkonam Junction', zone: 'SR', state: 'Tamil Nadu' },
  { code: 'LKO', name: 'Lucknow Charbagh', zone: 'NR', state: 'Uttar Pradesh' },
  { code: 'LKNE', name: 'Lucknow NE', zone: 'NER', state: 'Uttar Pradesh' },
  { code: 'CNB', name: 'Kanpur Central', zone: 'NCR', state: 'Uttar Pradesh' },
  { code: 'ALD', name: 'Prayagraj Junction', zone: 'NCR', state: 'Uttar Pradesh' },
  { code: 'BSB', name: 'Varanasi Junction', zone: 'NER', state: 'Uttar Pradesh' },
  { code: 'AGC', name: 'Agra Cantt', zone: 'NCR', state: 'Uttar Pradesh' },
  { code: 'GWL', name: 'Gwalior Junction', zone: 'NCR', state: 'Madhya Pradesh' },
  { code: 'BPL', name: 'Bhopal Junction', zone: 'WCR', state: 'Madhya Pradesh' },
  { code: 'JBP', name: 'Jabalpur Junction', zone: 'WCR', state: 'Madhya Pradesh' },
  { code: 'PNBE', name: 'Patna Junction', zone: 'ECR', state: 'Bihar' },
  { code: 'RJPB', name: 'Rajendra Nagar Terminal', zone: 'ECR', state: 'Bihar' },
  { code: 'GHY', name: 'Guwahati', zone: 'NFR', state: 'Assam' },
  { code: 'RNC', name: 'Ranchi Junction', zone: 'SER', state: 'Jharkhand' },
  { code: 'TATA', name: 'Tatanagar Junction', zone: 'SER', state: 'Jharkhand' },
  { code: 'BBS', name: 'Bhubaneswar', zone: 'ECoR', state: 'Odisha' },
  { code: 'CTC', name: 'Cuttack Junction', zone: 'ECoR', state: 'Odisha' },
  { code: 'VSKP', name: 'Visakhapatnam Junction', zone: 'ECoR', state: 'Andhra Pradesh' },
  { code: 'BZA', name: 'Vijayawada Junction', zone: 'SCR', state: 'Andhra Pradesh' },
  { code: 'TVC', name: 'Thiruvananthapuram Central', zone: 'SR', state: 'Kerala' },
  { code: 'ERS', name: 'Ernakulam Junction', zone: 'SR', state: 'Kerala' },
  { code: 'CLT', name: 'Kozhikode (Calicut)', zone: 'SR', state: 'Kerala' },
  { code: 'CBE', name: 'Coimbatore Junction', zone: 'SR', state: 'Tamil Nadu' },
  { code: 'MDU', name: 'Madurai Junction', zone: 'SR', state: 'Tamil Nadu' },
  { code: 'TPJ', name: 'Tiruchirappalli Junction', zone: 'SR', state: 'Tamil Nadu' },
  { code: 'NGP', name: 'Nagpur Junction', zone: 'CR', state: 'Maharashtra' },
  { code: 'PNQ', name: 'Pune Junction', zone: 'CR', state: 'Maharashtra' },
  { code: 'SUR', name: 'Solapur Junction', zone: 'CR', state: 'Maharashtra' },
  { code: 'CDG', name: 'Chandigarh Junction', zone: 'NR', state: 'Chandigarh' },
  { code: 'ASR', name: 'Amritsar Junction', zone: 'NR', state: 'Punjab' },
  { code: 'JAT', name: 'Jammu Tawi', zone: 'NR', state: 'Jammu & Kashmir' },
  { code: 'DDN', name: 'Dehradun', zone: 'NR', state: 'Uttarakhand' },
  { code: 'HW', name: 'Haridwar Junction', zone: 'NR', state: 'Uttarakhand' },
  { code: 'UDZ', name: 'Udaipur City', zone: 'NWR', state: 'Rajasthan' },
  { code: 'JU', name: 'Jodhpur Junction', zone: 'NWR', state: 'Rajasthan' },
  { code: 'AII', name: 'Ajmer Junction', zone: 'NWR', state: 'Rajasthan' },
  { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', zone: 'NR', state: 'Jammu & Kashmir' },
  { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya Junction', zone: 'NR', state: 'Uttar Pradesh' },
  { code: 'MGS', name: 'Mughal Sarai Junction', zone: 'NR', state: 'Uttar Pradesh' },
  { code: 'GKP', name: 'Gorakhpur Junction', zone: 'NER', state: 'Uttar Pradesh' },
  { code: 'RJT', name: 'Rajkot Junction', zone: 'WR', state: 'Gujarat' },
  { code: 'BRC', name: 'Vadodara Junction', zone: 'WR', state: 'Gujarat' },
  { code: 'ST', name: 'Surat', zone: 'WR', state: 'Gujarat' },
  { code: 'RTM', name: 'Ratlam Junction', zone: 'WR', state: 'Madhya Pradesh' },
  { code: 'INDB', name: 'Indore Junction', zone: 'WR', state: 'Madhya Pradesh' },
  { code: 'KGP', name: 'Kharagpur Junction', zone: 'SER', state: 'West Bengal' },
  { code: 'NJP', name: 'New Jalpaiguri Junction', zone: 'NFR', state: 'West Bengal' },
  { code: 'GMO', name: 'Gomo Junction', zone: 'SER', state: 'Jharkhand' },
  { code: 'DHN', name: 'Dhanbad Junction', zone: 'ECR', state: 'Jharkhand' },
  { code: 'GAY', name: 'Gaya Junction', zone: 'ECR', state: 'Bihar' },
  { code: 'MFP', name: 'Muzaffarpur Junction', zone: 'ECR', state: 'Bihar' },
  { code: 'DBG', name: 'Darbhanga Junction', zone: 'ECR', state: 'Bihar' },
  { code: 'RJPB', name: 'Rajendra Nagar Terminal', zone: 'ECR', state: 'Bihar' },
  { code: 'DGR', name: 'Durgapur', zone: 'ER', state: 'West Bengal' },
  { code: 'AWB', name: 'Aurangabad', zone: 'SCR', state: 'Maharashtra' },
  { code: 'KYN', name: 'Kalyan Junction', zone: 'CR', state: 'Maharashtra' },
  { code: 'GOA', name: 'Goa (Madgaon)', zone: 'SWR', state: 'Goa' },
  { code: 'MAO', name: 'Madgaon Junction', zone: 'SWR', state: 'Goa' },
  { code: 'UBL', name: 'Hubballi Junction', zone: 'SWR', state: 'Karnataka' },
  { code: 'MYS', name: 'Mysuru Junction', zone: 'SWR', state: 'Karnataka' },
  { code: 'RU', name: 'Tirupati', zone: 'SCR', state: 'Andhra Pradesh' },
  { code: 'TPTY', name: 'Tirupati Main', zone: 'SCR', state: 'Andhra Pradesh' },
  { code: 'GNT', name: 'Guntur Junction', zone: 'SCR', state: 'Andhra Pradesh' },
  { code: 'SLO', name: 'Salem Junction', zone: 'SR', state: 'Tamil Nadu' },
  { code: 'SA', name: 'Shoranur Junction', zone: 'SR', state: 'Kerala' },
  { code: 'TCR', name: 'Thrissur', zone: 'SR', state: 'Kerala' },
  { code: 'KCG', name: 'Kacheguda', zone: 'SCR', state: 'Telangana' },
  { code: 'WL', name: 'Warangal', zone: 'SCR', state: 'Telangana' },
  { code: 'R', name: 'Raipur Junction', zone: 'SECR', state: 'Chhattisgarh' },
  { code: 'BSP', name: 'Bilaspur Junction', zone: 'SECR', state: 'Chhattisgarh' },
  { code: 'SBP', name: 'Sambalpur Junction', zone: 'ECoR', state: 'Odisha' },
  { code: 'PURI', name: 'Puri', zone: 'ECoR', state: 'Odisha' },
  { code: 'KIR', name: 'Katihar Junction', zone: 'NFR', state: 'Bihar' },
  { code: 'DJU', name: 'Dibrugarh Town', zone: 'NFR', state: 'Assam' },
  { code: 'DBRG', name: 'Dibrugarh', zone: 'NFR', state: 'Assam' },
  { code: 'SLGR', name: 'Siliguri Junction', zone: 'NFR', state: 'West Bengal' },
  { code: 'RNY', name: 'Ratnagiri', zone: 'CR', state: 'Maharashtra' },
  { code: 'KJM', name: 'Krishnarajapuram', zone: 'SWR', state: 'Karnataka' },
  { code: 'MTJ', name: 'Mathura Junction', zone: 'NCR', state: 'Uttar Pradesh' },
  { code: 'BKN', name: 'Bikaner Junction', zone: 'NWR', state: 'Rajasthan' },
];

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = normalizeForSearch(needle);
  const h = normalizeForSearch(haystack);
  if (h.includes(n)) return true;
  // Simple character-sequence fuzzy match
  let ni = 0;
  for (let hi = 0; hi < h.length && ni < n.length; hi++) {
    if (h[hi] === n[ni]) ni++;
  }
  return ni === n.length && n.length >= 3;
}

export function resolveStationCode(query: string): StationEntry | undefined {
  const upper = query.toUpperCase().trim();
  // Exact code match
  const byCode = STATIONS.find((s) => s.code === upper);
  if (byCode) return byCode;
  // Exact name match (case-insensitive)
  const norm = normalizeForSearch(query);
  const byName = STATIONS.find((s) => normalizeForSearch(s.name) === norm);
  if (byName) return byName;
  return undefined;
}

export function searchStations(query: string): StationEntry[] {
  if (query.length < 2) return [];
  const results: Array<{ station: StationEntry; score: number }> = [];
  for (const station of STATIONS) {
    const codeLower = station.code.toLowerCase();
    const queryLower = query.toLowerCase().trim();
    // Code starts-with
    if (codeLower.startsWith(queryLower)) {
      results.push({ station, score: 100 });
      continue;
    }
    // Code contains
    if (codeLower.includes(queryLower)) {
      results.push({ station, score: 80 });
      continue;
    }
    // Name starts-with
    if (normalizeForSearch(station.name).startsWith(normalizeForSearch(query))) {
      results.push({ station, score: 90 });
      continue;
    }
    // Fuzzy match
    if (fuzzyMatch(query, station.name) || fuzzyMatch(query, station.code)) {
      results.push({ station, score: 50 });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20).map((r) => r.station);
}

export function formatStationDisplay(station: StationEntry): string {
  const parts = [station.name, `(${station.code})`];
  if (station.zone) parts.push(`[${station.zone}]`);
  return parts.join(' ');
}

export function getAllStations(): StationEntry[] {
  return [...STATIONS];
}
