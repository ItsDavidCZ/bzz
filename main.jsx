export const ACTIVITIES = [
  {
    id: 'run',
    label: 'Běh',
    emoji: '🏃',
    color: '#FC4C02',
    bg: '#FFF0EB',
    speedLabel: 'Tempo',
    usesPace: true,   // show pace instead of speed
    description: 'Venkovní běh',
  },
  {
    id: 'bike',
    label: 'Cyklistika',
    emoji: '🚴',
    color: '#0084FF',
    bg: '#EBF4FF',
    speedLabel: 'Rychlost',
    usesPace: false,
    description: 'Silniční / MTB',
  },
  {
    id: 'walk',
    label: 'Chůze',
    emoji: '🚶',
    color: '#10B981',
    bg: '#ECFDF5',
    speedLabel: 'Tempo',
    usesPace: true,
    description: 'Procházka / Nordic walking',
  },
  {
    id: 'hike',
    label: 'Turistika',
    emoji: '⛰️',
    color: '#F59E0B',
    bg: '#FFFBEB',
    speedLabel: 'Tempo',
    usesPace: true,
    description: 'Výlet do přírody',
  },
  {
    id: 'swim',
    label: 'Plavání',
    emoji: '🏊',
    color: '#6366F1',
    bg: '#EEF2FF',
    speedLabel: 'Tempo / 100m',
    usesPace: false,
    description: 'Bazén / otevřená voda',
  },
];

export function getActivity(id) {
  return ACTIVITIES.find(a => a.id === id) || ACTIVITIES[0];
}
