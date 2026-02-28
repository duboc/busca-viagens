import { useState, useEffect, useCallback } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import { getAirlinesByAlliance } from '../../db/repositories/FlightRepository';
import type { AllianceType, AirlineInfo } from '../../agents/types';

const ALLIANCES: { key: AllianceType; label: string }[] = [
  { key: 'star_alliance', label: 'Star Alliance' },
  { key: 'skyteam', label: 'SkyTeam' },
  { key: 'oneworld', label: 'oneworld' },
];

export default function AllianceFilter() {
  const { filterAlliance, setFilterAlliance } = useSearchStore();
  const [airlines, setAirlines] = useState<AirlineInfo[]>([]);
  const [showAirlines, setShowAirlines] = useState(false);

  const loadAirlines = useCallback(async (alliance: AllianceType) => {
    try {
      const result = await getAirlinesByAlliance(alliance);
      setAirlines(result);
    } catch (err) {
      console.error('Failed to load airlines:', err);
      setAirlines([]);
    }
  }, []);

  useEffect(() => {
    if (filterAlliance) {
      loadAirlines(filterAlliance);
    } else {
      setAirlines([]);
    }
  }, [filterAlliance, loadAirlines]);

  const handleToggle = (alliance: AllianceType) => {
    if (filterAlliance === alliance) {
      setFilterAlliance(null);
      setShowAirlines(false);
    } else {
      setFilterAlliance(alliance);
      setShowAirlines(true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Alianca:</label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setFilterAlliance(null);
              setShowAirlines(false);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filterAlliance === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {ALLIANCES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleToggle(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterAlliance === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Airline member list */}
      {showAirlines && filterAlliance && airlines.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-[52px]">
          {airlines.map((airline) => (
            <span
              key={airline.iataCode}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600"
              title={airline.name}
            >
              <span className="font-mono font-semibold text-gray-800">
                {airline.iataCode}
              </span>
              <span className="text-gray-400">{airline.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
