export function formatTrainStatus(data: {
  trainName?: string;
  trainNumber?: string;
  currentStation?: string;
  delay?: number;
  lastUpdate?: string;
  stations?: Array<{
    stationName: string;
    stationCode: string;
    scheduledArrival?: string;
    actualArrival?: string;
    scheduledDeparture?: string;
    actualDeparture?: string;
    delay?: number;
    platform?: string;
    isCurrent?: boolean;
    isPassed?: boolean;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`🚂 Train ${data.trainNumber ?? '—'} — ${data.trainName ?? 'Unknown'}`);
  const delayText = data.delay && data.delay > 0 ? `+${data.delay} min late` : 'On Time';
  lines.push(`Status: ${delayText} | Last Update: ${data.lastUpdate ?? 'N/A'}`);
  lines.push('');

  if (data.stations && data.stations.length > 0) {
    lines.push(
      padRight('Station', 25) +
        padRight('Sch Arr', 10) +
        padRight('Act Arr', 10) +
        padRight('Sch Dep', 10) +
        padRight('Act Dep', 10) +
        padRight('Delay', 10) +
        'Platform'
    );
    lines.push('━'.repeat(95));

    for (const s of data.stations) {
      const marker = s.isCurrent ? '▶️ ' : s.isPassed ? '  ' : '  ';
      const delayStr =
        s.delay !== undefined && s.delay > 0 ? `+${s.delay} min` : s.delay === 0 ? 'On Time' : '—';
      lines.push(
        marker +
          padRight(`${s.stationCode} (${s.stationName})`, 23) +
          padRight(s.scheduledArrival ?? '—', 10) +
          padRight(s.actualArrival ?? '—', 10) +
          padRight(s.scheduledDeparture ?? '—', 10) +
          padRight(s.actualDeparture ?? '—', 10) +
          padRight(delayStr, 10) +
          (s.platform ?? '—')
      );
    }
  }

  if (data.currentStation) {
    lines.push('');
    lines.push(`📍 Currently near: ${data.currentStation}`);
  }

  return lines.join('\n');
}

export function formatPnrStatus(data: {
  pnr: string;
  trainNumber?: string;
  trainName?: string;
  from?: string;
  to?: string;
  date?: string;
  boardingPoint?: string;
  reservationUpTo?: string;
  classCode?: string;
  passengers?: Array<{
    number: number;
    bookingStatus?: string;
    currentStatus?: string;
    coachPosition?: string;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`🎫 PNR Status: ${data.pnr}`);
  lines.push(`Train: ${data.trainNumber ?? '—'} — ${data.trainName ?? 'Unknown'}`);
  lines.push(`Route: ${data.from ?? '—'} → ${data.to ?? '—'}`);
  lines.push(`Date: ${data.date ?? '—'} | Class: ${data.classCode ?? '—'}`);
  if (data.boardingPoint) lines.push(`Boarding: ${data.boardingPoint}`);
  if (data.reservationUpTo) lines.push(`Reservation upto: ${data.reservationUpTo}`);
  lines.push('');

  if (data.passengers && data.passengers.length > 0) {
    lines.push(
      padRight('Passenger', 12) +
        padRight('Booking Status', 20) +
        padRight('Current Status', 20) +
        'Coach'
    );
    lines.push('─'.repeat(65));
    for (const p of data.passengers) {
      lines.push(
        padRight(`#${p.number}`, 12) +
          padRight(p.bookingStatus ?? '—', 20) +
          padRight(p.currentStatus ?? '—', 20) +
          (p.coachPosition ?? '—')
      );
    }
  }

  return lines.join('\n');
}

export function formatTrainSchedule(data: {
  trainNumber?: string;
  trainName?: string;
  runDays?: string[];
  classes?: string[];
  stops?: Array<{
    stationName: string;
    stationCode: string;
    arrival?: string;
    departure?: string;
    haltMinutes?: number;
    distance?: number;
    day?: number;
    platform?: string;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`🚆 ${data.trainNumber ?? '—'} — ${data.trainName ?? 'Unknown'}`);
  if (data.runDays) lines.push(`Runs on: ${data.runDays.join(', ')}`);
  if (data.classes) lines.push(`Classes: ${data.classes.join(', ')}`);
  lines.push('');

  if (data.stops && data.stops.length > 0) {
    lines.push(
      padRight('#', 4) +
        padRight('Station', 30) +
        padRight('Arrives', 10) +
        padRight('Departs', 10) +
        padRight('Halt', 8) +
        padRight('Day', 5) +
        'Dist (km)'
    );
    lines.push('─'.repeat(85));

    data.stops.forEach((s, i) => {
      lines.push(
        padRight(String(i + 1), 4) +
          padRight(`${s.stationName} (${s.stationCode})`, 30) +
          padRight(s.arrival ?? 'SRC', 10) +
          padRight(s.departure ?? 'DST', 10) +
          padRight(s.haltMinutes !== undefined ? `${s.haltMinutes}m` : '—', 8) +
          padRight(s.day !== undefined ? String(s.day) : '—', 5) +
          (s.distance !== undefined ? String(s.distance) : '—')
      );
    });
  }

  return lines.join('\n');
}

export function formatSeatAvailability(data: {
  trainNumber?: string;
  trainName?: string;
  from?: string;
  to?: string;
  date?: string;
  classCode?: string;
  availability?: Array<{
    date: string;
    status: string;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`💺 Seat Availability: ${data.trainNumber ?? '—'} — ${data.trainName ?? '—'}`);
  lines.push(`Route: ${data.from ?? '—'} → ${data.to ?? '—'}`);
  lines.push(`Class: ${data.classCode ?? '—'}`);
  lines.push('');

  if (data.availability && data.availability.length > 0) {
    lines.push(padRight('Date', 15) + 'Status');
    lines.push('─'.repeat(40));
    for (const a of data.availability) {
      lines.push(padRight(a.date, 15) + a.status);
    }
  }

  return lines.join('\n');
}

export function formatTrainList(
  trains: Array<{
    trainNumber?: string;
    trainName?: string;
    from?: string;
    to?: string;
    departure?: string;
    arrival?: string;
    duration?: string;
    classes?: string[];
    runDays?: string[];
  }>
): string {
  if (trains.length === 0) return 'No trains found for the given criteria.';
  const lines: string[] = [];
  lines.push(
    padRight('Train', 25) +
      padRight('From', 10) +
      padRight('To', 10) +
      padRight('Dep', 8) +
      padRight('Arr', 8) +
      padRight('Duration', 10) +
      'Classes'
  );
  lines.push('─'.repeat(90));

  for (const t of trains) {
    lines.push(
      padRight(`${t.trainNumber ?? ''} ${t.trainName ?? ''}`.trim(), 25) +
        padRight(t.from ?? '—', 10) +
        padRight(t.to ?? '—', 10) +
        padRight(t.departure ?? '—', 8) +
        padRight(t.arrival ?? '—', 8) +
        padRight(t.duration ?? '—', 10) +
        (t.classes?.join(', ') ?? '—')
    );
  }

  return lines.join('\n');
}

export function formatStationBoard(data: {
  stationName?: string;
  stationCode?: string;
  trains?: Array<{
    trainNumber?: string;
    trainName?: string;
    scheduledTime?: string;
    expectedTime?: string;
    delay?: number;
    platform?: string;
    type: 'arrival' | 'departure';
    origin?: string;
    destination?: string;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`🏗️ Station Board: ${data.stationName ?? '—'} (${data.stationCode ?? '—'})`);
  lines.push('');

  if (data.trains && data.trains.length > 0) {
    lines.push(
      padRight('Train', 30) +
        padRight('Type', 5) +
        padRight('Sched', 8) +
        padRight('Exp', 8) +
        padRight('Delay', 8) +
        padRight('PF', 4) +
        'Route'
    );
    lines.push('─'.repeat(90));
    for (const t of data.trains) {
      const typeChar = t.type === 'arrival' ? 'ARR' : 'DEP';
      const delayStr =
        t.delay !== undefined && t.delay > 0 ? `+${t.delay}m` : t.delay === 0 ? 'OT' : '—';
      lines.push(
        padRight(`${t.trainNumber ?? ''} ${t.trainName ?? ''}`.trim(), 30) +
          padRight(typeChar, 5) +
          padRight(t.scheduledTime ?? '—', 8) +
          padRight(t.expectedTime ?? '—', 8) +
          padRight(delayStr, 8) +
          padRight(t.platform ?? '—', 4) +
          `${t.origin ?? '—'} → ${t.destination ?? '—'}`
      );
    }
  } else {
    lines.push('No trains found for the given time window.');
  }

  return lines.join('\n');
}

export function formatFare(data: {
  trainNumber?: string;
  trainName?: string;
  from?: string;
  to?: string;
  fares?: Array<{
    classCode: string;
    fare: number;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`💰 Fare: ${data.trainNumber ?? '—'} — ${data.trainName ?? '—'}`);
  lines.push(`Route: ${data.from ?? '—'} → ${data.to ?? '—'}`);
  lines.push('');

  if (data.fares && data.fares.length > 0) {
    lines.push(padRight('Class', 10) + 'Fare (₹)');
    lines.push('─'.repeat(25));
    for (const f of data.fares) {
      lines.push(padRight(f.classCode, 10) + `₹${f.fare}`);
    }
  }
  return lines.join('\n');
}

export function formatNearbyStations(
  stations: Array<{
    name: string;
    code?: string;
    distance: number;
    lat: number;
    lon: number;
  }>
): string {
  if (stations.length === 0) return 'No stations found nearby.';
  const lines: string[] = [];
  lines.push(`📍 Nearby Stations (${stations.length} found)`);
  lines.push('');
  lines.push(padRight('Station', 35) + padRight('Distance', 12) + 'Coordinates');
  lines.push('─'.repeat(70));
  for (const s of stations) {
    lines.push(
      padRight(`${s.name}${s.code ? ` (${s.code})` : ''}`, 35) +
        padRight(`${s.distance.toFixed(1)} km`, 12) +
        `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`
    );
  }
  return lines.join('\n');
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}
