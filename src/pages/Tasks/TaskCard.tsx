import { useTranslation } from 'react-i18next';
import { format, isPast, parseISO } from 'date-fns';
import { Calendar, CheckCircle, Clock, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui';
import type { EmployeeTask, TaskStatus } from './types';
import { priorityColors, statusColors } from './types';

interface TaskCardProps {
  task: EmployeeTask;
  isStaff: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit?: (task: EmployeeTask) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskCard({
  task,
  isStaff,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const { t } = useTranslation();
  const isOverdue = isPast(parseISO(task.deadline)) && task.status !== 'completed' && task.status !== 'cancelled';
  const employeeName = task.employees
    ? `${task.employees.first_name} ${task.employees.last_name}`
    : 'Unknown';

  return (
    <div className={`bg-white border rounded-lg p-4 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{task.title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
              {t(`tasks.priority.${task.priority}`)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
              {t(`tasks.status.${task.status}`)}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {!isStaff && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('tasks.assignedTo')}:</span>
                <span>{employeeName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(parseISO(task.deadline), 'MMM d, yyyy')}</span>
              {isOverdue && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  {t('tasks.overdue')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{t('tasks.points')}:</span>
              <span className="text-green-600">+{task.points}</span>
              {task.penalty_points > 0 && (
                <span className="text-red-600">/ -{task.penalty_points}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Employee actions */}
          {isStaff && task.status === 'pending' && (
            <Button
              variant="secondary"
              onClick={() => onStatusChange(task.id, 'in_progress')}
              icon={<Clock className="w-4 h-4" />}
            >
              {t('tasks.startTask')}
            </Button>
          )}
          {isStaff && task.status === 'in_progress' && (
            <Button
              onClick={() => onStatusChange(task.id, 'completed')}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              {t('tasks.markComplete')}
            </Button>
          )}

          {/* Admin/HR actions */}
          {!isStaff && (
            <>
              {onEdit && task.status !== 'completed' && task.status !== 'cancelled' && (
                <button
                  onClick={() => onEdit(task)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
