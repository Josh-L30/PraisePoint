import { createBrowserRouter, RouterProvider } from 'react-router';
import { OfflineLibraryPage } from './OfflineLibraryPage';
import { OfflineServicePage } from './OfflineServicePage';
const router = createBrowserRouter([
  { path: '/offline', element: <OfflineLibraryPage /> },
  { path: '/offline/:packageId', element: <OfflineServicePage /> },
]);
export function OfflineApp() {
  return <RouterProvider router={router} />;
}
