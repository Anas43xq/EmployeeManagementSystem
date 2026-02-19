import { useTranslation } from 'react-i18next';
import { Modal, Button } from '../../components/ui';
import type { TaskFormData, EmployeeTask, TaskPriority } from './types';
import type { EmployeeBasic } from '../../lib/types';

interface TaskFormModalProps {
  show: boolean;
  onClose: () => void;
  formData: TaskFormData;
  setFormData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  employees: (EmployeeBasic & { employee_number: string })[];
  editingTask: EmployeeTask | null;
}

export default function TaskFormModal({
  show,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
  employees,
  editingTask,
}: TaskFormModalProps) {
  const { t } = useTranslation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'points' || name === 'penalty_points' ? parseInt(value) || 0 : value,
    }));
  };

  const priorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <Modal.Header onClose={onClose}>
        {editingTask ? t('tasks.editTask') : t('tasks.createTask')}
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          {!editingTask && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.assignTo')} <span className="text-red-500">*</span>
              </label>
              <select
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('tasks.selectEmployee')}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.title')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('tasks.titlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('tasks.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.priorityLabel')} <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {t(`tasks.priority.${priority}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.deadline')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.points')}
              </label>
              <input
                type="number"
                name="points"
                value={formData.points}
                onChange={handleChange}
                min={0}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('tasks.pointsHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.penaltyPoints')}
              </label>
              <input
                type="number"
                name="penalty_points"
                value={formData.penalty_points}
                onChange={handleChange}
                min={0}
                max={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('tasks.penaltyHint')}</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? t('common.saving')
              : editingTask
              ? t('common.save')
              : t('tasks.createTask')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
