import React, { useState, useEffect } from 'react';
import { MapPin, CloudRain, Thermometer, Bus, Train, Clock, AlertCircle } from 'lucide-react';

const App = () => {
  const [weather, setWeather] = useState({ temp: '--', max: '--', min: '--', pop: '--', time: '' });
  const [kmbData, setKmbData] = useState([]);
  const [mtrData, setMtrData] = useState([]);
  const [radarUrl, setRadarUrl] = useState('https://www.hko.gov.hk/wxinfo/radars/radar_256_n_animated.gif');

  // 獲取天氣資料
  const fetchWeather = async () => {
    try {
      const r1 = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc');
      const d1 = await r1.json();
      const yl = d1.temperature.data.find(i => i.place === '元朗公園'); // 鎖定元朗公園
      
      const r2 = await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc');
      const d2 = await r2.json();
      const today = d2.weatherForecast[0];

      const now = new Date();
      setWeather({
        temp: yl ? yl.value : '--',
        max: today.forecastMaxtemp.value,
        min: today.forecastMintemp.value,
        pop: today.forecastPSR || '低',
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      });
    } catch (error) {
      console.error("Weather fetch error:", error);
    }
  };

  // 獲取九巴資料 (276A, 276P, 268X)
  const fetchKMB = async () => {
    const stops = [
      { id: 'TN581', routes: ['276A'], stopName: '天耀邨耀民樓', dir: 'O' },
      { id: 'YL364', routes: ['276P', '268X'], stopName: '塘坊村站', dir: 'O' }
    ];
    let results = [];
    
    for (const s of stops) {
      try {
        const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${s.id}`);
        const json = await res.json();
        
        s.routes.forEach(r => {
          let etas = json.data.filter(item => item.route === r && item.dir === s.dir && item.eta);
          etas.sort((a, b) => new Date(a.eta) - new Date(b.eta));
          const next = etas[0];
          
          if (next) {
            const mins = Math.max(0, Math.floor((new Date(next.eta) - new Date()) / 60000));
            results.push({
              route: r,
              stop: `${s.stopName} 往 ${next.dest_tc}`,
              time: mins === 0 ? "即將抵達" : `${mins} 分鐘`,
              soon: mins <= 3
            });
          }
        });
      } catch (e) {
        console.error("KMB Error:", e);
      }
    }
    setKmbData(results);
  };

  // 獲取港鐵與輕鐵資料 (K65, 751, 761P)
  const fetchMTR = async () => {
    let results = [];
    try {
      // K65 巴士
      const resBus = await fetch(`https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?language=zh&routeName=K65`);
      const jsonBus = await resBus.json();
      const stopData = jsonBus.busStop?.find(s => s.busStopId === 'K65-D120');
      
      if (stopData?.bus?.length > 0) {
        stopData.bus.forEach(b => {
          results.push({
            type: 'bus', route: 'K65',
            stop: `坑尾村站 (${b.isScheduled === "0" ? "實時" : "預計"})`,
            time: b.arrivalTimeText
          });
        });
      }

      // 輕鐵 751 / 761P (站點 ID: 440)
      const resLRT = await fetch(`https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule?station_id=440`);
      const jsonLRT = await resLRT.json();
      
      jsonLRT.platform_list?.forEach(p => {
        p.route_list?.forEach(r => {
          if (r.route_no === '751' || r.route_no === '761P') {
            results.push({
              type: 'lrt', route: `輕鐵 ${r.route_no}`,
              stop: `坑尾村 (${p.platform_id}號月台) 往 ${r.dest_ch}`,
              time: r.time_ch
            });
          }
        });
      });
    } catch (e) {
      console.error("MTR/LRT Error:", e);
    }
    setMtrData(results);
  };

  // 強制刷新雷達圖
  const refreshRadar = () => {
    setRadarUrl(`https://www.hko.gov.hk/wxinfo/radars/radar_256_n_animated.gif?t=${new Date().getTime()}`);
  };

  // 初始化與設定定時器
  useEffect(() => {
    fetchWeather();
    fetchKMB();
    fetchMTR();

    const kmbMtrInterval = setInterval(() => { fetchKMB(); fetchMTR(); }, 30000);
    const weatherInterval = setInterval(fetchWeather, 300000);
    const radarInterval = setInterval(refreshRadar, 600000);

    return () => {
      clearInterval(kmbMtrInterval);
      clearInterval(weatherInterval);
      clearInterval(radarInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 font-sans text-slate-800 pb-10">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header */}
        <header className="flex justify-between items-center py-2">
          <h1 className="text-xl font-bold tracking-tight">Yuen Long Smart Dashboard</h1>
          <div className="flex items-center text-xs text-slate-500 bg-white/60 px-3 py-1 rounded-full shadow-sm">
            <Clock className="w-3 h-3 mr-1" /> 更新於 {weather.time || '--:--'}
          </div>
        </header>

        {/* 天氣卡片 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-sm font-semibold text-slate-500 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-blue-500" /> 元朗區即時氣溫
            </h2>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-6xl font-black text-slate-800 tracking-tighter">
              {weather.temp}<span className="text-3xl text-slate-400 font-bold ml-1">°C</span>
            </div>
            <div className="mt-4 flex gap-4 text-sm font-medium text-slate-600">
              <span className="flex items-center"><Thermometer className="w-4 h-4 mr-1 text-orange-500"/> {weather.min}° / {weather.max}°</span>
              <span className="flex items-center"><CloudRain className="w-4 h-4 mr-1 text-blue-400"/> 降雨機率: {weather.pop}</span>
            </div>
          </div>
        </div>

        {/* 雷達圖卡片 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50">
          <h2 className="text-sm font-semibold text-slate-500 flex items-center mb-3">
            <CloudRain className="w-4 h-4 mr-1 text-blue-500" /> 天文台 256 公里雷達圖
          </h2>
          <div className="rounded-xl overflow-hidden bg-slate-100/50 aspect-square flex items-center justify-center border border-slate-100">
            <img 
  src={radarUrl} 
  alt="雷達圖載入中" 
  className="w-full h-full object-contain mix-blend-multiply"
  referrerPolicy="no-referrer"
  onError={(e) => { 
    e.target.onerror = null; 
    e.target.src = 'https://www.hko.gov.hk/wxinfo/radars/radar_256.png'; 
  }}
/>
          </div>
        </div>

        {/* 九巴卡片 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50">
          <h2 className="text-sm font-semibold text-slate-500 flex items-center mb-3 border-b border-slate-100 pb-2">
            <Bus className="w-4 h-4 mr-1 text-red-500" /> 九巴即時到站 (276A/P, 268X)
          </h2>
          <div className="space-y-3">
            {kmbData.length > 0 ? kmbData.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-[#E3001B]">{item.route}</span>
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">{item.stop}</span>
                </div>
                <div className={`font-semibold text-right ${item.soon ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                  {item.time}
                </div>
              </div>
            )) : (
              <div className="text-sm text-slate-400 flex items-center"><AlertCircle className="w-4 h-4 mr-1"/> 載入中或無班次...</div>
            )}
          </div>
        </div>

        {/* 港鐵與輕鐵卡片 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50">
          <h2 className="text-sm font-semibold text-slate-500 flex items-center mb-3 border-b border-slate-100 pb-2">
            <Train className="w-4 h-4 mr-1 text-purple-600" /> 港鐵巴士 & 輕鐵 (坑尾村站)
          </h2>
          <div className="space-y-3">
            {mtrData.length > 0 ? mtrData.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className={`font-bold text-lg ${item.type === 'bus' ? 'text-[#5E2590]' : 'text-[#D00107]'}`}>
                    {item.route}
                  </span>
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">{item.stop}</span>
                </div>
                <div className="font-semibold text-slate-700 text-right">
                  {item.time}
                </div>
              </div>
            )) : (
              <div className="text-sm text-slate-400 flex items-center"><AlertCircle className="w-4 h-4 mr-1"/> 載入中或無班次...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
