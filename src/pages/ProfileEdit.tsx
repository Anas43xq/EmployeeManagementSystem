import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { db } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { PageSpinner, Button, Card } from '../components/ui';

interface ProfileFormData {
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export default function ProfileEdit() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadEmployeeProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadEmployeeProfile = async () => {
    try {
      let empId = user?.employeeId;

      if (!empId) {
        const { data: userData, error: userError } = await db
          .from('users')
          .select('employee_id')
          .eq('id', user!.id)
          .maybeSingle();

        const userRecord = userData as { employee_id: string } | null;
        if (userError || !userRecord?.employee_id) {
          setLoading(false);
          return;
        }
        empId = userRecord.employee_id;
      }

      setEmployeeId(empId);

      const { data, error } = await db
        .from('employees')
        .select('phone, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone')
        .eq('id', empId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
        });
      }
    } catch (error) {
      showNotification('error', t('employees.failedToLoadDetails'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    setSaving(true);
    try {
      const { error } = await db
        .from('employees')
        .update({
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.postal_code || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
        })
        .eq('id', employeeId);

      if (error) throw error;

      showNotification('success', t('profile.updateSuccess'));
      navigate('/profile');
    } catch (error) {
      showNotification('error', t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (!employeeId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('profile.noEmployeeRecord')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to="/profile"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('profile.editProfile')}</h1>
          <p className="text-gray-600 mt-1">{t('profile.updateYourInfo')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('profile.contactInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('employees.phone')}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('profile.addressInfo')}</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('employees.address')}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('employees.city')}
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('employees.state')}
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('employees.postalCode')}
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('employees.emergencyContact')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.name')}
              </label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('employees.emergencyPhone')}
              </label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4">
          <Link
            to="/profile"
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            {t('common.cancel')}
          </Link>
          <Button 
            type="submit" 
            loading={saving} 
            icon={<Save className="w-5 h-5" />}
            className="w-full sm:w-auto"
          >
            {saving ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </div>
  );
}
