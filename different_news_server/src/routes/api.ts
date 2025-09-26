import { Request, Response, Router } from "express";
import pool from "../config/db";

const router = Router();

// GET /api/topics - 전체 토픽 목록 조회
router.get("/topics", async (req: Request, res: Response) => {
  try {
    // [수정] core_keyword 대신 display_name을 선택합니다.
    const [rows] = await pool.query(
      "SELECT id, display_name, summary, published_at FROM topics WHERE status = 'published' ORDER BY published_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/topics/:topicId - 특정 토픽 상세 정보 조회
router.get("/topics/:topicId", async (req: Request, res: Response) => {
  const { topicId } = req.params;
  try {
    // [수정] 필요한 컬럼(display_name, summary 등)만 명시적으로 선택합니다.
    const [topicRows]: any = await pool.query(
      "SELECT id, display_name, summary, published_at FROM topics WHERE id = ? AND status = 'published'",
      [topicId]
    );
    const [articleRows] = await pool.query(
      "SELECT id, source, source_domain, side, title, url, published_at, is_featured, thumbnail_url FROM articles WHERE topic_id = ? AND status = 'published' ORDER BY `display_order` ASC",
      [topicId]
    );

    if (topicRows.length === 0) {
      return res.status(404).json({ message: "Topic not found" });
    }
    const responseData = {
      topic: topicRows[0],
      articles: articleRows,
    };
    res.json(responseData);
  } catch (error) {
    console.error(`Error fetching topic ${topicId}:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
