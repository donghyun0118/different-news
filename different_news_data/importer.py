import json
import mysql.connector
from mysql.connector import errorcode

# --- DB 접속 정보 ---
DB_CONFIG = {
    'user': 'root',
    'password': '3302', # 본인의 DB 비밀번호로 변경
    'host': '127.0.0.1',
    'database': 'different_news'
}

def insert_topics_from_json(file_path='suggested_topics.json'):
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor()
        print("✅ DB 연결 성공.")

        with open(file_path, 'r', encoding='utf-8') as f:
            topic_candidates = json.load(f)
        print(f"📄 '{file_path}'에서 {len(topic_candidates)}개의 토픽 후보를 찾았습니다.")

        update_count = 0
        insert_count = 0
        for topic in topic_candidates:
            # [수정] 중복 키가 있으면, sub_description과 status, created_at을 업데이트합니다.
            query = (
                "INSERT INTO topics (core_keyword, sub_description, status, created_at) "
                "VALUES (%s, %s, 'suggested', NOW()) "
                "ON DUPLICATE KEY UPDATE "
                "  sub_description = VALUES(sub_description), "
                "  status = 'suggested', "
                "  created_at = NOW()"
            )
            data = (
                topic['core_keyword'],
                topic['sub_description'],
            )
            cursor.execute(query, data)
            
            # cursor.rowcount: INSERT는 1, UPDATE는 2, 아무 일 없으면 0을 반환합니다.
            if cursor.rowcount == 1:
                insert_count += 1
            elif cursor.rowcount == 2:
                update_count += 1

        cnx.commit()
        cursor.close()
        cnx.close()
        
        print(f"✨ 작업 완료. 신규 토픽 {insert_count}개 추가, 기존 토픽 {update_count}개 업데이트 완료.")

    except mysql.connector.Error as err:
        print(f"❌ 데이터베이스 오류: {err}")
    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: '{file_path}'. 먼저 topic_discovery.py를 실행하세요.")
    except Exception as e:
        print(f"❌ 예상치 못한 오류 발생: {e}")

if __name__ == '__main__':
    insert_topics_from_json()