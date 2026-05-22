from database import get_connection

def get_metrics():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM expenses')
        total_expenses = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(amount) FROM expenses')
        total_amount = cursor.fetchone()[0] or 0.0
        
        conn.close()
        
        return {
            "total_expenses": total_expenses,
            "total_amount": total_amount if total_amount else 0.0
        }
    except Exception as e:
        return {
            "error": str(e)
        }