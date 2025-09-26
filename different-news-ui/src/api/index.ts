// src/api/index.ts
import axios from "axios";
import type { Article, Topic } from "../types";

// API 서버의 기본 주소를 설정합니다.
const apiClient = axios.create({
  baseURL: "http://localhost:3000",
});

// GET /api/topics
export const fetchPublishedTopics = async (): Promise<Topic[]> => {
  const response = await apiClient.get("/api/topics");
  return response.data;
};

// GET /api/topics/:topicId
export const fetchTopicDetails = async (topicId: string): Promise<{ topic: Topic; articles: Article[] }> => {
  const response = await apiClient.get(`/api/topics/${topicId}`);
  return response.data;
};

// --- 관리자용 API ---

// GET /admin/topics/suggested
export const fetchSuggestedTopics = async (): Promise<Topic[]> => {
  const response = await apiClient.get("/admin/topics/suggested");
  return response.data;
};

// ... (이후 다른 모든 API 호출 함수들을 여기에 추가합니다)
