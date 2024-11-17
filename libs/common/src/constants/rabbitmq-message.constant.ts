export const enum MessagePatterns {
  auth_register = 'auth.register',
  auth_login = 'auth.login',
  auth_verify = 'auth.verify',
  auth_refresh = 'auth.refresh',
  auth_profile = 'auth.profile',

  user_create = 'user.create',
  user_regstration_failed = 'user.regstation.failed',
  user_get = 'user.get',
  user_update = 'user.update',
  user_delete = 'user.delete',

  event_create = 'event.create',
  event_get = 'event.get',
  event_get_all = 'event.get.all',
  event_update = 'event.update',
  event_delete = 'event.delete',
  event_check_availability = 'event.check.availability',

  booking_create = 'booking.create',
  booking_get = 'booking.get',
  booking_get_user = 'booking.get.user',
  booking_update = 'booking.update',
}
