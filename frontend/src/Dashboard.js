import React, { useState, useEffect, useCallback } from 'react';
import BarChart from './BarChart';
import LineChart from './LineChart';
import UserSelect from './UserSelect';
import TimeFrameSelect from './TimeFrameSelect';
import { io } from "socket.io-client";
import { Container, Grid, Paper, Typography, Switch, FormControlLabel } from '@mui/material';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';


const Dashboard = () => {
  const [data, setData] = useState([]);
  const [barData, setBarData] = useState([]); // Add a state for data
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [cumulative, setCumulative] = useState(false);
  const [showTotal, setShowTotal] = useState(true);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('all_time');
  const [displayMode, setDisplayMode] = useState('cost'); // 'cost' or 'units'
  const [socket, setSocket] = useState(null); // Add a state for socket

  useEffect(() => {
    let socketUrl = process.env.REACT_APP_SOCKET_URL;
    let socketPath = process.env.REACT_APP_SOCKET_PATH;
    if (!socketUrl) {
      socketUrl = "http://localhost:5000";
      socketPath = "/socket.io/";
    }
    console.log('socketUrl', socketUrl, 'socketPath', socketPath);
    const socketIo = io(socketUrl, { path: socketPath });
    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  // connect to database query endpoint
  // userId: as per entry in database, we get this from the user select dropdown which is populated by get_users.
  // timeFrame: '24_hours', 'last_month', 'all_time' (TimeFrameSelect dropdown)
  // isCumulative: true/false (Switch). For bar-chart, this is always False.
  const getStats = useCallback((userId, timeFrame, isCumulative) => {
   // console.log('getStats', userId, timeFrame, isCumulative, socket);
    if (!socket) return;
    let startTime, endTime, timeFormat;

    const now = new Date();
    const tomorrow = new Date(new Date().setDate(now.getDate() + 1));  // get more data than needed to be sure to have all data

    switch (timeFrame) {
      case '24_hours':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        endTime = tomorrow;
        timeFormat = 'hourly';
        break;
      case 'last_month':
        startTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endTime = tomorrow;
        timeFormat = 'daily';
        break;
      default:
        startTime = Date.parse('2020-01-01');
        endTime = tomorrow;
        timeFormat = 'daily';
        break;
    }
    if (isCumulative) timeFormat = timeFormat + "_cumulative";

    socket.emit('get_stats', {
      userId,
      startTime,
      endTime,
      timeFormat,
    });
  }, [socket]);

  // Fetch the users and listen for 'users' event
  useEffect(() => {
    if (!socket) return;
    // Fetch the users
    socket.emit('get_users');

    // Listen for 'users' event
    socket.on('users', users => {
      setUsers(users);
    });
  }, [socket]);

  // Fetch the stats and listen for 'stats' event
  // This effect will also run when 'cumulative' changes, since whether we update each chart depends on that.
  // TODO: This is probably currently broken; I am not sure if the socket.on('stats') will be called for cumulative
  //   being false (for bar chart) when the switch is set to True..
  useEffect(() => {
    if (!socket) return;
    // On 'stats' event, update your state
    socket.on("stats", data => {
      if (data.timeFormat.includes('cumulative') === cumulative) {
        setData(data.data);
      }
      //console.log(data.timeFormat);
      if (!data.timeFormat.includes('cumulative')) {
       // console.log('setting bar data');
        setBarData(data.data);
      }
    });
    return () => {
        socket.off('stats');
    }
  }, [socket, cumulative]);

  // Update line graph when cumulative changes
  useEffect(() => {
    // Call getStats whenever the selected user or time frame changes
    if (selectedTimeFrame) {
      getStats(selectedUser, selectedTimeFrame, cumulative);
    }
  }, [selectedUser, selectedTimeFrame, cumulative, getStats]);

  // Update other graph on all events except when cumulative changes
  useEffect(() => {
    // Call getStats whenever the selected user or time frame changes
    if (selectedTimeFrame) {
      getStats(selectedUser, selectedTimeFrame, false);
    }
  }, [selectedUser, selectedTimeFrame, getStats]);

//  useEffect(() => {
    // Here you could format your data depending on selectedUser, selectedTimeFrame, and displayMode
    // and pass it to your chart components
//  }, [data, selectedUser, selectedTimeFrame, displayMode]);

  // selectedUser toggle switch is invisible when "All Users" are selected
  useEffect(() => {
    if (selectedUser === "") {
        setDisplayMode('cost');
    }
  }, [selectedUser]);

  // Aggregate data for bar chart
  const aggregateData = (data, allusers = false) => {
    const result = data.reduce((acc, item) => {
      const key = allusers ? 'userName' : 'resourceName';
      const existingItem = acc.find(res => res[key] === item[key]);

      if (existingItem) {
        existingItem.cost += item.cost;
        existingItem.units += item.units;
      } else {
        acc.push({[key]: item[key], cost: item.cost, units: item.units});
      }

      return acc;
    }, []);
    return result;
  }


  return (
    <Container maxWidth="lg">
      <Typography variant="h2" align="center" gutterBottom>LLM Seminar Dashboard</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <UserSelect selectedUser={selectedUser} setSelectedUser={setSelectedUser} users={users}/>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TimeFrameSelect selectedTimeFrame={selectedTimeFrame} setSelectedTimeFrame={setSelectedTimeFrame} />
        </Grid>
        <Grid item xs={12} sm={3} container alignItems="center" justifyContent="flex-end">

            <FormControlLabel
                control={
                    <Switch
                        checked={cumulative}
                        onChange={() => setCumulative(prevMode => !prevMode)}
                        color="primary"
                    />
                }
                label="Show Cumulative"
            />
        </Grid>
        <Grid item xs={12} sm={12}>
          <Paper elevation={3}>
            <BarChart data={aggregateData(barData, selectedUser === "")} displayMode={displayMode} allusers={selectedUser === ""}/>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={12}>
          <Paper elevation={3}>
            <LineChart data={data} timeFrame={selectedTimeFrame} displayMode={displayMode} cumulative={cumulative} allusers={selectedUser === ""} showTotal={showTotal}/>
          </Paper>
        </Grid>
        <Grid item xs={6}>
        {selectedUser && (
            <FormControlLabel
              control={
                <Switch
                  checked={displayMode === 'units'}
                  onChange={() => setDisplayMode(prevMode => prevMode === 'cost' ? 'units' : 'cost')}
                  color="primary"
                />
              }
              label="Show kToken"
            />
        )}
        </Grid>
        {displayMode === 'cost' && (
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={showTotal}
                  onChange={() => setShowTotal(prevMode => !prevMode)}
                  color="primary"
                />
              }
              label="Show Totals"
            />
          </Grid>
        )}
      </Grid>
    </Container>
  );

};

export default Dashboard