import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { LeaveStatusData } from './types';

const LEAVE_COLORS = {
  Pending: '#f59e0b',
  Approved: '#10b981',
  Rejected: '#ef4444',
};

interface LeaveChartProps {
  leaveStatusData: LeaveStatusData[];
}

export default function LeaveChart({ leaveStatusData }: LeaveChartProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.leaveStatusDist')}</h2>
      {leaveStatusData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={leaveStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {leaveStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={LEAVE_COLORS[entry.name as keyof typeof LEAVE_COLORS]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('dashboard.noLeaveData')}</p>
        </div>
      )}
    </div>
  );
}
