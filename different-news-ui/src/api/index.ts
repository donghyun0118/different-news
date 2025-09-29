// src/api/index.ts
import axios from "axios";
import type { Article, Topic } from "../types";

// API ?�버??기본 주소�??�정?�니??
export const apiClient = axios.create({
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

// --- 관리자??API ---

// GET /admin/topics/suggested
export const fetchSuggestedTopics = async (): Promise<Topic[]> => {
  const response = await apiClient.get("/admin/topics/suggested");
  return response.data;
};

// ... (?�후 ?�른 모든 API ?�출 ?�수?�을 ?�기??추�??�니??

