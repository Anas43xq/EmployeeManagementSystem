import { useTranslation } from 'react-i18next';
import { Calendar, XCircle, CheckCircle } from 'lucide-react';
import type { LeaveBalance } from './types';

interface LeaveBalanceCardsProps {
  leaveBalance: LeaveBalance;
}

export default function LeaveBalanceCards({ leaveBalance }: LeaveBalanceCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('leaves.annualLeave')}</p>
            <p className="text-lg sm:text-2xl font-bold text-primary-900">
              {(leaveBalance.annual_total || 0) - (leaveBalance.annual_used || 0)}
              <span className="text-[10px] sm:text-sm font-normal text-gray-500">/{leaveBalance.annual_total || 0}</span>
            </p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-primary-900" />
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-primary-600 h-1.5 sm:h-2 rounded-full" 
            style={{ width: `${(((leaveBalance.annual_total || 0) - (leaveBalance.annual_used || 0)) / (leaveBalance.annual_total || 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('leaves.sickLeave')}</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600">
              {(leaveBalance.sick_total || 0) - (leaveBalance.sick_used || 0)}
              <span className="text-[10px] sm:text-sm font-normal text-gray-500">/{leaveBalance.sick_total || 0}</span>
            </p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-red-500 h-1.5 sm:h-2 rounded-full" 
            style={{ width: `${(((leaveBalance.sick_total || 0) - (leaveBalance.sick_used || 0)) / (leaveBalance.sick_total || 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('leaves.casualLeave')}</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600">
              {(leaveBalance.casual_total || 0) - (leaveBalance.casual_used || 0)}
              <span className="text-[10px] sm:text-sm font-normal text-gray-500">/{leaveBalance.casual_total || 0}</span>
            </p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-green-500 h-1.5 sm:h-2 rounded-full" 
            style={{ width: `${(((leaveBalance.casual_total || 0) - (leaveBalance.casual_used || 0)) / (leaveBalance.casual_total || 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
