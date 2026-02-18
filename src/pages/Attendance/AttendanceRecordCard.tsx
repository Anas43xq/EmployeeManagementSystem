import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle, XCircle, LogOut } from 'lucide-react';
import type { AttendanceRecord } from './types';

interface AttendanceRecordCardProps {
  record: AttendanceRecord;
  userRole: string | undefined;
  isToday: boolean;
  onCheckOut: (id: string) => void;
  calculateHoursWorked: (checkIn: string | null, checkOut: string | null) => string | null;
}

export default function AttendanceRecordCard({
  record,
  userRole,
  isToday,
  onCheckOut,
  calculateHoursWorked,
}: AttendanceRecordCardProps) {
  const { t } = useTranslation();

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${
            record.status === 'present' ? 'bg-green-100' :
            record.status === 'late' ? 'bg-yellow-100' :
            record.status === 'absent' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            {record.status === 'present' ? (
              <CheckCircle className="w-6 h-6 text-green-900" />
            ) : record.status === 'absent' ? (
              <XCircle className="w-6 h-6 text-red-900" />
            ) : (
              <Clock className="w-6 h-6 text-yellow-900" />
            )}
          </div>
          <div>
            {userRole !== 'staff' && (
              <p className="text-sm font-medium text-gray-900">
                {record.employees?.first_name} {record.employees?.last_name}
              </p>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{t('attendance.checkIn')}: {record.check_in || t('common.na')}</span>
              <span>{t('attendance.checkOut')}: {record.check_out || t('common.na')}</span>
              {calculateHoursWorked(record.check_in, record.check_out) && (
                <span className="font-medium text-gray-900">{t('attendance.hours')}: {calculateHoursWorked(record.check_in, record.check_out)}</span>
              )}
            </div>
            {record.notes && (
              <p className="text-sm text-gray-500 mt-1">{record.notes}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {record.check_in && !record.check_out && isToday && (
            <button
              onClick={() => onCheckOut(record.id)}
              className="flex items-center space-x-1 px-3 py-1 text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Check Out</span>
            </button>
          )}
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            record.status === 'present' ? 'bg-green-100 text-green-800' :
            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
            record.status === 'absent' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {record.status === 'present' ? t('attendance.present') : record.status === 'absent' ? t('attendance.absent') : record.status === 'late' ? t('attendance.late') : record.status === 'half-day' ? t('attendance.halfDay') : record.status}
          </span>
        </div>
      </div>
    </div>
  );
}
