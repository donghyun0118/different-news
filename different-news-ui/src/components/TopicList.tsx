// src/components/TopicList.tsx

import axios from "axios";
import { useEffect, useState } from "react";
import TopicCard from "./TopicCard"; // 방금 만든 TopicCard를 불러옵니다.

// Topic 데이터의 타입을 정의합니다.
interface Topic {
  id: number;
  display_name: string;
}

const TopicList = () => {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/topics");
        setTopics(response.data);
      } catch (error) {
        console.error("Error fetching topics:", error);
      }
    };
    fetchTopics();
  }, []);

  return (
    <main className="topic-list">
      {topics.map((topic) => (
        // 각 topic 데이터를 TopicCard 컴포넌트에 props로 전달합니다.
        <TopicCard key={topic.id} topic={topic} />
      ))}
    </main>
  );
};

export default TopicList;
