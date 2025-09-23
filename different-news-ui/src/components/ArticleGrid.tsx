// src/components/ArticleGrid.tsx

// Article 타입 정의 (url은 Card에서만 필요하므로 여기선 생략)
interface Article {
  id: number;
  source: string;
  title: string;
  url: string;
}

interface ArticleGridProps {
  title: string;
  articles: Article[];
}

const ArticleGrid = ({ title, articles }: ArticleGridProps) => {
  if (articles.length === 0) {
    return (
      <div className="article-column">
        <h2>{title}</h2>
        <p>관련 기사가 없습니다.</p>
      </div>
    );
  }

  // 기사 목록에서 레이아웃에 사용할 기사들을 분리합니다.
  const mainArticle = articles[0]; // 썸네일 아래에 위치할 기사
  const subArticles = articles.slice(1, 4); // 오른쪽에 위치할 기사 3개

  return (
    <div className="article-column">
      <h2>{title}</h2>
      <div className="super-card">
        {/* 1. 대표 썸네일 */}
        <div className="super-card-thumbnail">[ 대표 썸네일 ]</div>

        {/* 2. 썸네일 아래 기사 */}
        {mainArticle && (
          <a href={mainArticle.url} target="_blank" rel="noopener noreferrer" className="main-article-link">
            <h3>{mainArticle.title}</h3>
            <span>{mainArticle.source}</span>
          </a>
        )}

        {/* 3. 오른쪽 기사 목록 */}
        <div className="sub-article-list">
          {subArticles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sub-article-link"
            >
              <h4>{article.title}</h4>
              <span>{article.source}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArticleGrid;
