export const patterns = {
  auth: {
    register: 'auth.register',
    login: 'auth.login',
    validate: 'auth.validate',
  },
  user: {
    create: 'user.create',
    get: 'user.get',
    validate: 'user.validate',
  },
} as const;
