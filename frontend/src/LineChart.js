import React from 'react';
import { Line } from 'react-chartjs-2';

import 'chart.js/auto';
import 'chartjs-adapter-moment';
//import moment from 'moment';


// This function generates an array of dates between two dates
// These are used for plotting (and set to 0 when no corresponding data is found)
const generateDatesBetween = (startDate, endDate, hourly) => {
    let dates = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        if (hourly) {
            currentDate.setHours(currentDate.getHours() + 1);
        } else {
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    return dates;
};

const LineChart = ({ data, timeFrame, displayMode, cumulative, allusers, showTotal }) => {
    let endDate = new Date(); // today
    endDate.setMinutes(0, 0, 0);  // set to beginning of current hour; if we are not 24_hr, we set to beginning of day later
    let startDate;
    switch (timeFrame) {
        case '24_hours':
            startDate = new Date(new Date(endDate).setHours(endDate.getHours() - 24));
            break;
        case 'last_month':
            endDate.setHours(0);
            startDate = new Date(new Date(endDate).setMonth(endDate.getMonth() - 1));
            break;
        default:
            endDate.setHours(0);
            startDate = new Date(Math.min(...data.map(d => new Date(d.date + "T00:00:00")))); // careful to stay in local TZ
            break;
    }
    console.log(startDate, endDate);

    // Generate all dates or hours depending on the timeFrame

    let labels = generateDatesBetween(startDate, endDate, timeFrame === '24_hours');

    // convert "date" strings to Date objects. Careful to stay in local TZ
    data = data.map(d => ({ ...d, date: new Date(timeFrame === '24_hours' ? d.date + ":00:00" : d.date + "T00:00:00") }));
    console.log(data);

    const key = allusers ? 'userName' : 'resourceName';

    // Group data by resource name
    const groupedData = data.reduce((groups, item) => {
        const group = (groups[item[key]] || []);
        group.push(item);
        groups[item[key]] = group;
        return groups;
    }, {});

    // Either find exact entries, or, when cumulative, find the latest entry that is before the current date as fallback.
    let finder;
    if (cumulative) {
        finder = (label => (d => d.date.getTime() <= label.getTime()));
    } else {
        finder = (label => (d => d.date.getTime() === label.getTime()));
    }

    // Create a dataset for each group
    const datasets = Object.entries(groupedData).map(([resourceName, resourceData], i) => {
        const chartData = labels.map(label => {
            const matchingData = resourceData.find(finder(label));
            return matchingData ? matchingData[displayMode] : 0;
        });
        return {
            label: resourceName,
            data: chartData,
            borderColor: `hsl(${i * 360 / Object.keys(groupedData).length}, 70%, 50%)`,
            fill: false,
        };
    });

    // Create a total dataset
    // When we are not displaying costs, then totals do not make sense -- in that case, the toggle switch is also hidden.
    if (showTotal && displayMode === 'cost') {
        const totalData = labels.map(label => {
            let sum = 0;
            for (const resourceData of Object.values(groupedData)) {
                const matchingData = resourceData.find(finder(label));
                sum += matchingData ? matchingData[displayMode] : 0;
            }
            return sum;
        });
        datasets.push({
            label: 'Total',
            data: totalData,
            borderColor: 'black',
            fill: false,
        });
    }

    const dataForChart = {
        labels: labels.map(d => d.toISOString()), // format dates as you need
        datasets: datasets,
    };

    const options = {
        scales: {
            x: {
                type: 'time',
                time: {
                  tooltipFormat: timeFrame === '24_hours' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD',
                  displayFormats: {
                    hour: timeFrame === '24_hours' ? 'HH:mm' : 'YYYY-MM-DD',
                    day: 'YYYY-MM-DD'
                  }
                },
                ticks: {
                  source: 'data'
                }
              },
            y: {
                beginAtZero: true,
            },
        },
    };

    return <Line data={dataForChart} options={options} />;
};

export default LineChart;