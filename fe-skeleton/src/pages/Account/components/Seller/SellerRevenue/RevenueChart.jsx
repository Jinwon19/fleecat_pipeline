import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './RevenueChart.css';

const RevenueChart = ({ dailySales, categoryBreakdown }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ko-KR', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${payload[0].payload.date}일`}</p>
          <p className="value">{`${new Intl.NumberFormat('ko-KR').format(payload[0].value)}원`}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{payload[0].name}</p>
          <p className="value">{`${new Intl.NumberFormat('ko-KR').format(payload[0].value)}원`}</p>
          <p className="percentage">{`${payload[0].payload.percentage}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="revenue-charts">
      {/* 일별 매출 Line Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <h3>일별 매출 추이</h3>
          <p className="subtitle">최근 한 달 동안의 매출 변화</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dailySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF1493" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF1493" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#666"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}일`}
              />
              <YAxis
                stroke="#666"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#FF1493"
                strokeWidth={3}
                dot={{ fill: '#FF1493', r: 4 }}
                activeDot={{ r: 6, fill: '#FF1493' }}
                fill="url(#colorSales)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 카테고리별 매출 Pie Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <h3>카테고리별 매출 분포</h3>
          <p className="subtitle">전체 매출 대비 카테고리별 비중</p>
        </div>
        <div className="chart-container pie-container">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="amount"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span style={{ color: '#666', fontSize: '14px' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 카테고리별 상세 목록 */}
      <div className="category-breakdown-list">
        {categoryBreakdown.map((category, index) => (
          <div key={index} className="category-item">
            <div className="category-info">
              <div
                className="category-color"
                style={{ backgroundColor: category.fill }}
              />
              <span className="category-name">{category.category}</span>
            </div>
            <div className="category-stats">
              <span className="category-amount">
                {new Intl.NumberFormat('ko-KR').format(category.amount)}원
              </span>
              <span className="category-percentage">{category.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevenueChart;
