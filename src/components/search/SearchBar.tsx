import { useState, type FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export default function SearchBar({ onSearch, isSearching }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-400 text-lg">🔍</span>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Para onde você quer ir? Ex: "Quero ir pra Tokyo em março, saindo de São Paulo, orçamento de R$5000"'
          rows={3}
          className="w-full pl-12 pr-28 py-4 bg-white border border-gray-200 rounded-2xl
                     text-gray-900 placeholder-gray-400 resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     shadow-sm text-base"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="absolute right-3 bottom-3">
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Buscando...
              </>
            ) : (
              <>Buscar</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
