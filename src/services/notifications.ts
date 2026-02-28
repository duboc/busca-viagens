/**
 * Browser Notification API wrapper for SkyAgent price alerts.
 */

/**
 * Check if the Notifications API is available in the current browser.
 */
export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Request notification permission from the user.
 * Returns true if permission is granted, false otherwise.
 */
export async function requestPermission(): Promise<boolean> {
  if (!isSupported()) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Get the current notification permission status.
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Show a browser notification.
 * If a URL is provided, clicking the notification navigates to that URL.
 */
export function showNotification(
  title: string,
  body: string,
  options?: { icon?: string; url?: string },
): void {
  if (!isSupported()) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: options?.icon ?? '/favicon.svg',
    badge: '/favicon.svg',
  });

  if (options?.url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.url!;
      notification.close();
    };
  }
}
