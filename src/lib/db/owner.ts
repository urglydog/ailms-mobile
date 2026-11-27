import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { flashcardDb } from '@/lib/db/flashcardDb';

const OWNER_KEY = 'offlineOwnerId';

async function readOwner(): Promise<string | null> {
  if (Platform.OS === 'web') return typeof localStorage !== 'undefined' ? localStorage.getItem(OWNER_KEY) : null;
  return SecureStore.getItemAsync(OWNER_KEY);
}

async function writeOwner(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(OWNER_KEY, id);
    return;
  }
  await SecureStore.setItemAsync(OWNER_KEY, id);
}

async function clearOwner(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(OWNER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(OWNER_KEY);
}

/**
 * Gắn dữ liệu offline (bộ thẻ đã lưu, lượt ôn chưa gửi) với tài khoản đang đăng nhập. Nếu máy đang giữ dữ liệu của một tài khoản KHÁC
 * thì xoá đi trước — tránh người này thấy bộ thẻ của người kia, và tránh gửi lượt ôn của người này lên tài khoản người kia.
 */
export async function claimOfflineStorage(userId: number): Promise<void> {
  const previous = await readOwner();
  if (previous !== null && previous !== String(userId)) await flashcardDb.clearAll();
  await writeOwner(String(userId));
}

/** Đăng xuất: xoá dữ liệu offline của tài khoản này khỏi máy. */
export async function releaseOfflineStorage(): Promise<void> {
  await flashcardDb.clearAll();
  await clearOwner();
}
