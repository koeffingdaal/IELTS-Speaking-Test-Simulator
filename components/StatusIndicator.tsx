import React from 'react';
import { SessionState } from '../types';

interface StatusIndicatorProps {
  state: SessionState;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  const statusConfig = {
    [SessionState.IDLE]: { text: 'Idle', color: 'bg-gray-400' },
    [SessionState.CONNECTING]: { text: 'Connecting...', color: 'bg-yellow-400 animate-pulse' },
    [SessionState.CONNECTED]: { text: 'Connected', color: 'bg-green-500' },
    [SessionState.DISCONNECTED]: { text: 'Disconnected', color: 'bg-gray-400' },
    [SessionState.ERROR]: { text: 'Error', color: 'bg-red-500' },
  };

  const currentStatus = statusConfig[state] || statusConfig[SessionState.IDLE];
  const { text, color } = currentStatus;

  return (
    <div className="flex items-center space-x-2">
      <span className={`w-3 h-3 rounded-full ${color}`}></span>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{text}</span>
    </div>
  );
};

export default StatusIndicator;