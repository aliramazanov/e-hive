export const enum QueueName {
  auth = 'auth_queue',
  user = 'user_queue',
  event = 'event_queue',
  booking = 'booking_queue',
}

export const enum VirtualHost {
  auth = '/auth-service',
  user = '/user-service',
  event = '/event-service',
  booking = '/booking-service',
}

export interface QueueConfig {
  name: QueueName;
  vhost: VirtualHost;
}

export const Queue_Configurations: Record<QueueName, QueueConfig> = {
  [QueueName.auth]: {
    name: QueueName.auth,
    vhost: VirtualHost.auth,
  },
  [QueueName.user]: {
    name: QueueName.user,
    vhost: VirtualHost.user,
  },
  [QueueName.event]: {
    name: QueueName.event,
    vhost: VirtualHost.event,
  },
  [QueueName.booking]: {
    name: QueueName.booking,
    vhost: VirtualHost.booking,
  },
};
