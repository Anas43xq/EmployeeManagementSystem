import { useTranslation } from 'react-i18next';
import { Calendar, XCircle, CheckCircle } from 'lucide-react';
import type { LeaveBalance } from './types';

interface LeaveBalanceCardsProps {
  leaveBalance: LeaveBalance;
}

export default function LeaveBalanceCards({ leaveBalance }: LeaveBalanceCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{t('leaves.annualLeave')}</p>
            <p className="text-2xl font-bold text-blue-900">
              {(leaveBalance.annual_total || 0) - (leaveBalance.annual_used || 0)}
              <span className="text-sm font-normal text-gray-500"> / {leaveBalance.annual_total || 0}</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-900" />
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${(((leaveBalance.annual_total || 0) - (leaveBalance.annual_used || 0)) / (leaveBalance.annual_total || 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{t('leaves.sickLeave')}</p>
            <p className="text-2xl font-bold text-red-600">
              {(leaveBalance.sick_total || 0) - (leaveBalance.sick_used || 0)}
              <span className="text-sm font-normal text-gray-500"> / {leaveBalance.sick_total || 0}</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-red-500 h-2 rounded-full" 
            style={{ width: `${(((leaveBalance.sick_total || 0) - (leaveBalance.sick_used || 0)) / (leaveBalance.sick_total || 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{t('leaves.casualLeave')}</p>
            <p className="text-2xl font-bold text-green-600">
              {(leaveBalance.casual_total || 0) - (leaveBalance.casual_used || 0)}
              <span className="text-sm font-normal text-gray-500"> / {leaveBalance.casual_total || 0}</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full" 
            style={{ width: `${(((leaveBalance.casual_total || 0) - (leaveBalance.casual_used || 0)) / (leaveBalance.casual_total || 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
