import { useTranslation } from 'react-i18next';
import { Plus, ListTodo } from 'lucide-react';
import { PageSpinner, PageHeader, Card, EmptyState, Button } from '../../components/ui';
import { useTasks } from './useTasks';
import TaskCard from './TaskCard';
import TaskFormModal from './TaskFormModal';
import type { TaskStatus } from './types';

const statusFilters: ('all' | TaskStatus)[] = ['all', 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'];

export default function Tasks() {
  const { t } = useTranslation();
  const {
    loading,
    tasks,
    employees,
    filter,
    setFilter,
    showModal,
    formData,
    setFormData,
    submitting,
    editingTask,
    isStaff,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleStatusChange,
    handleDelete,
  } = useTasks();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tasks.title')}
        subtitle={isStaff ? t('tasks.subtitleStaff') : t('tasks.subtitle')}
        action={
          !isStaff && (
            <Button onClick={() => handleOpenModal()} icon={<Plus className="w-5 h-5" />}>
              {t('tasks.assignTask')}
            </Button>
          )
        }
      />

      <Card>
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusFilters.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? t('common.all') : t(`tasks.status.${status}`)}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isStaff={isStaff}
              onStatusChange={handleStatusChange}
              onEdit={!isStaff ? handleOpenModal : undefined}
              onDelete={!isStaff ? handleDelete : undefined}
            />
          ))}
        </div>

        {tasks.length === 0 && (
          <EmptyState
            icon={ListTodo}
            message={t('tasks.noTasks')}
          />
        )}
      </Card>

      {!isStaff && (
        <TaskFormModal
          show={showModal}
          onClose={handleCloseModal}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          submitting={submitting}
          employees={employees}
          editingTask={editingTask}
        />
      )}
    </div>
  );
}
