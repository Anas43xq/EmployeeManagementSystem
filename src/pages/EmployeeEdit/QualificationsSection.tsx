import { useTranslation } from 'react-i18next';
import { PlusCircle, Trash2, GraduationCap } from 'lucide-react';
import type { EmployeeFormData, Qualification } from './types';

interface QualificationsSectionProps {
  formData: EmployeeFormData;
  onAdd: () => void;
  onUpdate: (index: number, field: keyof Qualification, value: string) => void;
  onRemove: (index: number) => void;
}

export default function QualificationsSection({ formData, onAdd, onUpdate, onRemove }: QualificationsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <GraduationCap className="w-5 h-5 mr-2" />
          {t('employees.qualifications')}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('common.add')}</span>
        </button>
      </div>

      {formData.qualifications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('employees.noQualifications', 'No qualifications added yet.')}</p>
      ) : (
        <div className="space-y-4">
          {formData.qualifications.map((qual, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start border border-gray-100 rounded-lg p-3 bg-gray-50">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('employees.degree', 'Degree / Certificate')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={qual.degree}
                  onChange={e => onUpdate(index, 'degree', e.target.value)}
                  placeholder={t('forms.exampleDegree', 'e.g. B.Sc. Computer Science')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('employees.institution', 'Institution')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={qual.institution}
                  onChange={e => onUpdate(index, 'institution', e.target.value)}
                  placeholder={t('forms.exampleInstitution', 'e.g. MIT')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('employees.year', 'Year')}
                  </label>
                  <input
                    type="text"
                    value={qual.year || ''}
                    onChange={e => onUpdate(index, 'year', e.target.value)}
                    placeholder={t('forms.exampleYear', 'e.g. 2020')}
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="mb-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
