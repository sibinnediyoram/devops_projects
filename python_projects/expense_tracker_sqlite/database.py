from expense import Expense
import sqlite3
from constants import DB_FILE
def get_connection():
    conn = sqlite3.connect(DB_FILE)
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_date TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT
        )
    ''')
    conn.commit()
    conn.close()

def insert_expense(expense):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO expenses (expense_date, category, amount, description)
        VALUES (?, ?, ?, ?)
    ''', expense.to_db_tuple())
    conn.commit()
    conn.close()

def fetch_all_expenses():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT expense_date, category, amount, description FROM expenses')
    rows = cursor.fetchall()
    conn.close()
    return [Expense(*row) for row in rows]

def fetch_monthly_total(month):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT SUM(amount) FROM expenses
        WHERE expense_date LIKE ?
    ''', (f'{month}%',))
    total = cursor.fetchone()[0]
    conn.close()
    return total if total is not None else 0.0

def update_expense(expense_id, updated_expense):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE expenses
        SET expense_date = ?, category = ?, amount = ?, description = ?
        WHERE id = ?
    ''', (*updated_expense.to_db_tuple(), expense_id))
    conn.commit()
    conn.close()

def delete_expense(expense_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
    conn.commit()
    conn.close()

