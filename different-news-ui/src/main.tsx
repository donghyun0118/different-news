// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import AdminPage from "./pages/AdminPage.tsx";
import AdminTopicDetailPage from "./pages/AdminTopicDetailPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import TopicDetailPage from "./pages/TopicDetailPage.tsx";

// 라우터 설정을 정의합니다.
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />, // 기본 경로('/')에서는 HomePage를 보여줍니다.
  },
  {
    path: "/topics/:topicId", // /topics/1, /topics/2 와 같은 동적 경로
    element: <TopicDetailPage />, // 에서는 TopicDetailPage를 보여줍니다.
  },
  {
    path: "/admin", // '/admin' 경로 추가
    element: <AdminPage />,
  },
  {
    path: "/admin/topics/:topicId", // [신규] 기사 선별 페이지 경로
    element: <AdminTopicDetailPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
