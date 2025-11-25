import { useState } from 'react';
import { monthlyReport } from './mockData';
import RevenueChart from './RevenueChart';
import './MonthlyReport.css';

const MonthlyReport = () => {
  const [selectedYear, setSelectedYear] = useState(monthlyReport.year);
  const [selectedMonth, setSelectedMonth] = useState(monthlyReport.month);
  const { summary, dailySales, categoryBreakdown } = monthlyReport;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const handleExcelDownload = () => {
    alert('엑셀 다운로드 기능은 준비 중입니다.');
  };

  const years = [2023, 2024, 2025];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="monthly-report">
      {/* 기간 선택 및 다운로드 */}
      <div className="report-controls">
        <div className="date-selectors">
          <select
            className="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            className="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
        </div>
        <button className="excel-button" onClick={handleExcelDownload}>
          <span className="icon">📊</span>
          엑셀 다운로드
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">총 매출</div>
            <div className="card-value">{formatCurrency(summary.totalSales)}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">💳</div>
          <div className="card-content">
            <div className="card-label">총 수수료</div>
            <div className="card-value fee">{formatCurrency(summary.totalFee)}</div>
          </div>
        </div>
        <div className="summary-card highlight">
          <div className="card-icon">✨</div>
          <div className="card-content">
            <div className="card-label">실수령액</div>
            <div className="card-value">{formatCurrency(summary.netAmount)}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <div className="card-label">주문 건수</div>
            <div className="card-value">{summary.orderCount}건</div>
          </div>
        </div>
      </div>

      {/* 차트 섹션 */}
      <RevenueChart dailySales={dailySales} categoryBreakdown={categoryBreakdown} />

      {/* 안내 메시지 */}
      <div className="report-info">
        <span className="info-icon">ℹ️</span>
        <p>
          월별 리포트는 해당 월의 1일부터 말일까지의 데이터를 기준으로 집계됩니다.
          <br />
          수수료는 판매 금액의 10%가 적용됩니다.
        </p>
      </div>
    </div>
  );
};

export default MonthlyReport;
