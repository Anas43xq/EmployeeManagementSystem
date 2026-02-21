import { useTranslation } from 'react-i18next';
import { format, isPast, parseISO } from 'date-fns';
import { Calendar, CheckCircle, Clock, Edit, Trash2, AlertTriangle } from 'lucide-react';
import type { EmployeeTask, TaskStatus } from './types';
import { priorityColors, statusColors } from './types';

interface TaskCardProps {
  task: EmployeeTask;
  isStaff: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit?: (task: EmployeeTask) => void;
  onDelete?: (taskId: string) => void;
  processingTasks?: Set<string>;
}

export default function TaskCard({
  task,
  isStaff,
  onStatusChange,
  onEdit,
  onDelete,
  processingTasks,
}: TaskCardProps) {
  const { t } = useTranslation();
  const isProcessing = processingTasks?.has(task.id) || false;
  const isOverdue = isPast(parseISO(task.deadline)) && task.status !== 'completed' && task.status !== 'cancelled';
  const employeeName = task.employees
    ? `${task.employees.first_name} ${task.employees.last_name}`
    : 'Unknown';

  return (
    <div className={`bg-white border rounded-lg p-4 overflow-hidden ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <h3 className="font-semibold text-gray-900 break-words">{task.title}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
                {t(`tasks.priority.${task.priority}`)}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
                {t(`tasks.status.${task.status}`)}
              </span>
            </div>
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
              <span className="text-blue-600">+{task.points}</span>
              {task.penalty_points > 0 && (
                <span className="text-red-600">/ -{task.penalty_points}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 shrink-0">
          {/* Employee actions */}
          {isStaff && task.status === 'pending' && (
            <button
              onClick={() => onStatusChange(task.id, 'in_progress')}
              disabled={isProcessing}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                isProcessing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{t('tasks.startTask')}</span>
              <span className="sm:hidden">Start</span>
            </button>
          )}
          {isStaff && task.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              disabled={isProcessing}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                isProcessing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{t('tasks.markComplete')}</span>
              <span className="sm:hidden">Done</span>
            </button>
          )}

          {/* Admin/HR actions */}
          {!isStaff && (
            <>
              {onEdit && task.status !== 'completed' && task.status !== 'cancelled' && (
                <button
                  onClick={() => onEdit(task)}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-colors ${
                    isProcessing
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(task.id)}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-colors ${
                    isProcessing
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
