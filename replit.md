# Overview

This is a React-based chatbot management frontend application designed to interact with a Django backend API for managing WhatsApp bot operations. The application provides a comprehensive interface for managing contacts, configuring system prompts, viewing chat histories, and managing team users with role-based access control. It features a modern tech stack including React 18, TypeScript, Tailwind CSS with shadcn/ui components, and Tanstack Query for state management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with protected routes based on user roles
- **State Management**: Tanstack React Query for server state management and caching
- **UI Framework**: Tailwind CSS with shadcn/ui component library providing a consistent design system
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Authentication**: Context-based authentication system with JWT tokens stored in HTTP-only cookies

## Backend Integration
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with cookie storage and role-based access control
- **API Structure**: RESTful API with Express.js server following standard HTTP methods
- **Session Management**: Cookie-based session handling with secure HTTP-only cookies
- **Database Connection**: Neon Database serverless PostgreSQL instance

## Component Architecture
- **Layout System**: Sidebar navigation with protected layout wrapper ensuring proper authentication
- **Page Structure**: Role-based page access with ADMIN, EDITOR, and VIEWER permission levels
- **Component Organization**: Modular UI components using shadcn/ui with custom business logic components

## Data Models
- **Users**: Team management with role-based permissions and authentication
- **Contacts**: WhatsApp contact management with admin requirement toggles
- **Bot Settings**: System prompt configuration and bot status management
- **Chat Messages**: Conversation history tracking with user/assistant role distinction

## Security Features
- **Authentication Middleware**: Server-side JWT verification for protected routes
- **Role-based Access Control**: Different permission levels for various application features
- **Cookie Security**: HTTP-only cookies for secure session management
- **Input Validation**: Zod schemas for both client and server-side validation

# External Dependencies

## Database and ORM
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database queries with PostgreSQL dialect
- **Database Migrations**: Drizzle-kit for schema migrations and database management

## UI and Styling
- **shadcn/ui**: Complete component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Radix UI**: Unstyled, accessible UI primitives for complex components
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Fast build tool with hot module replacement for development
- **TypeScript**: Static type checking for improved developer experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment with runtime error overlay and cartographer plugin

## Authentication and Validation
- **JSON Web Tokens**: Secure authentication token standard
- **Zod**: TypeScript-first schema validation library
- **Cookie Parser**: Express middleware for handling HTTP cookies

## State Management and HTTP
- **Tanstack React Query**: Server state management with caching and synchronization
- **Wouter**: Minimalist client-side routing library
- **Fetch API**: Native browser HTTP client with credential support