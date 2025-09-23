import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// DB `topics` 테이블의 데이터 타입을 정의합니다.
interface Topic {
  id: number;
  core_keyword: string;
  sub_description: string;
  status: "suggested" | "published" | "rejected";
}

// 수정 모드일 때 사용할 데이터 타입을 별도로 정의합니다.
interface EditingTopic {
  id: number;
  displayName: string;
  searchKeywords: string;
}

const AdminPage = () => {
  // '제안된' 토픽 목록을 저장할 상태 변수입니다.
  const [suggestedTopics, setSuggestedTopics] = useState<Topic[]>([]);
  // 현재 수정 중인 토픽의 정보를 저장할 상태 변수입니다.
  const [editingTopic, setEditingTopic] = useState<EditingTopic | null>(null);

  // 백엔드 API를 호출하여 제안된 토픽 목록을 가져오는 함수입니다.
  const fetchSuggestedTopics = async () => {
    try {
      const response = await axios.get("http://localhost:3000/admin/topics/suggested");
      setSuggestedTopics(response.data); // setSuggestedTopics 함수가 여기서 사용됩니다.
    } catch (error) {
      console.error("Error fetching suggested topics:", error);
    }
  };

  // 페이지가 처음 로드될 때 fetchSuggestedTopics 함수를 한 번 실행합니다.
  useEffect(() => {
    fetchSuggestedTopics();
  }, []);

  // '수정' 버튼을 눌렀을 때 호출되는 함수입니다.
  const handleEditClick = (topic: Topic) => {
    setEditingTopic({
      id: topic.id,
      displayName: topic.core_keyword,
      searchKeywords: `${topic.core_keyword}, ${topic.sub_description}`,
    });
  };

  // '취소' 버튼을 눌렀을 때 호출되는 함수입니다.
  const handleCancelEdit = () => {
    setEditingTopic(null);
  };

  // '저장 및 발행' 버튼을 눌렀을 때 호출되는 함수입니다.
  const handlePublish = async (topicId: number) => {
    // topicId 파라미터를 받습니다.
    if (!editingTopic) return;

    try {
      await axios.patch(`http://localhost:3000/admin/topics/${topicId}/publish`, {
        displayName: editingTopic.displayName,
        searchKeywords: editingTopic.searchKeywords,
      });
      alert(`토픽 "${editingTopic.displayName}" 발행 성공!`);
      setEditingTopic(null);
      fetchSuggestedTopics();
    } catch (error) {
      console.error("Error publishing topic:", error);
      alert("발행 실패");
    }
  };

  // '거절' 버튼을 눌렀을 때 호출되는 함수입니다.
  const handleReject = async (topicId: number) => {
    // topicId 파라미터를 받습니다.
    try {
      await axios.patch(`http://localhost:3000/admin/topics/${topicId}/reject`);
      alert(`토픽 #${topicId} 거절 처리 완료.`);
      fetchSuggestedTopics();
    } catch (error) {
      console.error("Error rejecting topic:", error);
      alert("거절 실패");
    }
  };

  return (
    <div className="admin-container">
      <Link to="/" className="back-link">
        ← 홈으로 돌아가기
      </Link>
      <h1>관리자 페이지: 토픽 승인</h1>
      <div className="topic-approval-list">
        {suggestedTopics.map(
          (
            topic // 'topic' 변수가 여기서 선언됩니다.
          ) => (
            <div key={topic.id} className="topic-approval-item">
              {editingTopic && editingTopic.id === topic.id ? (
                // --- 수정 모드 UI ---
                <div className="edit-mode-container">
                  <div className="ai-suggestion">
                    <strong>AI 추천 키워드 (참고용):</strong>
                    <br />
                    {topic.core_keyword} / {topic.sub_description}
                  </div>
                  <div className="edit-field">
                    <label>대표 토픽명 (사용자에게 표시)</label>
                    <input
                      type="text"
                      value={editingTopic.displayName}
                      onChange={(e) => setEditingTopic({ ...editingTopic, displayName: e.target.value })}
                    />
                  </div>
                  <div className="edit-field">
                    <label>기사 검색용 키워드 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={editingTopic.searchKeywords}
                      onChange={(e) => setEditingTopic({ ...editingTopic, searchKeywords: e.target.value })}
                    />
                  </div>
                  <div className="topic-actions">
                    <button onClick={() => handlePublish(topic.id)} className="save-btn">
                      저장 및 발행
                    </button>
                    <button onClick={handleCancelEdit} className="cancel-btn">
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // --- 일반 모드 UI ---
                <>
                  <Link to={`/admin/topics/${topic.id}`} className="topic-info-link">
                    <div className="topic-info">
                      <h3>{topic.core_keyword}</h3>
                      <p>{topic.sub_description}</p>
                    </div>
                  </Link>
                  <div className="topic-actions">
                    <button onClick={() => handleEditClick(topic)} className="edit-btn">
                      수정 및 발행
                    </button>
                    <button onClick={() => handleReject(topic.id)} className="reject-btn">
                      거절
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminPage;
