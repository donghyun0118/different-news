// src/components/TopicCard.tsx
import { Link } from "react-router-dom"; // Link 컴포넌트를 불러옵니다.

interface Topic {
  id: number;
  display_name: string;
}

interface TopicCardProps {
  topic: Topic;
}

const TopicCard = ({ topic }: TopicCardProps) => {
  return (
    // div 전체를 Link 컴포넌트로 감싸줍니다.
    <Link to={`/topics/${topic.id}`} className="topic-card-link">
      <div className="topic-card">
        <h2>{topic.display_name}</h2>
      </div>
    </Link>
  );
};

export default TopicCard;
