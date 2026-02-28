import { useState, useCallback, useMemo } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { formatElapsedTime } from '../../utils/formatters';

const AGENT_LABELS: Record<string, string> = {
  planner: 'Planner',
  searcher: 'Searcher',
  parser: 'Parser',
  ranker: 'Ranker',
};

const AGENT_ICONS: Record<string, string> = {
  planner: '1',
  searcher: '2',
  parser: '3',
  ranker: '4',
};

export default function AgentConsole() {
  const { steps, consoleOpen, setConsoleOpen, totalTokens, totalLatencyMs } =
    useAgentStore();
  const [collapsedAgents, setCollapsedAgents] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const groupedSteps = useMemo(() => {
    const map = new Map<string, typeof steps>();
    for (const step of steps) {
      const group = map.get(step.agent) ?? [];
      group.push(step);
      map.set(step.agent, group);
    }
    return map;
  }, [steps]);

  const toggleAgent = useCallback((agent: string) => {
    setCollapsedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) {
        next.delete(agent);
      } else {
        next.add(agent);
      }
      return next;
    });
  }, []);

  const copyLogs = useCallback(async () => {
    const lines: string[] = [];
    for (const [agent, agentSteps] of groupedSteps.entries()) {
      lines.push(`=== ${AGENT_LABELS[agent] ?? agent} Agent ===`);
      for (const step of agentSteps) {
        const status =
          step.status === 'running'
            ? '[RUNNING]'
            : step.status === 'completed'
              ? '[OK]'
              : '[ERROR]';
        lines.push(`  ${status} Step ${step.step}: ${step.action}`);
        if (step.detail) {
          lines.push(`         ${step.detail}`);
        }
      }
      lines.push('');
    }
    lines.push(`Tokens: ${totalTokens} | Latency: ${(totalLatencyMs / 1000).toFixed(1)}s`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in a textarea
    }
  }, [groupedSteps, totalTokens, totalLatencyMs]);

  const getAgentElapsedTime = useCallback(
    (agentSteps: typeof steps): string | null => {
      if (agentSteps.length === 0) return null;
      const first = agentSteps[0].timestamp;
      const last = agentSteps[agentSteps.length - 1].timestamp;
      if (first === last) return null;
      return formatElapsedTime(last - first);
    },
    [],
  );

  const getAgentStatus = useCallback(
    (agentSteps: typeof steps): 'running' | 'completed' | 'error' | 'idle' => {
      if (agentSteps.length === 0) return 'idle';
      const lastStep = agentSteps[agentSteps.length - 1];
      return lastStep.status;
    },
    [],
  );

  if (!consoleOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-40 flex">
      <div className="absolute inset-0 sm:hidden bg-black/30" onClick={() => setConsoleOpen(false)} />
      <div className="relative ml-auto w-full sm:w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">Agent Console</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLogs}
              className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Copiar logs"
            >
              {copied ? 'Copiado!' : 'Copiar Logs'}
            </button>
            <button
              onClick={() => setConsoleOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Array.from(groupedSteps.entries()).map(([agent, agentSteps]) => {
            const isCollapsed = collapsedAgents.has(agent);
            const elapsed = getAgentElapsedTime(agentSteps);
            const status = getAgentStatus(agentSteps);
            const stepNum = AGENT_ICONS[agent] ?? '?';

            return (
              <div key={agent} className="border border-gray-100 rounded-lg overflow-hidden">
                {/* Collapsible header */}
                <button
                  onClick={() => toggleAgent(agent)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  {/* Step number badge */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {stepNum}
                  </span>

                  <span className="text-sm font-semibold text-gray-700 flex-1">
                    {AGENT_LABELS[agent] ?? agent} Agent
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    <span className="text-xs">
                      {status === 'running' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      {status === 'completed' && (
                        <span className="text-green-500">
                          <CheckIcon />
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="text-red-500">
                          <ErrorIcon />
                        </span>
                      )}
                    </span>

                    {/* Elapsed time */}
                    {elapsed && (
                      <span className="text-xs text-gray-400">{elapsed}</span>
                    )}

                    {/* Step count */}
                    <span className="text-xs text-gray-400">
                      {agentSteps.length} {agentSteps.length === 1 ? 'step' : 'steps'}
                    </span>

                    {/* Chevron */}
                    <span
                      className={`text-gray-400 transition-transform ${
                        isCollapsed ? '' : 'rotate-90'
                      }`}
                    >
                      <ChevronRightIcon />
                    </span>
                  </div>
                </button>

                {/* Steps content */}
                {!isCollapsed && (
                  <div className="px-3 py-2 space-y-1.5 bg-white">
                    {agentSteps.map((step, i) => (
                      <div
                        key={`${step.agent}-${step.step}-${i}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="shrink-0 mt-0.5 w-5 text-center">
                          {step.status === 'running' ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          ) : step.status === 'completed' ? (
                            <span className="text-green-500 text-xs">
                              <CheckIcon />
                            </span>
                          ) : (
                            <span className="text-red-500 text-xs">
                              <ErrorIcon />
                            </span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-300 font-mono shrink-0">
                              {step.step}
                            </span>
                            <p className="text-gray-700">{step.action}</p>
                          </div>
                          {step.detail && (
                            <p className="text-xs text-gray-400 mt-0.5 break-words ml-5">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {steps.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Nenhum log ainda. Inicie uma busca para ver os agentes em acao.
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

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
