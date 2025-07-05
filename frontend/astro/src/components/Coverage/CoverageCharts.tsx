import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { CoverageChartData } from '../../types/beaver';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface CoverageChartsProps {
  chartData: CoverageChartData;
}

const CoverageCharts: React.FC<CoverageChartsProps> = ({ chartData }) => {
  // Package coverage bar chart configuration
  const packageChartConfig = {
    labels: chartData.package_chart.labels.map(label => {
      // Truncate long package names for better display
      const parts = label.split('/');
      return parts.length > 1 ? parts[parts.length - 1] : label;
    }),
    datasets: [
      {
        label: 'カバレッジ (%)',
        data: chartData.package_chart.data,
        backgroundColor: chartData.package_chart.grades.map(grade => {
          const colors = {
            'A': '#4CAF50',
            'B': '#8BC34A', 
            'C': '#FF9800',
            'D': '#FF5722',
            'F': '#F44336'
          };
          return colors[grade as keyof typeof colors] || '#666';
        }),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
      },
    ],
  };

  const packageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'パッケージ別カバレッジ',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#374151',
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const fullLabel = chartData.package_chart.labels[context[0].dataIndex];
            return fullLabel;
          },
          label: (context: any) => {
            const grade = chartData.package_chart.grades[context.dataIndex];
            return [
              `カバレッジ: ${context.parsed.y.toFixed(1)}%`,
              `評価: ${grade}`
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => `${value}%`,
        },
        title: {
          display: true,
          text: 'カバレッジ (%)',
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
  };

  // Distribution pie chart configuration
  const distributionChartConfig = {
    labels: chartData.distribution_chart.labels,
    datasets: [
      {
        data: chartData.distribution_chart.data,
        backgroundColor: chartData.distribution_chart.colors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
      },
    ],
  };

  const distributionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'カバレッジ分布',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#374151',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${context.parsed}個 (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Package Coverage Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="h-96">
          <Bar data={packageChartConfig} options={packageChartOptions} />
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          <p>各パッケージのテストカバレッジを評価別に色分け表示</p>
        </div>
      </div>

      {/* Coverage Distribution Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="h-96">
          <Doughnut data={distributionChartConfig} options={distributionChartOptions} />
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          <p>品質評価別のパッケージ分布</p>
        </div>
      </div>

      {/* Chart Legend & Insights */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
          📈 チャート解説
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grade Legend */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
              品質評価基準
            </h4>
            <div className="space-y-2">
              {[
                { grade: 'A', range: '90%+', color: '#4CAF50', description: '優秀' },
                { grade: 'B', range: '80-89%', color: '#8BC34A', description: '良好' },
                { grade: 'C', range: '70-79%', color: '#FF9800', description: '普通' },
                { grade: 'D', range: '50-69%', color: '#FF5722', description: '要改善' },
                { grade: 'F', range: '<50%', color: '#F44336', description: '緊急対応' },
              ].map(({ grade, range, color, description }) => (
                <div key={grade} className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-sm">
                    <strong>{grade}:</strong> {range} - {description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Insights */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
              主要な洞察
            </h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start space-x-2">
                <span className="text-red-500">⚠️</span>
                <span>
                  F評価パッケージ: {chartData.distribution_chart.data[4]}個 - 優先的な改善が必要
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-500">✅</span>
                <span>
                  A評価パッケージ: {chartData.distribution_chart.data[0]}個 - 良好な品質を維持
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500">📊</span>
                <span>
                  平均カバレッジ: {(chartData.package_chart.data.reduce((a, b) => a + b, 0) / chartData.package_chart.data.length || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-purple-500">🎯</span>
                <span>
                  改善対象: D・F評価の{chartData.distribution_chart.data[3] + chartData.distribution_chart.data[4]}パッケージ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverageCharts;