import { exec } from "child_process";
import { Request, Response, Router } from "express";
import path from "path";
import pool from "../config/db";

const router = Router();

// Admin API 상태 확인
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// [추가] '제안됨' 상태의 토픽 후보 목록 조회 API
router.get("/topics/suggested", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT * FROM topics WHERE status = 'suggested' ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching suggested topics:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 특정 토픽의 상태를 'published'로 변경 (발행)
router.patch("/topics/:topicId/publish", async (req: Request, res: Response) => {
  const { topicId } = req.params;
  const { displayName, searchKeywords } = req.body;

  if (!displayName || !searchKeywords) {
    return res.status(400).json({ message: "Display name and search keywords are required." });
  }

  try {
    // 1. DB에 토픽 상태를 'published'로 업데이트 (기존과 동일)
    const [result]: any = await pool.query(
      "UPDATE topics SET status = 'published', collection_status = 'pending', display_name = ?, search_keywords = ?, published_at = NOW() WHERE id = ? AND status = 'suggested'",
      [displayName, searchKeywords, topicId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Topic not found or already handled." });
    }

    // 2. [신규] Python 스크립트를 즉시 실행 (백그라운드에서)
    //    Node.js 서버와 Python 스크립트가 있는 폴더 경로를 기준으로 경로 설정
    const pythonScriptPath = path.join(__dirname, "../../../different_news_data/article_collector.py");
    const command = `python ${pythonScriptPath} ${topicId}`;

    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing article_collector.py: ${error}`);
        return;
      }
      console.log(`article_collector.py stdout: ${stdout}`);
      console.error(`article_collector.py stderr: ${stderr}`);
    });

    // 3. 관리자에게는 즉시 성공 응답을 보냄
    res.json({ message: `Topic ${topicId} has been published. Article collection started in the background.` });
  } catch (error) {
    console.error("Error publishing topic:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 특정 토픽의 상태를 'rejected'로 변경 (거절)
router.patch("/topics/:topicId/reject", async (req: Request, res: Response) => {
  const { topicId } = req.params;
  try {
    const [result]: any = await pool.query(
      "UPDATE topics SET status = 'rejected' WHERE id = ? AND status = 'suggested'",
      [topicId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Topic not found or already handled." });
    }

    res.json({ message: `Topic ${topicId} has been rejected.` });
  } catch (error) {
    console.error("Error rejecting topic:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 특정 토픽에 속한 '제안된' 기사 목록 조회
router.get("/topics/:topicId/articles", async (req: Request, res: Response) => {
  const { topicId } = req.params;
  try {
    const [articles] = await pool.query("SELECT * FROM articles WHERE topic_id = ? ORDER BY side, similarity DESC", [
      topicId,
    ]);
    res.json(articles);
  } catch (error) {
    console.error("Error fetching suggested articles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 특정 기사의 상태를 'published'로 변경 (발행)
router.patch("/articles/:articleId/publish", async (req: Request, res: Response) => {
  const { articleId } = req.params;
  try {
    const [result]: any = await pool.query("UPDATE articles SET status = 'published' WHERE id = ?", [articleId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Article not found." });
    }
    res.json({ message: `Article ${articleId} has been published.` });
  } catch (error) {
    console.error("Error publishing article:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
