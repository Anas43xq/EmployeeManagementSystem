

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAllFAQs, createFAQ, updateFAQ, deleteFAQ, type FAQ, type CreateFAQInput } from '../../../services/faq';
import { FAQForm } from './FAQForm';

export const FAQManagement = () => {
  const { t } = useTranslation();
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  
  const loadFAQs = async () => {
    try {
      setLoading(true);
      const data = await getAllFAQs();
      setFAQs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
      console.error('Error loading FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFAQs();
  }, []);

  
  const handleCreate = async (input: CreateFAQInput) => {
    try {
      await createFAQ(input);
      setSuccess(t('faq.faqCreated') || 'FAQ created successfully');
      setShowForm(false);
      await loadFAQs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create FAQ';
      setError(msg);
      console.error('Error creating FAQ:', err);
    }
  };

  
  const handleUpdate = async (id: string, input: Partial<CreateFAQInput>) => {
    try {
      await updateFAQ({ id, ...input } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      setSuccess(t('faq.faqUpdated') || 'FAQ updated successfully');
      setEditingFAQ(null);
      await loadFAQs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update FAQ';
      setError(msg);
      console.error('Error updating FAQ:', err);
    }
  };

  
  const handleDelete = async (id: string) => {
    if (!window.confirm(t('faq.confirmDeleteFaq') || 'Are you sure you want to delete this FAQ?')) return;
    try {
      await deleteFAQ(id);
      setSuccess(t('faq.faqDeleted') || 'FAQ deleted successfully');
      await loadFAQs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete FAQ';
      setError(msg);
      console.error('Error deleting FAQ:', err);
    }
  };

  
  const filteredFAQs = faqs.filter(faq => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  
  if (showForm || editingFAQ) {
    return (
      <FAQForm
        faq={editingFAQ}
        onSubmit={editingFAQ ? (input) => handleUpdate(editingFAQ.id, input) : handleCreate}
        onCancel={() => {
          setShowForm(false);
          setEditingFAQ(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('faq.manageFaqs') || 'Manage FAQs'}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('faq.manageFaqsDesc') || 'Create, edit, and manage FAQs for all users'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          {t('faq.addFaq') || 'Add FAQ'}
        </button>
      </div>

      {}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-sm text-green-800 dark:text-green-300">{success}</span>
        </div>
      )}

      {}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {}
      <div className="relative">
        <input
          type="text"
          placeholder={t('faq.searchFaqs') || 'Search FAQs...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? t('faq.noResultsSearch') || 'No FAQs found' : t('faq.noFaqsAdmin') || 'No FAQs yet. Create one to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-start px-6 py-4 font-semibold text-gray-900 dark:text-white">{t('faq.question') || 'Question'}</th>
                  <th className="text-start px-6 py-4 font-semibold text-gray-900 dark:text-white">{t('faq.category') || 'Category'}</th>
                  <th className="text-start px-6 py-4 font-semibold text-gray-900 dark:text-white">{t('faq.languages') || 'Languages'}</th>
                  <th className="text-start px-6 py-4 font-semibold text-gray-900 dark:text-white">{t('faq.visibleTo') || 'Visible To'}</th>
                  <th className="text-end px-6 py-4 font-semibold text-gray-900 dark:text-white">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFAQs.map((faq) => {
                  
                  const hasEnglish = faq.content && faq.content.en && faq.content.en.question?.trim().length > 0;
                  const hasArabic = faq.content && faq.content.ar && faq.content.ar.question?.trim().length > 0;

                  return (
                    <tr
                      key={faq.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{faq.question}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                          {faq.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {hasEnglish && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              🇬🇧 EN
                            </span>
                          )}
                          {hasArabic && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                              🇸🇦 AR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {faq.visible_to.map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingFAQ(faq)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary/10 dark:hover:bg-primary/20 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                            {t('common.edit') || 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDelete(faq.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete') || 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {}
      {filteredFAQs.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {t('faq.showing') || 'Showing'} {filteredFAQs.length} {t('faq.of') || 'of'} {faqs.length} {t('faq.faqs') || 'FAQs'}
        </div>
      )}
    </div>
  );
};

export default FAQManagement;
