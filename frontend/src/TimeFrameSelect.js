// TimeFrameSelect.js
import React from 'react';

const timeFrames = [
  { value: '24_hours', label: 'Last 24 hours' },
  { value: 'last_month', label: 'Last month' },
  { value: 'all_time', label: 'All time' },
];

const TimeFrameSelect = ({ selectedTimeFrame, setSelectedTimeFrame }) => {
  const handleChange = (event) => {
    setSelectedTimeFrame(event.target.value);
  };

  return (
    <select value={selectedTimeFrame} onChange={handleChange}>
      {timeFrames.map((timeFrame) => (
        <option key={timeFrame.value} value={timeFrame.value}>
          {timeFrame.label}
        </option>
      ))}
    </select>
  );
};

export default TimeFrameSelect;
