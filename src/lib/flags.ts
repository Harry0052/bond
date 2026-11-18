/**
 * External deliveries and account connections are not configured.
 * These flags are constants so a screen cannot turn them on by accident.
 */
export const flags = {
  emailDelivery: false,
  smsDelivery: false,
  pushNotifications: false,
  contactsSync: false,
  calendarAccountSync: false,
  payments: false,
  escrow: false,
  oauth: false,
  icsDownload: true,
  inAppReminders: true,
} as const;
