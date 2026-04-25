import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type FAQ } from '../../../services/faq';
import type { CreateFAQInput, BilingualContent } from '../../../services/faq';

const CATEGORIES = [
  'Account & Access',
  'Leave & Attendance',
  'Payroll & Benefits',
  'Technical Support',
  'Policies & Guidelines',
  'Performance & Evaluation',
  'General',
];

const ROLES = ['admin', 'hr', 'staff'];

interface FAQFormProps {
  faq?: FAQ | null;
  onSubmit: (input: CreateFAQInput) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  content: BilingualContent;
  category: string;
  visible_to: string[];
  faq_order: number;
}

export const FAQForm = ({ faq, onSubmit, onCancel }: FAQFormProps) => {
  const { t } = useTranslation();

  // Initialize form with bilingual content
  const [formData, setFormData] = useState<FormState>({
    content: faq?.content || {
      en: { question: '', answer: '' },
      ar: { question: '', answer: '' },
    },
    category: (faq?.category && CATEGORIES.includes(faq.category)) ? faq.category : 'General',
    visible_to: faq?.visible_to || ['staff', 'hr', 'admin'],
    faq_order: faq?.faq_order || 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState(false);

  const handleContentChange = (language: 'en' | 'ar', field: 'question' | 'answer', value: string) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [language]: {
          ...prev.content[language],
          [field]: value,
        },
      },
    }));
  };

  const handleChange = (field: keyof Omit<FormState, 'content'>, value: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      visible_to: prev.visible_to.includes(role)
        ? prev.visible_to.filter(r => r !== role)
        : [...prev.visible_to, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - both languages required
    if (!formData.content.en.question.trim()) {
      setError(t('faq.englishQuestionRequired') || 'English question is required');
      return;
    }
    if (!formData.content.en.answer.trim()) {
      setError(t('faq.englishAnswerRequired') || 'English answer is required');
      return;
    }
    if (!formData.content.ar.question.trim()) {
      setError(t('faq.arabicQuestionRequired') || 'Arabic question is required');
      return;
    }
    if (!formData.content.ar.answer.trim()) {
      setError(t('faq.arabicAnswerRequired') || 'Arabic answer is required');
      return;
    }
    if (formData.visible_to.length === 0) {
      setError(t('faq.selectAtLeastOneRole') || 'Select at least one role');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData as CreateFAQInput);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {faq ? (t('faq.editFaq') || 'Edit FAQ') : (t('faq.createFaq') || 'Create FAQ')}
        </h1>
        <button
          onClick={onCancel}
          title={t('common.cancel') || 'Cancel'}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-6 w-6 text-gray-500" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Bilingual Content Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('faq.bilingualContent') || 'Bilingual Content'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('faq.faqBothLanguagesRequired') || 'Questions and answers must be provided in both English and Arabic'}
          </p>

          {/* Two-column layout for languages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* English Section */}
            <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                {t('faq.english') || 'English'}
              </h3>

              {/* English Question */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {t('question') || 'Question'} *
                </label>
                <input
                  type="text"
                  value={formData.content.en.question}
                  onChange={(e) => handleContentChange('en', 'question', e.target.value)}
                  placeholder={t('faq.enterQuestionEnglish') || 'Enter FAQ question...'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>

              {/* English Answer */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {t('answer') || 'Answer'} *
                </label>
                <textarea
                  value={formData.content.en.answer}
                  onChange={(e) => handleContentChange('en', 'answer', e.target.value)}
                  placeholder={t('faq.enterAnswerEnglish') || 'Enter detailed answer...'}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Arabic Section */}
            <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-amber-50 dark:bg-gray-900/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-amber-500 rounded-full"></span>
                {t('faq.arabic') || 'العربية'}
              </h3>

              {/* Arabic Question */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {t('question') || 'Question'} *
                </label>
                <input
                  type="text"
                  value={formData.content.ar.question}
                  onChange={(e) => handleContentChange('ar', 'question', e.target.value)}
                  placeholder={t('faq.enterQuestionArabic') || 'أدخل السؤال...'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  dir="rtl"
                  disabled={loading}
                />
              </div>

              {/* Arabic Answer */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {t('answer') || 'Answer'} *
                </label>
                <textarea
                  value={formData.content.ar.answer}
                  onChange={(e) => handleContentChange('ar', 'answer', e.target.value)}
                  placeholder={t('faq.enterAnswerArabic') || 'أدخل الإجابة المفصلة...'}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none text-right"
                  dir="rtl"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {t('faq.category') || 'Category'} *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          >
            {[...new Set([...CATEGORIES, formData.category])].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Order Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {t('faq.displayOrder') || 'Display Order'}
          </label>
          <input
            type="number"
            value={formData.faq_order || 0}
            onChange={(e) => handleChange('faq_order', parseInt(e.target.value) || 0)}
            min="0"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('faq.lowerOrderAppearsFirst') || 'Lower order appears first'}
          </p>
        </div>

        {/* Visible To (Roles) */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {t('faq.visibleToRoles') || 'Visible To Roles'} *
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExpandedRoles(!expandedRoles)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>
                {formData.visible_to.length === 0
                  ? t('faq.selectRoles') || 'Select roles...'
                  : `${formData.visible_to.length} role(s) selected`}
              </span>
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedRoles ? 'rotate-180' : ''}`} />
            </button>

            {expandedRoles && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                {ROLES.map(role => (
                  <label
                    key={role}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={formData.visible_to.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      disabled={loading}
                    />
                    <span className="text-gray-900 dark:text-white font-medium capitalize">{role}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {faq ? (t('faq.updateFaq') || 'Update FAQ') : (t('faq.createFaq') || 'Create FAQ')}
          </button>
        </div>
      </form>
    </div>
  );
};
