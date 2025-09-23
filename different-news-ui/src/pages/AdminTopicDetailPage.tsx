// src/pages/AdminTopicDetailPage.tsx
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface Topic {
  id: number;
  display_name: string;
  collection_status: string | null;
}
interface Article {
  id: number;
  title: string;
  source: string;
  status: "suggested" | "published" | "rejected";
}

const AdminTopicDetailPage = () => {
  const { topicId } = useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  // [수정] fetchData 함수를 useCallback으로 감싸서 컴포넌트의 최상위 레벨에 정의합니다.
  const fetchData = useCallback(async () => {
    if (!topicId) return;
    try {
      const [topicRes, articlesRes] = await Promise.all([
        axios.get(`http://localhost:3000/api/topics/${topicId}`),
        axios.get(`http://localhost:3000/admin/topics/${topicId}/articles`),
      ]);
      setTopic(topicRes.data.topic);
      setAllArticles(articlesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [topicId]); // topicId가 바뀔 때만 이 함수를 새로 만듭니다.

  useEffect(() => {
    fetchData(); // 페이지 로드 시 즉시 실행

    // 5초마다 fetchData 함수를 반복해서 호출하는 '폴링(Polling)' 설정
    const intervalId = setInterval(fetchData, 5000);

    // 컴포넌트가 화면에서 사라질 때 반복을 중단시킴 (메모리 누수 방지)
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handlePublishArticle = async (articleId: number) => {
    try {
      await axios.patch(`http://localhost:3000/admin/articles/${articleId}/publish`);
      alert("기사 발행 성공!");
      // 이제 handlePublishArticle 함수에서도 fetchData를 정상적으로 호출할 수 있습니다.
      fetchData();
    } catch (error) {
      console.error("Error publishing article:", error);
      alert("기사 발행 실패");
    }
  };

  const handleUnpublishArticle = async (articleId: number) => {
    try {
      await axios.patch(`http://localhost:3000/admin/articles/${articleId}/unpublish`);
      alert("기사 발행 취소 성공!");
      fetchData();
    } catch (error) {
      console.error("Error unpublishing article:", error);
      alert("기사 발행 취소 실패");
    }
  };

  // [신규] 삭제 핸들러
  const handleDeleteArticle = async (articleId: number) => {
    if (window.confirm("정말로 이 기사 후보를 삭제하시겠습니까?")) {
      try {
        await axios.delete(`http://localhost:3000/admin/articles/${articleId}`);
        alert("기사 후보 삭제 성공!");
        fetchData();
      } catch (error) {
        console.error("Error deleting article:", error);
        alert("기사 후보 삭제 실패");
      }
    }
  };

  const suggestedArticles = allArticles.filter((a) => a.status === "suggested");
  const publishedArticles = allArticles.filter((a) => a.status === "published");

  if (!topic) {
    return <div>Loading...</div>;
  }

  // [신규] collection_status 값에 따라 다른 메시지를 보여주는 컴포넌트
  const StatusIndicator = ({ status }: { status: string | null }) => {
    if (status === "collecting") {
      return <div className="status-indicator collecting">🔄 기사 수집 중... (페이지가 곧 자동 새로고침됩니다)</div>;
    }
    if (status === "completed") {
      return <div className="status-indicator completed">✅ 최신 기사 수집 완료</div>;
    }
    if (status === "failed") {
      return <div className="status-indicator failed">❌ 기사 수집 실패</div>;
    }
    return null; // 'pending' 상태 등에서는 아무것도 보여주지 않음
  };

  return (
    <div className="admin-container">
      <Link to="/admin" className="back-link">
        ← 토픽 목록으로
      </Link>
      <h1>기사 선별: {topic.display_name}</h1>
      <StatusIndicator status={topic.collection_status} />

      <div className="curation-grid">
        <div className="curation-column">
          <h2>후보 기사 목록 ({suggestedArticles.length}개)</h2>
          {suggestedArticles.map((article) => (
            <div key={article.id} className="curation-item">
              <div>
                <strong>{article.title}</strong>
                <br />
                <small>{article.source}</small>
              </div>
              <div className="curation-actions">
                <button onClick={() => handlePublishArticle(article.id)} className="publish-btn">
                  발행
                </button>
                <button onClick={() => handleDeleteArticle(article.id)} className="delete-btn">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="curation-column">
          <h2>발행된 기사 목록 ({publishedArticles.length}개)</h2>
          {publishedArticles.map((article) => (
            <div key={article.id} className="curation-item published-item">
              <div>
                <strong>{article.title}</strong>
                <br />
                <small>{article.source}</small>
              </div>
              <div className="curation-actions">
                <button onClick={() => handleUnpublishArticle(article.id)} className="unpublish-btn">
                  발행 취소
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminTopicDetailPage;
