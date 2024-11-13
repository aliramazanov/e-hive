export const enum MessagePatterns {
  auth_register = 'auth.register',
  auth_login = 'auth.login',
  auth_validate = 'auth.validate',
  auth_refresh = 'auth.refresh',
  auth_profile = 'auth.profile',

  user_create = 'user.create',
  user_regstration_failed = 'user.regstation_failed',
  user_get = 'user.get',
  user_update = 'user.update',

  event_create = 'event.create',
  event_get = 'event.get',
  event_get_all = 'event.get_all',
  event_update = 'event.update',
  event_delete = 'event.delete',

  booking_create = 'booking.create',
  booking_get = 'booking.get',
  booking_get_user = 'booking.get_user',
  booking_update = 'booking.update',
}
