import React from 'react';
import { Bar } from 'react-chartjs-2';

import 'chart.js/auto';

const BarChart = ({ data, displayMode, allusers }) => {
  const chartData = {
    labels: data.map(d => allusers ? d.userName : d.resourceName),
    datasets: [
      {
        label: displayMode === 'cost' ? 'Cost (USD)' : 'kToken',
        data: data.map(d => displayMode === 'cost' ? d.cost : d.units ),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
        x: {
            ticks: {
              source: 'data'
            }
          },
        y: {
            beginAtZero: true,
        },
    },
};

  return <Bar data={chartData} options={options} />;
};

export default BarChart;