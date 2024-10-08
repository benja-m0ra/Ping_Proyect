import React, { useState, useEffect } from 'react';
import { Activity, Plus, X, Sun, Moon, Tag } from 'lucide-react';
import { io } from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PingData {
  ip: string;
  latency: number;
  status: 'success' | 'failed';
  timestamp: number;
}

interface TracerouteData {
  ip: string;
  hops: { hop: number; address: string; latency: number }[];
}

interface MonitoredIP {
  ip: string;
  tag: string;
}

const socket = io('http://localhost:3001');

function App() {
  const [ipAddress, setIpAddress] = useState('');
  const [ipTag, setIpTag] = useState('');
  const [monitoredIPs, setMonitoredIPs] = useState<MonitoredIP[]>([]);
  const [pingData, setPingData] = useState<PingData[]>([]);
  const [tracerouteData, setTracerouteData] = useState<TracerouteData[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    socket.on('pingResult', (data: PingData) => {
      setPingData((prevData) => [...prevData, data]);
    });

    socket.on('tracerouteResult', (data: TracerouteData) => {
      setTracerouteData((prevData) => [...prevData, data]);
    });

    return () => {
      socket.off('pingResult');
      socket.off('tracerouteResult');
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const addIP = () => {
    if (ipAddress && !monitoredIPs.some(item => item.ip === ipAddress)) {
      const newIP: MonitoredIP = { ip: ipAddress, tag: ipTag || ipAddress };
      setMonitoredIPs([...monitoredIPs, newIP]);
      socket.emit('addIP', ipAddress);
      setIpAddress('');
      setIpTag('');
    }
  };

  const removeIP = (ip: string) => {
    setMonitoredIPs(monitoredIPs.filter((monitoredIP) => monitoredIP.ip !== ip));
    setPingData(pingData.filter((data) => data.ip !== ip));
    setTracerouteData(tracerouteData.filter((data) => data.ip !== ip));
    socket.emit('removeIP', ip);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const getChartData = (ip: string) => {
    const ipData = pingData.filter((data) => data.ip === ip);
    return {
      labels: ipData.map((data) => new Date(data.timestamp).toLocaleTimeString()),
      datasets: [{
        label: monitoredIPs.find(monitoredIP => monitoredIP.ip === ip)?.tag || ip,
        data: ipData.map((data) => data.latency),
        borderColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
        fill: false,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Latencia en tiempo real',
        color: darkMode ? 'white' : 'black',
      },
    },
    scales: {
      x: {
        ticks: {
          color: darkMode ? 'white' : 'black',
        },
      },
      y: {
        ticks: {
          color: darkMode ? 'white' : 'black',
        },
      },
    },
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-black'} p-8`}>
      <div className="flex justify-between items-center mb-6">
        <div className="w-12"></div> {/* Spacer */}
        <h1 className="text-3xl font-bold flex items-center">
          <Activity className="mr-2" /> PingProyect
        </h1>
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-full ${darkMode ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-yellow-400'}`}
        >
          {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={ipAddress}
          onChange={(e) => setIpAddress(e.target.value)}
          placeholder="Ingrese una dirección IP o dominio"
          className="flex-grow p-2 border rounded dark:bg-gray-800 dark:text-white"
        />
        <input
          type="text"
          value={ipTag}
          onChange={(e) => setIpTag(e.target.value)}
          placeholder="Etiqueta (opcional)"
          className="flex-grow p-2 border rounded dark:bg-gray-800 dark:text-white"
        />
        <button
          onClick={addIP}
          className="bg-blue-500 text-white p-2 rounded flex items-center"
        >
          <Plus className="mr-1" /> Agregar IP
        </button>
      </div>
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded shadow mb-6`}>
        <h2 className="text-xl font-semibold mb-4">Resultados de Ping</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">IP</th>
              <th className="text-left">Etiqueta</th>
              <th className="text-left">Latencia</th>
              <th className="text-left">Estado</th>
              <th className="text-left">Acción</th>
            </tr>
          </thead>
          <tbody>
            {monitoredIPs.map((monitoredIP) => {
              const lastPing = pingData.filter((data) => data.ip === monitoredIP.ip).pop();
              return (
                <tr key={monitoredIP.ip}>
                  <td>{monitoredIP.ip}</td>
                  <td>{monitoredIP.tag}</td>
                  <td>{lastPing ? `${lastPing.latency.toFixed(2)} ms` : 'N/A'}</td>
                  <td>{lastPing ? lastPing.status : 'N/A'}</td>
                  <td>
                    <button
                      onClick={() => removeIP(monitoredIP.ip)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600"
                    >
                      <X size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {monitoredIPs.map((monitoredIP) => (
          <div key={monitoredIP.ip} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded shadow`}>
            <h2 className="text-xl font-semibold mb-4">Gráfico de Latencia: {monitoredIP.tag || monitoredIP.ip}</h2>
            <Line data={getChartData(monitoredIP.ip)} options={chartOptions} />
          </div>
        ))}
      </div>
      <div className={`mt-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded shadow`}>
        <h2 className="text-xl font-semibold mb-4">Resultados de Traceroute</h2>
        {tracerouteData.map((data) => {
          const monitoredIP = monitoredIPs.find(ip => ip.ip === data.ip);
          return (
            <div key={data.ip} className="mb-4">
              <h3 className="font-semibold flex items-center">
                <Tag className="mr-2" /> {monitoredIP ? monitoredIP.tag : data.ip}
              </h3>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Salto</th>
                    <th className="text-left">Dirección</th>
                    <th className="text-left">Latencia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hops.map((hop) => (
                    <tr key={hop.hop}>
                      <td>{hop.hop}</td>
                      <td>{hop.address}</td>
                      <td>{hop.latency.toFixed(2)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;