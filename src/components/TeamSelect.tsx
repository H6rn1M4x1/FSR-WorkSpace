import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Activity, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TEAMS, Team } from '../data/teams';

interface TeamSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}


const LEAGUES = [
  { name: "Todas", logo: "" },
  { name: "Premier League", logo: "https://assets.footylogos.com/logos/premier-league-england/premier-league-england-logo-footylogos.svg" },
  { name: "LaLiga", logo: "https://assets.footylogos.com/logos/laliga-spain/laliga-spain-logo-footylogos.svg" },
  { name: "Serie A", logo: "https://assets.footylogos.com/logos/serie-a-italy/serie-a-italy-logo-footylogos.svg" },
  { name: "Bundesliga", logo: "https://assets.footylogos.com/logos/bundesliga-germany/bundesliga-germany-logo-footylogos.svg" },
  { name: "Ligue 1", logo: "https://assets.footylogos.com/logos/ligue-1-france/ligue-1-france-logo-footylogos.svg" },
  { name: "Liga Profesional", logo: "https://assets.footylogos.com/logos/liga-profesional-argentina/liga-profesional-argentina-logo-footylogos.svg" },
];

export const TeamSelect: React.FC<TeamSelectProps> = ({
  value,
  onChange,
  placeholder = "Seleccionar equipo...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("Liga Profesional");
  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTeam = TEAMS.find(team => team.name === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTeams = TEAMS.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) || team.league.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLeague = selectedLeague === "Todas" || team.league === selectedLeague;
    return matchesSearch && matchesLeague;
  });

  return (
    <div className={`relative w-full ${isOpen ? "z-50" : ""}`} ref={dropdownRef}>
      <div
        className={`w-full h-10 px-3 bg-white dark:bg-black force-black-bg border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between cursor-pointer transition-colors hover:border-slate-300 dark:hover:border-zinc-700 ${isOpen ? "ring-2 ring-primary/50 border-primary" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedTeam ? (
            <>
              {selectedTeam.logo ? (
                <img src={selectedTeam.logo} alt={selectedTeam.name} className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <Activity className="w-4 h-4 text-primary" />
              )}
              <span className="truncate">{selectedTeam.name}</span>
            </>
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-black force-black-bg border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 dark:border-zinc-800 flex gap-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary force-search-icon z-10" />
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-black force-black-bg border border-slate-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLeagueOpen(!isLeagueOpen);
                  }}
                  className="h-full px-2.5 flex items-center gap-1.5 bg-slate-50 dark:bg-black force-black-bg border border-slate-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  {selectedLeague === "Todas" ? (
                    <Filter className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <img 
                      src={LEAGUES.find(l => l.name === selectedLeague)?.logo} 
                      alt={selectedLeague} 
                      className="w-3.5 h-3.5 object-contain"
                    />
                  )}
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
                
                <AnimatePresence>
                  {isLeagueOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-40 z-[60] bg-white dark:bg-black force-black-bg border border-slate-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                        {LEAGUES.map(league => (
                          <div
                            key={league.name}
                            className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md cursor-pointer ${
                              selectedLeague === league.name ? "bg-primary/10 text-primary font-bold" : "text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeague(league.name);
                              setIsLeagueOpen(false);
                            }}
                          >
                            {league.logo ? (
                              <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />
                            ) : (
                              <Filter className="w-4 h-4 text-zinc-400" />
                            )}
                            <span className="truncate">{league.name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer ${
                      team.name === value
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    }`}
                    onClick={() => {
                      onChange(team.name);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <Activity className="w-4 h-4 text-zinc-400" />
                      )}
                      <div className="flex flex-col">
                        <span>{team.name}</span>
                        <span className="text-[9px] text-zinc-500 font-normal">{team.league} - {team.country}</span>
                      </div>
                    </div>
                    {team.name === value && <Check className="w-3.5 h-3.5" />}
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-zinc-500">
                  No se encontraron equipos
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
