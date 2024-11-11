<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://github.com/kubernetes/kubernetes/raw/master/logo/logo.png" width="110" alt="Kubernetes Logo">
</p>

# E-Hive NestJS Microservices with Kubernetes

## Architecture

- 🔐 Auth Service: Handles authentication
- 👤 User Service: Manages user profiles and data
- 📅 Event Service: Event creation and management
- 📚 Booking Service: Handles booking operations
- ⚙️ Operation Service: Helping with additional services

## Tech Stack

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

## Project Structure

.
├── apps/
│ ├── auth/ # Authentication microservice
│ ├── booking/ # Booking management
│ ├── event/ # Event management
│ ├── operation/ # Operations service
│ └── user/ # User management
├── libs/
│ ├── postgres/ # Shared PostgreSQL module
│ └── rabbitmq/ # Shared RabbitMQ module
└── k8s/ # Kubernetes configurations
├── auth/
├── booking/
├── event/
├── nginx/
├── operation/
├── postgres/
├── rabbitmq/
└── user/
