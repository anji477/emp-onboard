import React from 'react';

interface ProgressBarProps {
  progress: number;
  small?: boolean;
  hasError?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, small = false, hasError = false }) => {
  const validProgress = Math.max(0, Math.min(100, progress));
  const barColor = hasError ? 'bg-red-500' : 'bg-indigo-600';

  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${small ? 'h-2' : 'h-4'}`}>
      <div
        className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${validProgress}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;