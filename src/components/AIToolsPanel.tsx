import React, { useState } from 'react';
import { Wrench, Play, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { type AITool, type ToolCall, type ToolResult, type JsonValue } from '../types/types';

interface ParameterConfig {
  type: string;
  description?: string;
  enum?: JsonValue[];
  default?: JsonValue;
  [key: string]: JsonValue | undefined;
}

interface AIToolsPanelProps {
  tools: AITool[];
  onExecuteTool: (toolName: string, parameters: JsonValue) => Promise<ToolResult>;
  lastToolCall?: ToolCall | null;
  isVisible: boolean;
  onClose: () => void;
}

export const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  tools,
  onExecuteTool,
  lastToolCall,
  isVisible,
  onClose
}) => {
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [parameters, setParameters] = useState<Record<string, JsonValue>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    setParameters({});
    setLastResult(null);
  };

  const handleParameterChange = (paramName: string, value: JsonValue) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleExecute = async () => {
    if (!selectedTool) return;

    setIsExecuting(true);
    try {
      const result = await onExecuteTool(selectedTool, parameters);
      setLastResult(result);
    } catch (error) {
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const toggleToolExpansion = (toolName: string) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  };

  const renderParameterInput = (paramName: string, paramConfig: ParameterConfig) => {
    const value = parameters[paramName] || paramConfig.default || '';

    if (paramConfig.enum) {
      return (
        <select
          value={String(value || '')}
          onChange={(e) => handleParameterChange(paramName, e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        >
          <option value="">Select {paramName}</option>
          {paramConfig.enum?.map((option) => (
            <option key={String(option)} value={String(option)}>{String(option)}</option>
          ))}
        </select>
      );
    }

    if (paramConfig.type === 'boolean') {
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleParameterChange(paramName, e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Enable {paramName}</span>
        </label>
      );
    }

    if (paramConfig.type === 'number') {
      return (
        <input
          type="number"
          value={String(value || '')}
          onChange={(e) => handleParameterChange(paramName, parseFloat(e.target.value))}
          placeholder={paramConfig.description}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400"
        />
      );
    }

    return (
      <input
        type="text"
        value={String(value || '')}
        onChange={(e) => handleParameterChange(paramName, e.target.value)}
        placeholder={paramConfig.description}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400"
      />
    );
  };

  if (!isVisible) return null;

  const selectedToolConfig = tools.find(t => t.name === selectedTool);

  return (
    <div className="fixed left-0 top-0 h-full w-96 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-purple-400" />
          <h2 className="text-white font-semibold">AI Tools</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <XCircle className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Available Tools ({tools.length})</h3>
          
          {tools.map((tool) => (
            <div key={tool.name} className="mb-2">
              <button
                onClick={() => toggleToolExpansion(tool.name)}
                className="w-full flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors text-left"
              >
                {expandedTools.has(tool.name) ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{tool.name}</div>
                  <div className="text-xs text-gray-400">{tool.description}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToolSelect(tool.name);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    selectedTool === tool.name
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Select
                </button>
              </button>
              
              {expandedTools.has(tool.name) && (
                <div className="mt-2 ml-6 p-3 bg-gray-800/30 rounded border border-gray-700/30">
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Parameters:</h4>
                  {Object.entries(tool.parameters.properties).map(([paramName, paramConfig]) => (
                    <div key={paramName} className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">
                        {paramName} {tool.parameters.required.includes(paramName) && <span className="text-red-400">*</span>}
                      </div>
                      <div className="text-xs text-gray-500">{(paramConfig as ParameterConfig).description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tool Execution */}
        {selectedToolConfig && (
          <div className="border-t border-gray-700/50 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Execute: {selectedTool}</h3>
            
            <div className="space-y-3">
              {Object.entries(selectedToolConfig.parameters.properties).map(([paramName, paramConfig]) => (
                <div key={paramName}>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {paramName}
                    {selectedToolConfig.parameters.required.includes(paramName) && (
                      <span className="text-red-400 ml-1">*</span>
                    )}
                  </label>
                  {renderParameterInput(paramName, paramConfig as ParameterConfig)}
                  <p className="text-xs text-gray-500 mt-1">{(paramConfig as ParameterConfig).description}</p>
                </div>
              ))}
              
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Tool
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult && (
          <div className="border-t border-gray-700/50 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              Last Result
            </h3>
            
            <div className={`p-3 rounded-lg text-sm ${
              lastResult.success 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-red-500/20 border border-red-500/30'
            }`}>
              {lastResult.success ? (
                <pre className="text-green-100 whitespace-pre-wrap text-xs overflow-auto max-h-40">
                  {JSON.stringify(lastResult.data, null, 2)}
                </pre>
              ) : (
                <p className="text-red-100">{lastResult.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Last Tool Call Info */}
        {lastToolCall && (
          <div className="border-t border-gray-700/50 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Last AI Tool Call</h3>
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <div className="text-blue-100 text-sm">
                <div className="font-medium">{lastToolCall.name}</div>
                <pre className="text-xs mt-1 opacity-80">
                  {JSON.stringify(lastToolCall.parameters, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};