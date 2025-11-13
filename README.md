# Optimetric Frontend

A scalable React + TypeScript application built with Vite, following clean architecture principles.

## 🚀 Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **ESLint** - Code linting with Airbnb config
- **Prettier** - Code formatting

## 📁 Project Structure

The project follows Feature-Sliced Design (FSD) architecture principles:

```
src/
├── app/              # App shell, router, providers, layout
├── shared/           # Shared UI atoms, utils, hooks
│   ├── ui/          # Reusable UI components
│   ├── utils/       # Utility functions
│   └── hooks/       # Shared React hooks
├── entities/         # Domain models (User, Repo, Commit...)
├── features/         # User actions (Login, Filter, Org select)
├── widgets/          # Reusable composite UI (RepoTable, Header)
├── pages/            # Route-level pages
├── processes/        # Multi-step flows (Onboarding, Sync)
├── resources/        # i18n, icons, assets
└── test/             # Test helpers and mocks
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

## 📝 Code Style

- **ESLint**: Airbnb configuration with TypeScript support
- **Prettier**: Consistent code formatting
- **Import Order**: Automatically sorted imports

## 🌿 Git Branches

- `main` - Production-ready code
- `develop` - Development branch

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🏗️ Architecture Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Reusability**: Shared components and utilities in `shared/`
3. **Feature Isolation**: Features are self-contained in `features/`
4. **Domain Modeling**: Business entities in `entities/`
5. **Composition**: Widgets compose features and entities

## 📚 Learn More

- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Tailwind CSS Documentation](https://tailwindcss.com)
