<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="90" height="90" alt="NestJS Logo" />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://cdn.freebiesupply.com/logos/large/2x/rabbitmq-logo-png-transparent.png" width="85" height="85" alt="RabbitMQ Logo" />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://www.postgresql.org/media/img/about/press/elephant.png" width="90" height="90" alt="PostgreSQL Logo" />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png" width="90" height="90" alt="Kubernetes Logo" />
</p>

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

![Alt](https://repobeats.axiom.co/api/embed/c7f2aabb83bf51e8997007f2580643e45142f1a6.svg 'Repobeats analytics image')

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

## <img src="https://static1.smartbear.co/swagger/media/assets/swagger_fav.png" width="35" height="35" alt="Swagger Logo" style="vertical-align: middle;" /> 

## Swagger OpenAPI

### Swagger UI Access for Auth:

- http://localhost/api/auth/docs
