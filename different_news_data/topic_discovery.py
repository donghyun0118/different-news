import json
import re
import time
from collections import Counter
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import feedparser
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
from konlpy.tag import Okt

# --- 설정 ---
MODEL_NAME = "intfloat/multilingual-e5-base"
MIN_CLUSTER_SIZE = 10
TOPIC_WORD_BLACKLIST = { "정부", "대통령실", "민주당", "국민의힘", "국회", "여야", "의혹",
                         "논란", "관계자", "발표", "사진", "속보", "단독", "오늘", "내일", 
                         "관련", "이슈", "사실", "생각", "한국", "우리", "중앙", "일보", 
                         "뉴스", "기사", "언론", "보도", "기자", "취재", "전문가", "전문가들",
                         "하이라이트", "정치", "경제", "사회", "문화"}
# --- RSS 피드 정보 ---
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
# ... (pull_feeds, get_model, embed_texts, get_okt, extract_topic_keyword_and_desc 함수는 변경 없음)
def pull_feeds() -> List[Article]:
    all_articles: List[Article] = []
    unique_titles = set()
    for f in tqdm(FEEDS, desc="📰 RSS 피드 수집 중"):
        feed = feedparser.parse(f.url)
        for entry in feed.entries:
            title = (getattr(entry, "title", "") or "").strip()
            if not title or title in unique_titles: continue
            unique_titles.add(title)
            link = (getattr(entry, "link", None) or "").strip()
            published = getattr(entry, "published", None) or getattr(entry, "updated", None)
            desc = re.sub(r"<[^>]+>", " ", getattr(entry, "summary", "")).strip()
            all_articles.append(Article(source=f.source, source_domain=f.source_domain, side=f.side, title=title, url=link, published_at=published, section=f.section, rss_desc=desc))
        time.sleep(0.05)
    return all_articles
_MODEL = None
def get_model():
    global _MODEL
    if _MODEL is None: _MODEL = SentenceTransformer(MODEL_NAME)
    return _MODEL
def embed_texts(texts: List[str]) -> np.ndarray:
    model = get_model()
    prefixed_texts = [f"passage: {text[:512]}" for text in texts]
    vecs = model.encode(prefixed_texts, batch_size=128, show_progress_bar=True, normalize_embeddings=True)
    return np.asarray(vecs, dtype=np.float32)
_OKT = None
def get_okt():
    global _OKT
    if _OKT is None: _OKT = Okt()
    return _OKT
def extract_topic_keyword_and_desc(titles: List[str]) -> Optional[Tuple[str, str]]:
    okt = get_okt()
    full_text = " ".join(titles)
    nouns = okt.nouns(full_text)
    filtered_nouns = [n for n in nouns if len(n) > 1 and n.lower() not in TOPIC_WORD_BLACKLIST]
    if not filtered_nouns: return None
    counts = Counter(filtered_nouns)
    most_common = counts.most_common(4)
    if not most_common: return None
    core_keyword = most_common[0][0]
    sub_desc_keywords = [kw for kw, count in most_common[1:4]]
    sub_description = ", ".join(sub_desc_keywords)
    return core_keyword, sub_description
# ...

def main():
    # 1. RSS 수집 및 가중치 적용 임베딩
    articles = pull_feeds()
    if len(articles) < 50:
        print("❌ 수집된 기사가 너무 적어 분석을 진행할 수 없습니다.")
        return

    titles = [a.title for a in articles]
    descs  = [a.rss_desc or "" for a in articles]
    title_embeds = embed_texts(titles)
    desc_embeds  = embed_texts(descs)
    article_embeds = 0.7 * title_embeds + 0.3 * desc_embeds
    article_embeds = article_embeds / (np.linalg.norm(article_embeds, axis=1, keepdims=True) + 1e-8)

    # 2. 군집 생성
    n_clusters = 25
    kmeans = KMeans(n_clusters=n_clusters, n_init='auto', random_state=42)
    labels = kmeans.fit_predict(article_embeds)
    clusters: Dict[int, List[int]] = {i: [] for i in range(n_clusters)}
    for i, label in enumerate(labels):
        clusters[label].append(i)

    # 3. [수정] 후보 생성 및 점수 계산을 하나의 반복문으로 통합
    topic_candidates = []
    centroids_map = {i: np.mean(article_embeds[idxs], axis=0) for i, idxs in clusters.items() if len(idxs) > 0}

    for i, idxs in tqdm(clusters.items(), desc="🔍 토픽 후보 생성 및 점수 계산 중"):
        if len(idxs) < MIN_CLUSTER_SIZE:
            continue

        group_articles = [articles[i] for i in idxs]
        keyword_result = extract_topic_keyword_and_desc([a.title for a in group_articles])
        if not keyword_result:
            continue

        # 품질 점수 계산
        centroid = centroids_map[i]
        cohesion = np.mean(cosine_similarity(article_embeds[idxs], centroid.reshape(1, -1)))
        
        side_counts = Counter(a.side for a in group_articles)
        left = side_counts.get("LEFT", 0)
        right = side_counts.get("RIGHT", 0)
        balance = min(left, right) / max(left, right) if left > 0 and right > 0 else 0.0
        
        coverage = min(1.0, (len(group_articles) / 50.0) * 0.7 + (len({a.source_domain for a in group_articles}) / 6.0) * 0.3)
        
        score = (0.40 * cohesion) + (0.30 * balance) + (0.30 * coverage)

        topic_candidates.append({
            "core_keyword": keyword_result[0],
            "sub_description": keyword_result[1],
            "_score": score,
            "stats": {
                "total_articles": len(group_articles),
                "left_articles": left,
                "right_articles": right,
                "source_count": len({a.source_domain for a in group_articles}),
            },
            "sample_titles": [a.title for a in group_articles[:5]],
        })

    # 4. 점수 내림차순 정렬 후 상위 10개 선택
    topic_candidates.sort(key=lambda t: t["_score"], reverse=True)
    top_ten_candidates = topic_candidates[:10]

    # 5. 최종 결과물 정리
    final_results = []
    for cand in top_ten_candidates:
        # DB에 넣을 깔끔한 데이터만 남깁니다.
        final_results.append({
            "core_keyword": cand["core_keyword"],
            "sub_description": cand["sub_description"],
            "stats": cand["stats"],
            "sample_titles": cand["sample_titles"],
        })

    print(f"\n✅ 점수 기반 상위 {len(final_results)}개 토픽을 선발했습니다.")
    with open("suggested_topics.json", "w", encoding="utf-8") as f:
        json.dump(final_results, f, ensure_ascii=False, indent=2)
    print("\n🎉 모든 작업 완료! 'suggested_topics.json' 파일이 생성되었습니다.")

if __name__ == '__main__':
    main()