import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './SalesChart.css';

export default function SalesChart({ data }) {
  const [period, setPeriod] = useState('daily');

  const chartData = data[period];

  const formatYAxis = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value;
  };

  const formatTooltip = (value) => {
    return value.toLocaleString('ko-KR') + '원';
  };

  const getXAxisKey = () => {
    if (period === 'daily') return 'date';
    if (period === 'weekly') return 'week';
    return 'month';
  };

  return (
    <div className="sales-chart-container">
      <div className="chart-header">
        <h3>매출 추이</h3>
        <div className="chart-tabs">
          <button
            className={period === 'daily' ? 'active' : ''}
            onClick={() => setPeriod('daily')}
          >
            일별
          </button>
          <button
            className={period === 'weekly' ? 'active' : ''}
            onClick={() => setPeriod('weekly')}
          >
            주별
          </button>
          <button
            className={period === 'monthly' ? 'active' : ''}
            onClick={() => setPeriod('monthly')}
          >
            월별
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF1493" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF1493" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={getXAxisKey()} 
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              tickFormatter={formatYAxis}
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '13px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke="#FF1493" 
              strokeWidth={3}
              dot={{ fill: '#FF1493', r: 4 }}
              activeDot={{ r: 6, fill: '#FF1493' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
