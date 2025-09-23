// src/pages/TopicDetailPage.tsx

import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ArticleGrid from "../components/ArticleGrid";

// (타입 정의는 이전과 동일)
interface Topic {
  id: number;
  display_name: string;
  summary: string;
}
interface Article {
  id: number;
  source: string;
  side: "LEFT" | "RIGHT";
  title: string;
  url: string;
}

const TopicDetailPage = () => {
  const { topicId } = useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (topicId) {
      const fetchTopicDetails = async () => {
        try {
          const response = await axios.get(`http://localhost:3000/api/topics/${topicId}`);
          setTopic(response.data.topic);
          setArticles(response.data.articles);
        } catch (error) {
          console.error("Error fetching topic details:", error);
        }
      };
      fetchTopicDetails();
    }
  }, [topicId]);

  if (!topic) {
    return <div>Loading...</div>;
  }

  // 기사를 좌/우로 분류
  const leftArticles = articles.filter((a) => a.side === "LEFT");
  const rightArticles = articles.filter((a) => a.side === "RIGHT");

  return (
    <div className="page-container">
      {/* 1. 왼쪽 컬럼 (사이드바) */}
      <aside className="sidebar-left">
        <h2>인기 토픽</h2>
        {/* 여기에 나중에 인기 토픽 목록이 들어옵니다. */}
      </aside>

      {/* 2. 중앙 컬럼 (메인 콘텐츠) */}
      <main className="main-content">
        <Link to="/" className="back-link">
          ← 홈으로 돌아가기
        </Link>

        <header className="detail-header">
          <h1>{topic.display_name}</h1>
          <p>{topic.summary}</p>
        </header>

        <section className="topic-summary">
          <p>{topic.summary}</p>
        </section>

        <div className="articles-grid-container">
          <ArticleGrid title="진보" articles={leftArticles} />
          <ArticleGrid title="보수" articles={rightArticles} />
        </div>

        <section className="comments-section">
          <h2>댓글</h2>
          {/* 여기에 나중에 댓글 기능이 들어옵니다. */}
        </section>
      </main>

      {/* 3. 오른쪽 컬럼 (빈 공간) */}
      <aside className="sidebar-right">{/* 이 공간은 나중에 활용합니다. */}</aside>
    </div>
  );
};

export default TopicDetailPage;
