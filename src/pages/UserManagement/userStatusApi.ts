import {
  banManagedUser,
  unbanManagedUser,
  deactivateManagedUser,
  activateManagedUser,
  getManagedUserStatus,
  type ManageUserStatusResult,
} from '../../services/users';

export type { ManageUserStatusResult };

export async function banUser(
  userId: string,
  banDuration: string,
  reason?: string
): Promise<ManageUserStatusResult> {
  return banManagedUser(userId, banDuration, reason);
}

export async function unbanUser(userId: string): Promise<ManageUserStatusResult> {
  return unbanManagedUser(userId);
}

export async function deactivateUser(userId: string): Promise<ManageUserStatusResult> {
  return deactivateManagedUser(userId);
}

export async function activateUser(userId: string): Promise<ManageUserStatusResult> {
  return activateManagedUser(userId);
}

export async function getUserStatus(userId: string): Promise<ManageUserStatusResult> {
  return getManagedUserStatus(userId);
}
