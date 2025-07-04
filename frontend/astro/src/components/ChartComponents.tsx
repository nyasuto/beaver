import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { AccessibleChart } from './AccessibilityEnhancements';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

import type { Statistics } from '../types/beaver';

interface ChartComponentsProps {
  statistics: Statistics;
  className?: string;
}

// Line Chart for Issue Trends
export const IssuesTrendChart: React.FC<{ statistics: Statistics; className?: string }> = ({
  statistics,
  className = ''
}) => {
  const timeline = statistics.timeline || [];
  
  const data = {
    labels: timeline.map(item => {
      const date = new Date(item.week_start);
      return date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
    datasets: [
      {
        label: 'Created Issues',
        data: timeline.map(item => item.created_count),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        fill: true,
      },
      {
        label: 'Closed Issues',
        data: timeline.map(item => item.closed_count),
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: 'Issues Trend (Weekly)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Week',
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Issues',
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  if (timeline.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-600 dark:text-gray-400">No timeline data available</p>
        </div>
      </div>
    );
  }

  // Create accessible data table for screen readers
  const dataTable = {
    headers: ['Week', 'Created Issues', 'Closed Issues'],
    rows: timeline.map(item => [
      new Date(item.week_start).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      item.created_count,
      item.closed_count
    ])
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <AccessibleChart
        title="Issues Trend Chart"
        description="Weekly trend showing created vs closed issues over time"
        dataTable={dataTable}
      >
        <div className="h-64">
          <Line data={data} options={options} />
        </div>
      </AccessibleChart>
    </div>
  );
};

// Doughnut Chart for Issue Distribution
export const IssueDistributionChart: React.FC<{ statistics: Statistics; className?: string }> = ({
  statistics,
  className = ''
}) => {
  const data = {
    labels: ['Open Issues', 'Closed Issues'],
    datasets: [
      {
        data: [statistics.open_issues, statistics.closed_issues],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // green for open
          'rgba(107, 114, 128, 0.8)', // gray for closed
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(107, 114, 128)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'Issue Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const total = statistics.total_issues;
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Create accessible data table for screen readers
  const dataTable = {
    headers: ['Status', 'Count', 'Percentage'],
    rows: [
      ['Open Issues', statistics.open_issues, `${((statistics.open_issues / statistics.total_issues) * 100).toFixed(1)}%`],
      ['Closed Issues', statistics.closed_issues, `${((statistics.closed_issues / statistics.total_issues) * 100).toFixed(1)}%`]
    ]
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <AccessibleChart
        title="Issue Distribution Chart"
        description={`Distribution of ${statistics.total_issues} total issues: ${statistics.open_issues} open and ${statistics.closed_issues} closed`}
        dataTable={dataTable}
      >
        <div className="h-64">
          <Doughnut data={data} options={options} />
        </div>
      </AccessibleChart>
    </div>
  );
};

// Bar Chart for Weekly Activity
export const WeeklyActivityChart: React.FC<{ statistics: Statistics; className?: string }> = ({
  statistics,
  className = ''
}) => {
  const timeline = statistics.timeline || [];
  const lastFourWeeks = timeline.slice(-4);
  
  const data = {
    labels: lastFourWeeks.map(item => {
      const date = new Date(item.week_start);
      return date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
    datasets: [
      {
        label: 'Created',
        data: lastFourWeeks.map(item => item.created_count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Closed',
        data: lastFourWeeks.map(item => item.closed_count),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: 'Recent Weekly Activity',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Week',
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Issues',
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  if (lastFourWeeks.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-gray-600 dark:text-gray-400">No recent activity data</p>
        </div>
      </div>
    );
  }

  // Create accessible data table for screen readers
  const dataTable = {
    headers: ['Week', 'Created', 'Closed'],
    rows: lastFourWeeks.map(item => [
      new Date(item.week_start).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      item.created_count,
      item.closed_count
    ])
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <AccessibleChart
        title="Recent Weekly Activity Chart"
        description="Bar chart showing created and closed issues for the last 4 weeks"
        dataTable={dataTable}
      >
        <div className="h-64">
          <Bar data={data} options={options} />
        </div>
      </AccessibleChart>
    </div>
  );
};

// Combined Statistics Dashboard
export const StatisticsDashboard: React.FC<ChartComponentsProps> = ({
  statistics,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Row - Trend Chart */}
      <div className="w-full">
        <IssuesTrendChart statistics={statistics} />
      </div>
      
      {/* Bottom Row - Distribution and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IssueDistributionChart statistics={statistics} />
        <WeeklyActivityChart statistics={statistics} />
      </div>
    </div>
  );
};

export default StatisticsDashboard;