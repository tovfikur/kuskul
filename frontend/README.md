# KusKul Frontend

A comprehensive school management system frontend built with React, TypeScript, MUI, and Tailwind CSS.

## 🚀 Features

- **Modern Stack**: React 19, TypeScript, Vite.
- **UI Framework**: Material UI (v6) integrated with Tailwind CSS (v4).
- **State Management**: Redux Toolkit.
- **Routing**: React Router v7.
- **Architecture**: Atomic design principles, modular features.
- **Testing**: Vitest (Unit), Playwright (E2E).
- **Documentation**: Storybook.

## 🛠️ Setup

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Environment Variables**
    Copy `.env.example` to `.env` and set your API URL:

    ```env
    VITE_API_BASE_URL=http://localhost:8000/api/v1
    ```

3.  **Run Development Server**

    ```bash
    npm run dev
    ```

4.  **Run Tests**

    - Unit Tests: `npm test`
    - E2E Tests: `npx playwright test`

5.  **Storybook**
    - Run: `npm run storybook`
    - _Note_: If you encounter issues with `@vitest/browser-playwright`, ensure your `vitest` version matches the plugin requirements.

## 🏗️ Architecture

- `src/api`: Axios instance and API service definitions.
- `src/app`: Redux store and hooks.
- `src/components`: Reusable UI components (Atomic design).
- `src/features`: Redux slices and feature-specific components.
- `src/layouts`: Page layouts (Main, Auth).
- `src/pages`: Route entry components.
- `src/theme`: MUI theme configuration.

## 🚢 CI/CD

This project is ready for CI/CD pipelines (GitHub Actions, GitLab CI).
Basic steps for a pipeline:

1.  **Checkout Code**
2.  **Install Node.js**
3.  **Install Dependencies** (`npm ci`)
4.  **Lint** (`npm run lint`)
5.  **Build** (`npm run build`)
6.  **Test** (`npm test`)
7.  **E2E Test** (`npx playwright install && npx playwright test`)
8.  **Deploy** (e.g., to Vercel, Netlify, or AWS S3)

## 📱 Mobile Native Feel

The `MainLayout` implements a responsive sidebar that acts as a navigation drawer on mobile devices, providing a native app-like experience.
