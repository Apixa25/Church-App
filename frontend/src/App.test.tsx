import React from 'react';
import App from './App';

jest.mock('axios', () => {
  const client = Object.assign(jest.fn(), {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  });

  return {
    __esModule: true,
    default: Object.assign(jest.fn(), {
      create: jest.fn(() => client),
    }),
  };
}, { virtual: true });

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return <>{children}</>;
  },
  Routes: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return <>{children}</>;
  },
  Route: () => null,
  Navigate: () => null,
  Link: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return <>{children}</>;
  },
  NavLink: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return <>{children}</>;
  },
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}), { virtual: true });

test('loads the app shell component', () => {
  expect(App).toBeDefined();
  expect(React.isValidElement(<App />)).toBe(true);
});
