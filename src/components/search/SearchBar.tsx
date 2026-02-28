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
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-start pt-4 pointer-events-none">
          <span className="text-gray-400 dark:text-gray-500 text-lg">🔍</span>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Para onde voce quer ir? Ex: "Quero ir pra Tokyo em marco, saindo de Sao Paulo, orcamento de R$5000"'
          rows={3}
          className="w-full pl-12 pr-28 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl
                     text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none
                     focus:outline-none focus:ring-0 focus:border-blue-500 dark:focus:border-blue-400
                     shadow-sm hover:shadow-md dark:shadow-none text-base transition-all"
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
                       transition-all shadow-sm shadow-blue-600/25 hover:shadow-md hover:shadow-blue-600/30
                       flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Buscando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Buscar
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
