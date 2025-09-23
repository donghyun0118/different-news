import json
import re
import time
from dataclasses import dataclass
from typing import List, Dict, Optional
import feedparser
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
import mysql.connector
import sys # sys 모듈 추가

# --- 설정 ---
MODEL_NAME = "intfloat/multilingual-e5-base"
TARGET_ARTICLES_PER_SIDE = 10
SIMILARITY_THRESHOLD = 0.60
DB_CONFIG = {
    'user': 'root',
    'password': '3302', # 본인의 DB 비밀번호로 변경
    'host': '127.0.0.1',
    'database': 'different_news'
}

# =========================
# 📰 RSS 피드 정보 및 데이터 구조 (1단계 스크립트와 동일)
# =========================
Side = str
@dataclass
class Feed:
    source: str; source_domain: str; side: Side; url: str; section: str

FEEDS: List[Feed] = [
    Feed("경향신문", "khan.co.kr", "LEFT", "https://www.khan.co.kr/rss/rssdata/politic_news.xml", "정치"),
    Feed("경향신문", "khan.co.kr", "LEFT", "https://www.khan.co.kr/rss/rssdata/economy_news.xml", "경제"),
    Feed("경향신문", "khan.co.kr", "LEFT", "https://www.khan.co.kr/rss/rssdata/society_news.xml", "사회"),
    Feed("경향신문", "khan.co.kr", "LEFT", "https://www.khan.co.kr/rss/rssdata/culture_news.xml", "문화"),
    Feed("한겨레", "hani.co.kr", "LEFT", "https://www.hani.co.kr/rss/politics/", "정치"),
    Feed("한겨레", "hani.co.kr", "LEFT", "https://www.hani.co.kr/rss/economy/", "경제"),
    Feed("한겨레", "hani.co.kr", "LEFT", "https://www.hani.co.kr/rss/society/", "사회"),
    Feed("한겨레", "hani.co.kr", "LEFT", "https://www.hani.co.kr/rss/culture/", "문화"),
    Feed("오마이뉴스", "ohmynews.com", "LEFT", "http://rss.ohmynews.com/rss/politics.xml", "정치"),
    Feed("오마이뉴스", "ohmynews.com", "LEFT", "http://rss.ohmynews.com/rss/economy.xml", "경제"),
    Feed("오마이뉴스", "ohmynews.com", "LEFT", "http://rss.ohmynews.com/rss/society.xml", "사회"),
    Feed("오마이뉴스", "ohmynews.com", "LEFT", "http://rss.ohmynews.com/rss/culture.xml", "문화"),
    Feed("조선일보", "chosun.com", "RIGHT", "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", "정치"),
    Feed("조선일보", "chosun.com", "RIGHT", "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", "경제"),
    Feed("조선일보", "chosun.com", "RIGHT", "https://www.chosun.com/arc/outboundfeeds/rss/category/society/?outputType=xml", "사회"),
    Feed("조선일보", "chosun.com", "RIGHT", "https://www.chosun.com/arc/outboundfeeds/rss/category/culture/?outputType=xml", "문화"),
    Feed("중앙일보", "joongang.co.kr", "RIGHT", "https://news.google.com/rss/search?q=site:joongang.co.kr%20정치&hl=ko&gl=KR&ceid=KR%3Ako", "정치"),
    Feed("중앙일보", "joongang.co.kr", "RIGHT", "https://news.google.com/rss/search?q=site:joongang.co.kr%20경제&hl=ko&gl=KR&ceid=KR%3Ako", "경제"),
    Feed("중앙일보", "joongang.co.kr", "RIGHT", "https://news.google.com/rss/search?q=site:joongang.co.kr%20사회&hl=ko&gl=KR&ceid=KR%3Ako", "사회"),
    Feed("중앙일보", "joongang.co.kr", "RIGHT", "https://news.google.com/rss/search?q=site:joongang.co.kr%20문화&hl=ko&gl=KR&ceid=KR%3Ako", "문화"),
    Feed("동아일보", "donga.com", "RIGHT", "https://rss.donga.com/politics.xml", "정치"),
    Feed("동아일보", "donga.com", "RIGHT", "https://rss.donga.com/economy.xml", "경제"),
    Feed("동아일보", "donga.com", "RIGHT", "https://rss.donga.com/national.xml", "사회"),
    Feed("동아일보", "donga.com", "RIGHT", "https://rss.donga.com/culture.xml", "문화"),
]

@dataclass
class Article:
    source: str; source_domain: str; side: Side; title: str; url: str
    published_at: Optional[str]; section: str; rss_desc: Optional[str] = None
    similarity: float = 0.0

