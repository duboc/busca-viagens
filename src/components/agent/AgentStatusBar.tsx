import { useAgentStore } from '../../stores/agentStore';

const AGENT_ORDER = ['planner', 'searcher', 'parser', 'ranker'] as const;
const AGENT_LABELS: Record<string, string> = {
  planner: 'Planner',
  searcher: 'Searcher',
  parser: 'Parser',
  ranker: 'Ranker',
};

export default function AgentStatusBar() {
  const { steps, toggleConsole } = useAgentStore();

  const agentStatus = AGENT_ORDER.map((agent) => {
    const agentSteps = steps.filter((s) => s.agent === agent);
    const latest = agentSteps[agentSteps.length - 1];
    return {
      name: agent,
      label: AGENT_LABELS[agent],
      status: latest?.status,
      action: latest?.action,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Status dos Agentes</h3>
        <button
          onClick={toggleConsole}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver Logs
        </button>
      </div>

      <div className="space-y-2">
        {agentStatus.map((a) => (
          <div key={a.name} className="flex items-center gap-3">
            <span className="text-base">
              {!a.status
                ? '⏳'
                : a.status === 'running'
                  ? '🔄'
                  : a.status === 'completed'
                    ? '✅'
                    : '❌'}
            </span>
            <span className="text-sm font-medium text-gray-700 w-20">{a.label}:</span>
            <span className="text-sm text-gray-500 truncate flex-1">
              {a.action ?? 'Aguardando...'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
