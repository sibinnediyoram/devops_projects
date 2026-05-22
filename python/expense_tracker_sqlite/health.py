from database import get_connection

def check_db_health():
    try:
        conn = get_connection()
        conn.execute('SELECT 1')  # Simple query to check connection
        conn.close()
        return {
            "database": "healthy"
        }
    except Exception as e:
        return {
            "database": "unhealthy",
            "error": str(e)
            }