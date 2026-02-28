import { useAgentStore } from '../../stores/agentStore';

export default function AgentConsole() {
  const { steps, consoleOpen, setConsoleOpen, totalTokens, totalLatencyMs } =
    useAgentStore();

  if (!consoleOpen) return null;

  const groupedSteps = new Map<string, typeof steps>();
  for (const step of steps) {
    const group = groupedSteps.get(step.agent) ?? [];
    group.push(step);
    groupedSteps.set(step.agent, group);
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-40 flex">
      <div className="absolute inset-0 sm:hidden bg-black/30" onClick={() => setConsoleOpen(false)} />
      <div className="relative ml-auto w-full sm:w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">🤖 Agent Console</h2>
          <button
            onClick={() => setConsoleOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Array.from(groupedSteps.entries()).map(([agent, agentSteps]) => (
            <div key={agent}>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {agent} Agent
              </h3>
              <div className="space-y-1.5">
                {agentSteps.map((step, i) => (
                  <div
                    key={`${step.agent}-${step.step}-${i}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="shrink-0 mt-0.5">
                      {step.status === 'running'
                        ? '🔄'
                        : step.status === 'completed'
                          ? '✅'
                          : '❌'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-gray-700">{step.action}</p>
                      {step.detail && (
                        <p className="text-xs text-gray-400 mt-0.5 break-words">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {steps.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Nenhum log ainda. Inicie uma busca para ver os agentes em ação.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between">
          <span>{totalTokens.toLocaleString()} tokens</span>
          <span>{(totalLatencyMs / 1000).toFixed(1)}s total</span>
        </div>
      </div>
    </div>
  );
}
