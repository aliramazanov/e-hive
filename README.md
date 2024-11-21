<div style="display: flex; flex-direction: row; align-items: center; gap: 40px; padding: 20px; justify-content:center">
  <div style="width: 120px; height: 120px; display: flex; align-items: center; justify-content: center;">
    <img src="https://nestjs.com/img/logo-small.svg" 
         alt="NestJS Logo" 
         style="max-width: 100%; max-height: 100%; object-fit: contain;">
  </div>
  
  <div style="width: 120px; height: 120px; display: flex; align-items: center; justify-content: center;">
    <img src="https://cdn.freebiesupply.com/logos/large/2x/rabbitmq-logo-png-transparent.png"
         alt="RabbitMQ Logo" 
         style="max-width: 90%; max-height: 90%; object-fit: contain;">
  </div>
  
  <div style="width: 120px; height: 120px; display: flex; align-items: center; justify-content: center;">
    <img src="https://www.postgresql.org/media/img/about/press/elephant.png" 
         alt="PostgreSQL Logo" 
         style="max-width: 85%; max-height: 85%; object-fit: contain;">
  </div>
  
  <div style="width: 120px; height: 120px; display: flex; align-items: center; justify-content: center;">
    <img src="https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png" 
         alt="Kubernetes Logo" 
         style="max-width: 80%; max-height: 80%; object-fit: contain;">
  </div>
</div>

# E-Hive

## NestJS Microservices with Kubernetes

## Architecture:

- Auth Service: Handles authentication
- User Service: Manages user profiles and data
- Event Service: Event creation and management
- Booking Service: Handles booking operations

## Tech Stack:

- Built On: Node.js
- Framework: NestJS
- ORM: TypeORM
- Database: PostgreSQL
- Message Layer: RabbitMQ
- Containerization: Docker
- Orchestration: Kubernetes
- Infrastructure: NGINX Ingress
- Dev Tools: Skaffold
- Authentication: JWT with Passport
- Email Service: Nodemailer & OAuth 2.0

![Alt](https://repobeats.axiom.co/api/embed/c7f2aabb83bf51e8997007f2580643e45142f1a6.svg 'Repo analytics image')

## Note on Secret Files

- ⚠️ A quick note: The secret files in this repository are provided for being an example only
- ⚠️ In a real production environment, you should never commit actual secret files to Git

## Services

### Auth Service

- The Auth Service is responsible for sign-up, login, and token management using JWT.
- It communicates with other microservices over RabbitMQ for decoupled messaging.

#### Configuration for Email Secrets

You need to configure `email-config.yaml` file and create your own `email-secret.yaml` to securely handle email credentials. Here's how to configure it:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: email-secret
type: Opaque
stringData:
  GMAIL_CLIENT_ID: 'your-client-id.apps.googleusercontent.com'
  GMAIL_CLIENT_SECRET: 'your-client-secret'
  GMAIL_REFRESH_TOKEN: 'your-refresh-token'
```

## Swagger OpenAPI

### <img src="https://pbs.twimg.com/profile_images/1451297216187011072/xLd1JSZk_400x400.png" width="45" style="margin-bottom:5px; vertical-align:middle;" alt="Swagger Logo">&nbsp;&nbsp;Swagger UI Access:

- http://localhost/api/auth/docs
