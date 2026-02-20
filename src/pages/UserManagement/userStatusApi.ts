import { supabase } from '../../lib/supabase';

export interface ManageUserStatusResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: any;
}

export async function banUser(
  userId: string,
  banDuration: string,
  reason?: string
): Promise<ManageUserStatusResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('manage-user-status', {
      body: {
        action: 'ban',
        userId,
        banDuration,
        reason,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      if (error.message?.includes('non-2xx') || error.message?.includes('404')) {
        return {
          success: false,
          error: 'User management service is not available. Please contact your administrator.',
        };
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to ban user',
    };
  }
}

export async function unbanUser(userId: string): Promise<ManageUserStatusResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('manage-user-status', {
      body: {
        action: 'unban',
        userId,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      if (error.message?.includes('non-2xx') || error.message?.includes('404')) {
        return {
          success: false,
          error: 'User management service is not available. Please contact your administrator.',
        };
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to unban user',
    };
  }
}

export async function deactivateUser(userId: string): Promise<ManageUserStatusResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('manage-user-status', {
      body: {
        action: 'deactivate',
        userId,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      if (error.message?.includes('non-2xx') || error.message?.includes('404')) {
        return {
          success: false,
          error: 'User management service is not available. Please contact your administrator.',
        };
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to deactivate user',
    };
  }
}

export async function activateUser(userId: string): Promise<ManageUserStatusResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('manage-user-status', {
      body: {
        action: 'activate',
        userId,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      if (error.message?.includes('non-2xx') || error.message?.includes('404')) {
        return {
          success: false,
          error: 'User management service is not available. Please contact your administrator.',
        };
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to activate user',
    };
  }
}

export async function getUserStatus(userId: string): Promise<ManageUserStatusResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('manage-user-status', {
      body: {
        action: 'get-status',
        userId,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      if (error.message?.includes('non-2xx') || error.message?.includes('404')) {
        return {
          success: false,
          error: 'User management service is not available.',
        };
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get user status',
    };
  }
}
