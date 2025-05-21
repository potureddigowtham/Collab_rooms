import sqlite3
from typing import Optional, List
import json

class Database:
    def __init__(self, db_path: str = "rooms.db"):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Create rooms table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rooms (
                    room_name TEXT PRIMARY KEY,
                    content TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            # Create admin_content table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS admin_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()

    def create_room(self, room_name: str) -> bool:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO rooms (room_name, content) VALUES (?, ?)",
                    (room_name, "")
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            return False

    def get_room(self, room_name: str) -> Optional[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM rooms WHERE room_name = ?", (room_name,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def get_all_rooms(self) -> List[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT room_name, created_at FROM rooms ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def delete_room(self, room_name: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM rooms WHERE room_name = ?", (room_name,))
            conn.commit()
            return cursor.rowcount > 0

    def update_room_content(self, room_name: str, content: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE rooms 
                SET content = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE room_name = ?
                """,
                (content, room_name)
            )
            conn.commit()
            return cursor.rowcount > 0

    def get_room_content(self, room_name: str) -> Optional[str]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT content FROM rooms WHERE room_name = ?", (room_name,))
            row = cursor.fetchone()
            return row['content'] if row else None

    def add_admin_content(self, title: str, content: str) -> bool:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO admin_content (title, content) VALUES (?, ?)",
                    (title, content)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            return False

    def get_admin_content(self, content_id: int = None) -> List[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if content_id is not None:
                cursor.execute("SELECT * FROM admin_content WHERE id = ?", (content_id,))
                row = cursor.fetchone()
                return dict(row) if row else None
            else:
                cursor.execute("SELECT * FROM admin_content ORDER BY created_at DESC")
                return [dict(row) for row in cursor.fetchall()]

    def update_admin_content(self, content_id: int, title: str, content: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE admin_content 
                SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
                """,
                (title, content, content_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    def delete_admin_content(self, content_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM admin_content WHERE id = ?", (content_id,))
            conn.commit()
            return cursor.rowcount > 0 