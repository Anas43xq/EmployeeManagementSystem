import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageSpinner, PageHeader, Button } from '../../components/ui';
import { useDepartments } from './useDepartments';
import DepartmentCard from './DepartmentCard';
import DepartmentFormModal from './DepartmentFormModal';

export default function Departments() {
  const { t } = useTranslation();
  const {
    departments,
    loading,
    showModal,
    setShowModal,
    editingDept,
    employees,
    submitting,
    formData,
    setFormData,
    isAdminOrHR,
    openAddModal,
    openEditModal,
    handleSubmit,
    handleDelete,
    getHeadName,
  } = useDepartments();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('departments.title')}
        subtitle={t('departments.subtitle')}
        action={
          isAdminOrHR && (
            <Button onClick={openAddModal} icon={<Plus className="w-5 h-5" />}>
              {t('departments.addDepartment')}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <DepartmentCard
            key={dept.id}
            dept={dept}
            isAdminOrHR={isAdminOrHR}
            getHeadName={getHeadName}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <DepartmentFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        editingDept={editingDept}
        formData={formData}
        setFormData={setFormData}
        employees={employees}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
