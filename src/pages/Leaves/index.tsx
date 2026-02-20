import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PageSpinner, PageHeader, Card, EmptyState, Button } from '../../components/ui';
import { useLeaves } from './useLeaves';
import LeaveBalanceCards from './LeaveBalanceCards';
import LeaveStatusFilter from './LeaveStatusFilter';
import LeaveCard from './LeaveCard';
import ApplyLeaveModal from './ApplyLeaveModal';

export default function Leaves() {
  const { t } = useTranslation();
  const {
    loading,
    user,
    filter,
    setFilter,
    showApplyModal,
    setShowApplyModal,
    submitting,
    leaveBalance,
    formData,
    setFormData,
    filteredLeaves,
    handleApplyLeave,
    handleApprove,
    handleReject,
    calculateDays,
    getAvailableBalance,
    leaveConflicts,
    checkingConflicts,
    checkLeaveConflicts,
  } = useLeaves();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('leaves.title')}
        subtitle={t('leaves.subtitle')}
        action={
          <Button onClick={() => setShowApplyModal(true)} icon={<Plus className="w-5 h-5" />}>
            {t('leaves.applyLeave')}
          </Button>
        }
      />

      {user?.role === 'staff' && leaveBalance && (
        <LeaveBalanceCards leaveBalance={leaveBalance} />
      )}

      <Card>
        <LeaveStatusFilter filter={filter} setFilter={setFilter} />

        <div className="space-y-4">
          {filteredLeaves.map((leave) => (
            <LeaveCard
              key={leave.id}
              leave={leave}
              userRole={user?.role}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>

        {filteredLeaves.length === 0 && (
          <EmptyState message={t('leaves.noLeaves')} />
        )}
      </Card>

      <ApplyLeaveModal
        show={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleApplyLeave}
        submitting={submitting}
        leaveBalance={leaveBalance}
        calculateDays={calculateDays}
        getAvailableBalance={getAvailableBalance}
        leaveConflicts={leaveConflicts}
        checkingConflicts={checkingConflicts}
        checkLeaveConflicts={checkLeaveConflicts}
      />
    </div>
  );
}
