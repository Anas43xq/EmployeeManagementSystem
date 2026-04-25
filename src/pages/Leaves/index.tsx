import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PageSpinner, PageHeader, Card, EmptyState, Button } from '../../components/ui';
import { useLeaveBalance } from './useLeaveBalance';
import { useLeaveApply } from './useLeaveApply';
import { useLeaveApproval } from './useLeaveApproval';
import { useAuth } from '../../contexts/AuthContext';
import LeaveBalanceCards from './LeaveBalanceCards';
import LeaveStatusFilter from './LeaveStatusFilter';
import LeaveCard from './LeaveCard';
import ApplyLeaveModal from './ApplyLeaveModal';

export default function Leaves() {
  const { t } = useTranslation();
  const { user } = useAuth();

  
  const { leaveBalance, getAvailableBalance, calculateDays, updateLeaveBalanceField } = useLeaveBalance();

  
  const {
    showApplyModal,
    setShowApplyModal,
    formData,
    setFormData,
    submitting,
    leaveConflicts,
    checkingConflicts,
    checkLeaveConflicts,
    handleApplyLeave: handleApplyLeaveBase,
  } = useLeaveApply();

  
  const {
    loading,
    filter,
    setFilter,
    filteredLeaves,
    handleApprove: handleApproveBase,
    handleReject,
    processingLeaves,
  } = useLeaveApproval();

  
  const handleApplyLeave = async (e: React.FormEvent) => {
    await handleApplyLeaveBase(e, calculateDays, getAvailableBalance);
  };

  
  const handleApprove = async (leaveId: string) => {
    await handleApproveBase(leaveId, updateLeaveBalanceField);
  };

  
  const handleRejectWrapper = async (leaveId: string) => {
    await handleReject(leaveId, updateLeaveBalanceField);
  };

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
              onReject={handleRejectWrapper}
              processingLeaves={processingLeaves}
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
