// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import AdminPage from "./pages/Admin/AdminPage";
import AdminTopicDetailPage from "./pages/Admin/AdminTopicDetailPage"; // index.tsx는 생략 가능
import AdminTopicEditPage from "./pages/Admin/AdminTopicEditPage";
import AdminTopicCreatePage from "./pages/Admin/AdminTopicCreatePage";
import HomePage from "./pages/Public/HomePage";
import TopicDetailPage from "./pages/Public/TopicDetailPage";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/topics/:topicId", element: <TopicDetailPage /> },
  { path: "/admin", element: <AdminPage /> },
  { path: "/admin/topics/:topicId", element: <AdminTopicDetailPage /> },
  {
    path: "/admin/topics/:topicId/edit",
    element: <AdminTopicEditPage />,
  },
  {
    path: "/admin/topics/new",
    element: <AdminTopicCreatePage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
