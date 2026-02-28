import { useState, useEffect, useRef } from 'react';
import { getDatabase } from '../../db/database';

interface Airport {
  iata_code: string;
  name: string;
  city: string;
  country: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (iata: string) => void;
  placeholder?: string;
}

export default function AirportAutocomplete({ label, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function search(q: string) {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const db = await getDatabase();
    const res = db.exec(
      `SELECT iata_code, name, city, country FROM airports
       WHERE iata_code LIKE ? OR city LIKE ? OR name LIKE ?
       LIMIT 8`,
      [`%${q}%`, `%${q}%`, `%${q}%`],
    );

    if (!res.length) {
      setResults([]);
      return;
    }

    const airports: Airport[] = res[0].values.map((row) => ({
      iata_code: row[0] as string,
      name: row[1] as string,
      city: row[2] as string,
      country: row[3] as string,
    }));
    setResults(airports);
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? 'Cidade ou código IATA'}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((a) => (
            <li
              key={a.iata_code}
              onClick={() => {
                onChange(a.iata_code);
                setQuery(a.iata_code);
                setOpen(false);
              }}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between"
            >
              <span>
                <span className="font-semibold">{a.iata_code}</span>{' '}
                <span className="text-gray-500">{a.city}</span>
              </span>
              <span className="text-gray-400 text-xs">{a.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
