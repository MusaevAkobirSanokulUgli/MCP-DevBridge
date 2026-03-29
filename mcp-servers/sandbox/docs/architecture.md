# Architecture

## Overview

The application follows a layered architecture pattern:

1. **Presentation Layer** - React components
2. **API Layer** - Express REST endpoints
3. **Business Logic Layer** - Service classes
4. **Data Access Layer** - Database queries

## Data Flow

Client -> API Gateway -> Service -> Repository -> Database

## Security

- JWT authentication
- RBAC authorization
- Input validation with Zod
- Rate limiting
