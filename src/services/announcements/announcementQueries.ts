import { db } from '../shared/dbClient';
import type { Announcement } from '../../pages/Announcements/types';

interface AnnouncementPayload {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isActive: boolean;
  expiresAt: string | null;
  createdBy: string | undefined;
}

/** Fetches all announcements ordered by creation date. */
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await (db
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false }) as unknown) as {
    data: Announcement[] | null;
    error: unknown;
  };

  if (error) throw error;
  return data || [];
}

/** Creates a new announcement and returns the created record. */
export async function createAnnouncement(payload: AnnouncementPayload): Promise<Announcement> {
  if (!payload.createdBy) {
    throw new Error('Missing announcement creator');
  }

  const { data, error } = await db
    .from('announcements')
    .insert({
      title: payload.title,
      content: payload.content,
      priority: payload.priority,
      is_active: payload.isActive,
      expires_at: payload.expiresAt,
      created_by: payload.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Announcement;
}

/** Updates an existing announcement by ID. */
export async function updateAnnouncement(
  id: string,
  payload: Partial<AnnouncementPayload>,
): Promise<void> {
  const { error } = await db.from('announcements')
    .update({
      ...(payload.title && { title: payload.title }),
      ...(payload.content && { content: payload.content }),
      ...(payload.priority && { priority: payload.priority }),
      ...(payload.isActive !== undefined && { is_active: payload.isActive }),
      ...(payload.expiresAt !== undefined && { expires_at: payload.expiresAt }),
    })
    .eq('id', id);

  if (error) throw error;
}

/** Deletes an announcement by ID. */
export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await db
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Toggles the active status of an announcement. */
export async function toggleAnnouncementActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await db.from('announcements')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) throw error;
}

export interface WidgetAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
}

/** Fetches active announcements for the dashboard widget, ordered by priority then date. */
export async function getActiveAnnouncementsForWidget(limit = 6): Promise<WidgetAnnouncement[]> {
  const { data, error } = await db
    .from('announcements')
    .select('id, title, content, priority, created_at')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    priority: row.priority as WidgetAnnouncement['priority'],
    createdAt: row.created_at as string,
  }));
}