def pull_feeds() -> List[Article]:
    all_articles: List[Article] = []
    # ... (1단계 스크립트와 동일) ...
    unique_titles = set()
    for f in tqdm(FEEDS, desc=" 최신 기사 수집 중"):
        feed = feedparser.parse(f.url)
        for entry in feed.entries:
            title = (getattr(entry, "title", "") or "").strip()
            if not title or title in unique_titles: continue
            unique_titles.add(title)
            link = (getattr(entry, "link", None) or "").strip()
            published = getattr(entry, "published", None) or getattr(entry, "updated", None)
            desc = re.sub(r"<[^>]+>", " ", getattr(entry, "summary", "")).strip()
            all_articles.append(Article(
                source=f.source, source_domain=f.source_domain, side=f.side,
                title=title, url=link, published_at=published, section=f.section, rss_desc=desc
            ))
        time.sleep(0.05)
    return all_articles

_MODEL = None
def get_model():
    global _MODEL
    if _MODEL is None: _MODEL = SentenceTransformer(MODEL_NAME)
    return _MODEL

def embed_texts(texts: List[str], is_query: bool = False) -> np.ndarray:
    model = get_model()
    prefix = "query: " if is_query else "passage: "
    prefixed_texts = [f"{prefix}{text[:512]}" for text in texts]
    vecs = model.encode(prefixed_texts, batch_size=128, show_progress_bar=True, normalize_embeddings=True)
    return np.asarray(vecs, dtype=np.float32)

# =========================
# 🏁 메인 실행 함수
# =========================
def main():
    """DB에서 발행된 토픽의 'search_keywords'를 이용해 기사를 수집하고 다시 DB에 저장합니다."""
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor(dictionary=True)
        print(" DB 연결 성공.")

        cursor.execute("SELECT id, display_name, search_keywords FROM topics WHERE status = 'published'")
        published_topics = cursor.fetchall()
        if not published_topics:
            print(" 발행된 토픽이 없습니다. 기사 수집을 건너뜁니다.")
            return

        print(f"▶ {len(published_topics)}개의 발행된 토픽에 대한 기사 수집 시작...")
        articles = pull_feeds()
        if not articles: print(" 수집된 기사가 없습니다."); return
        article_embeds = embed_texts([a.title for a in articles])

        for topic in published_topics:
            topic_id = topic['id']
            display_name = topic['display_name']
            print(f"\n--- 토픽: '{display_name}' (ID #{topic_id}) 처리 중 ---")
            
            # [수정] search_keywords가 비어있는(None) 경우를 확인하는 로직 추가
            search_keywords_str = topic.get('search_keywords')
            if not search_keywords_str:
                print(f"  -  토픽 ID #{topic_id}에 검색 키워드가 없어 건너뜁니다.")
                continue # 다음 토픽으로 넘어감

            search_keywords = [kw.strip() for kw in search_keywords_str.split(',') if kw.strip()]
            if not search_keywords:
                print(f"  -  토픽 ID #{topic_id}에 유효한 검색 키워드가 없어 건너뜁니다.")
                continue

            keyword_embeds = embed_texts(search_keywords, is_query=True)
            topic_vector = np.mean(keyword_embeds, axis=0)

            # ... (이하 기사 수집 및 DB 저장 로직은 이전과 동일)
            similarities = cosine_similarity(article_embeds, topic_vector.reshape(1, -1)).flatten()
            relevant_articles = []
            for i, article in enumerate(articles):
                if similarities[i] >= SIMILARITY_THRESHOLD:
                    article.similarity = float(similarities[i])
                    relevant_articles.append(article)
            
            left_articles = sorted([a for a in relevant_articles if a.side == 'LEFT'], key=lambda a: a.similarity, reverse=True)[:TARGET_ARTICLES_PER_SIDE]
            right_articles = sorted([a for a in relevant_articles if a.side == 'RIGHT'], key=lambda a: a.similarity, reverse=True)[:TARGET_ARTICLES_PER_SIDE]
            final_articles = left_articles + right_articles

            print(f"  - 찾은 기사: 좌 {len(left_articles)}개, 우 {len(right_articles)}개. DB에 저장합니다...")
            cursor.execute("DELETE FROM articles WHERE topic_id = %s", (topic_id,))
            insert_query = "INSERT INTO articles (topic_id, source, side, title, url, published_at, similarity) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            for article in final_articles:
                cursor.execute(insert_query, (topic_id, article.source, article.side, article.title, article.url, article.published_at, article.similarity))
            cnx.commit()
            print(f"  ->  토픽 ID #{topic_id} 기사 저장 완료!")

    except mysql.connector.Error as err:
        print(f" 데이터베이스 오류: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()
            print("\n DB 연결 종료.")

if __name__ == '__main__':
    main()